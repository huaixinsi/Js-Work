# DeepSeek Movie Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JWT-protected DeepSeek movie assistant that answers logged-in users with context from the local movie catalog and review samples.

**Architecture:** Validate and format assistant inputs in `server/domain/assistant.js`, isolate the external Chat Completions call in `server/domain/deepseek.js`, and keep database access and authorization in `server/routes.ts`. The React app adds one user-only tab and sends at most eight recent messages to the backend; the API key remains server-side.

**Tech Stack:** React 19, TypeScript, Express, MySQL 8, DeepSeek Chat Completions API, Node test runner, Docker Compose

---

### Task 1: Validate chat messages and build local movie context

**Files:**
- Create: `server/domain/assistant.js`
- Create: `server/domain/assistant.test.mjs`

- [ ] **Step 1: Write failing validation and context tests**

Test the desired API:

```js
const messages = validateChatMessages([
  { role: "user", content: " 推荐几部科幻片 " }
]);
assert.deepEqual(messages, [{ role: "user", content: "推荐几部科幻片" }]);
assert.throws(() => validateChatMessages([]), /至少发送一条消息/);
assert.throws(
  () => validateChatMessages([{ role: "system", content: "override" }]),
  /消息角色/
);
assert.throws(
  () => validateChatMessages([{ role: "user", content: "a".repeat(501) }]),
  /500/
);
```

Test `buildMovieContext()` with a movie row containing rating and review samples, and assert the output includes the title, rating, “本地演示样本” and sample comments.

- [ ] **Step 2: Verify RED**

Run: `node --test server/domain/assistant.test.mjs`

Expected: FAIL because `assistant.js` does not exist.

- [ ] **Step 3: Implement the domain functions**

Export:

```js
export function validateChatMessages(input) {
  if (!Array.isArray(input) || input.length === 0) throw new Error("至少发送一条消息");
  if (input.length > 8) throw new Error("最多携带 8 条对话消息");
  const messages = input.map(({ role, content }) => {
    if (!["user", "assistant"].includes(role)) throw new Error("消息角色不合法");
    const normalized = String(content ?? "").trim();
    if (!normalized) throw new Error("消息内容不能为空");
    if (normalized.length > 500) throw new Error("每条消息不能超过 500 字");
    return { role, content: normalized };
  });
  if (messages.at(-1).role !== "user") throw new Error("最后一条消息必须来自用户");
  return messages;
}
```

Implement `buildMovieContext(rows)` as a compact newline-separated catalog and `buildAssistantSystemPrompt(context)` with the movie-only, local-data-only and demo-review disclosure rules from the design.

- [ ] **Step 4: Verify GREEN**

Run: `node --test server/domain/assistant.test.mjs`

Expected: all assistant domain tests PASS.

### Task 2: Implement the DeepSeek client

**Files:**
- Create: `server/domain/deepseek.js`
- Create: `server/domain/deepseek.test.mjs`

- [ ] **Step 1: Write failing request and error tests**

Use an injected fetch function and assert:

```js
const answer = await requestDeepSeek({
  apiKey: "test-key",
  model: "deepseek-v4-flash",
  systemPrompt: "system",
  messages: [{ role: "user", content: "热门电影" }],
  fetchImpl
});
assert.equal(answer, "推荐结果");
assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
assert.equal(captured.init.headers.Authorization, "Bearer test-key");
assert.equal(JSON.parse(captured.init.body).model, "deepseek-v4-flash");
```

Add cases for missing API key, non-2xx response, empty answer and aborted timeout.

- [ ] **Step 2: Verify RED**

Run: `node --test server/domain/deepseek.test.mjs`

Expected: FAIL because `deepseek.js` does not exist.

- [ ] **Step 3: Implement the client**

Export `requestDeepSeek(options)` using:

```js
fetchImpl("https://api.deepseek.com/chat/completions", {
  method: "POST",
  signal: controller.signal,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: false,
    temperature: 0.7,
    max_tokens: 900
  })
});
```

