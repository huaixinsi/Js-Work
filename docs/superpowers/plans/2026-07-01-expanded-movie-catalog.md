# Expanded Movie Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync up to 60 popular TMDB movies released in the last two years, show 12 movies per recommendation group, and seed 2-4 idempotent demo reviews per movie.

**Architecture:** Keep TMDB request and normalization logic in `server/domain/tmdb.js`, add deterministic review generation in a focused `server/domain/demo-reviews.js`, and let `server/routes.ts` own transactional database writes. Existing movie IDs and foreign-key relationships remain intact through the current `tmdb_id` upsert.

**Tech Stack:** Node.js, TypeScript, Express, MySQL 8, React, Node test runner, Docker Compose

---

### Task 1: Expand TMDB discovery

**Files:**
- Modify: `server/domain/tmdb.js`
- Modify: `server/domain/tmdb.test.mjs`

- [ ] **Step 1: Write failing tests for Discover URL and multi-page aggregation**

Add tests that call `buildDiscoverUrl(2, new Date("2026-07-01T00:00:00Z"))` and assert:

```js
assert.equal(url.pathname, "/3/discover/movie");
assert.equal(url.searchParams.get("page"), "2");
assert.equal(url.searchParams.get("primary_release_date.gte"), "2024-07-01");
assert.equal(url.searchParams.get("primary_release_date.lte"), "2026-07-01");
assert.equal(url.searchParams.get("sort_by"), "popularity.desc");
```

Add a fetch stub returning three pages with duplicates and invalid records, then assert that `fetchPopularMovies()` requests pages 1-3, filters missing posters, deduplicates IDs, and returns no more than 60 records.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test server/domain/tmdb.test.mjs`

Expected: FAIL because `buildDiscoverUrl` and `fetchPopularMovies` are not exported.

- [ ] **Step 3: Implement Discover fetching**

Export:

```js
export function buildDiscoverUrl(page, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - 2);
  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("language", "zh-CN");
  url.searchParams.set("region", "CN");
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("primary_release_date.gte", start.toISOString().slice(0, 10));
  url.searchParams.set("primary_release_date.lte", end.toISOString().slice(0, 10));
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("include_video", "false");
  url.searchParams.set("page", String(page));
  return url;
}
```

Implement `fetchPopularMovies(accessToken, apiKey, options)` with injectable `fetchImpl` and `now`, request pages 1-3, use bearer-token-first/API-key-fallback authentication, filter incomplete records, deduplicate by ID, map records, and return `slice(0, 60)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test server/domain/tmdb.test.mjs`

Expected: all TMDB domain tests PASS.

### Task 2: Increase recommendation groups

**Files:**
- Modify: `server/domain/recommendations.js`
- Modify: `server/domain/recommendations.test.mjs`

- [ ] **Step 1: Write a failing 12-item recommendation test**

Create 15 movie records with descending fields and assert:

```js
assert.equal(result.hot.length, 12);
assert.equal(result.local.length, 12);
assert.equal(result.topRated.length, 12);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test server/domain/recommendations.test.mjs`

Expected: FAIL because each group currently contains 6 movies.

- [ ] **Step 3: Change the recommendation limit**

Update `takeSorted()` to use `.slice(0, 12)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test server/domain/recommendations.test.mjs`

Expected: all recommendation tests PASS.

### Task 3: Generate deterministic demo reviews

**Files:**
- Create: `server/domain/demo-reviews.js`
- Create: `server/domain/demo-reviews.test.mjs`

- [ ] **Step 1: Write failing review-generation tests**

Import `buildDemoReviews` and assert for several movie IDs:

```js
assert.ok(reviews.length >= 2 && reviews.length <= 4);
assert.ok(reviews.every((review) => review.content.includes("演示评论")));
assert.ok(reviews.every((review) => review.rating >= 7 && review.rating <= 10));
assert.deepEqual(buildDemoReviews(42, "测试电影", users), reviews);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test server/domain/demo-reviews.test.mjs`

Expected: FAIL because `demo-reviews.js` does not exist.

- [ ] **Step 3: Implement deterministic review generation**

Create `buildDemoReviews(movieId, title, users)` using stable templates. Generate `2 + (movieId % 3)` records, rotate through supplied demo user IDs, assign ratings between 7 and 10, and prefix each stable content value with `[演示评论:<movieId>:<index>]`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test server/domain/demo-reviews.test.mjs`

Expected: all demo-review tests PASS.

### Task 4: Integrate catalog and comments into synchronization

**Files:**
- Modify: `server/routes.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Replace the TMDB synchronization dependency**

Import and call `fetchPopularMovies` instead of `fetchNowPlayingMovies`. Update startup and admin log messages from “正在上映” to “近两年热门电影”.

- [ ] **Step 2: Seed reviews inside the existing transaction**

Load the IDs for `demo`, `vipuser`, and `plain`. For every synchronized movie, call `buildDemoReviews(movieId, movie.title, demoUsers)` and execute:

```sql
INSERT INTO reviews (movie_id, user_id, rating, content, created_at)
SELECT ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY)
WHERE NOT EXISTS (
  SELECT 1 FROM reviews WHERE movie_id = ? AND content = ?
)
```

This uses stable content as the idempotency key and leaves user-created reviews untouched.

- [ ] **Step 3: Run type checking and unit tests**

Run: `npm test`

Expected: all domain tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

### Task 5: Verify Docker behavior and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document expanded synchronization**

Update README feature text to say the app synchronizes up to 60 popular movies from the last two years and adds clearly marked demo comments.

- [ ] **Step 2: Run the complete verification suite**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: build succeeds.

Run: `docker compose up --build -d`

Expected: `movie-ticket-mysql` is healthy and `movie-ticket-app` is running.

- [ ] **Step 3: Trigger and inspect real synchronization**

Use the admin login API to obtain a JWT, call `POST /api/movies/sync-tmdb`, then query `/api/movies`.

Expected: synchronization returns up to 60, the movie API contains the expanded set, sampled movie details contain 2-4 demo comments, and repeating synchronization does not increase those demo comment counts.

- [ ] **Step 4: Verify the running page**

Request `http://localhost:3000`.

Expected: HTTP 200.

- [ ] **Step 5: Commit and push**

Run:

```bash
git add README.md server src docs
git commit -m "feat: expand real movie catalog"
git push origin main
```

Expected: `main` is pushed to `https://github.com/huaixinsi/Js-Work.git`.