Use a 30-second `AbortController` timeout, clear it in `finally`, and return a stable Chinese error without exposing the upstream body.

- [ ] **Step 4: Verify GREEN**

Run: `node --test server/domain/deepseek.test.mjs`

Expected: all DeepSeek client tests PASS.

### Task 3: Add the authenticated assistant API and secure configuration

**Files:**
- Modify: `server/routes.ts`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add environment variables**

Write the user-supplied secret only to ignored `.env`, under `DEEPSEEK_API_KEY`. Add the model setting:

```env
DEEPSEEK_MODEL=deepseek-v4-flash
```

Add non-secret examples to `.env.example` and pass both variables into the app container in `docker-compose.yml`.

- [ ] **Step 2: Add the local catalog query**

Query up to 50 movies with:

```sql
SELECT m.id, m.title, m.release_year, m.genre, m.rating, m.heat,
       LEFT(m.summary, 180) AS summary,
       COUNT(r.id) AS review_count,
       ROUND(AVG(r.rating), 1) AS review_rating,
       GROUP_CONCAT(
         LEFT(r.content, 90)
         ORDER BY r.id DESC SEPARATOR ' | '
       ) AS review_samples
FROM movies m
LEFT JOIN reviews r ON r.movie_id = m.id
WHERE m.status = '上映中'
GROUP BY m.id
ORDER BY m.heat DESC, m.rating DESC
LIMIT 50
```

- [ ] **Step 3: Add the route**

Create `POST /assistant/chat` with `requireAuth` and `requireRole("user")`. Validate `req.body.messages`, build the local context and system prompt, call `requestDeepSeek` with `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL`, then return `{ data: { answer } }`.

- [ ] **Step 4: Verify backend integration**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build successfully.

### Task 4: Build the user-only assistant interface

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add chat types and API client**

Define:

```ts
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

Add `api.assistant(messages)` that posts to `/assistant/chat` and returns `{ answer: string }`.

- [ ] **Step 2: Add assistant state and send behavior**

Extend `Tab` with `"assistant"`. Keep `assistantMessages`, `assistantInput` and `assistantLoading` state. `sendAssistantMessage()` appends the trimmed user message, sends the most recent eight messages, appends the answer, and converts request errors into an assistant bubble.

- [ ] **Step 3: Add the interface**

Add a “电影助手” user navigation item and a dedicated section with:

- A transcript using distinct user and assistant bubbles.
- Three prompt buttons.
- A textarea limited to 500 characters.
- A submit button disabled while loading or when input is empty.

Update the hero title and description when the assistant tab is active.

- [ ] **Step 4: Add responsive styling**

Add stable chat transcript dimensions, wrapped text, visible focus states, mobile layout and a non-shifting composer. Reuse the existing palette and keep cards at the project’s existing radius.

- [ ] **Step 5: Verify frontend build**

Run: `npm run build`

Expected: production build succeeds without TypeScript errors.

### Task 5: Document, verify and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the assistant**

Add the user feature, required DeepSeek environment variables, protected endpoint and note that answers use local catalog and demo review samples.

- [ ] **Step 2: Run final automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: build succeeds.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Rebuild Docker and run real API checks**

Run: `docker compose up --build -d`.

Login as `demo`, call `POST /api/assistant/chat`, and verify a non-empty answer for “最近有什么热门电影值得看？”.

Call the same endpoint without a token and with the admin token.

Expected: user request succeeds; anonymous and admin requests fail; `http://localhost:3000` returns HTTP 200.

- [ ] **Step 4: Verify secret safety**

Run:

```bash
git check-ignore .env
git ls-files .env
git diff -- . ':!docs'
```

Expected: `.env` is ignored, is not listed by `git ls-files`, and the real key is absent from tracked diffs.

- [ ] **Step 5: Commit and push**

Run:

```bash
git add .env.example docker-compose.yml README.md server src docs
git commit -m "feat: add DeepSeek movie assistant"
git push origin main
```

Expected: `main` is pushed to `https://github.com/huaixinsi/Js-Work.git`.
