import test from "node:test";
import assert from "node:assert/strict";
import { requestDeepSeek } from "./deepseek.js";

const baseOptions = {
  apiKey: "test-key",
  model: "deepseek-v4-flash",
  systemPrompt: "只推荐本地电影",
  messages: [{ role: "user", content: "热门电影" }]
};

test("requestDeepSeek sends an authenticated Chat Completions request", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "推荐结果" } }]
      })
    };
  };

  const answer = await requestDeepSeek({ ...baseOptions, fetchImpl });
  const body = JSON.parse(captured.init.body);

  assert.equal(answer, "推荐结果");
  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.Authorization, "Bearer test-key");
  assert.equal(body.model, "deepseek-v4-flash");
  assert.deepEqual(body.messages[0], { role: "system", content: "只推荐本地电影" });
  assert.deepEqual(body.messages[1], { role: "user", content: "热门电影" });
  assert.equal(body.stream, false);
});

test("requestDeepSeek rejects missing configuration and invalid upstream responses", async () => {
  await assert.rejects(
    () => requestDeepSeek({ ...baseOptions, apiKey: "" }),
    /尚未配置/
  );
  await assert.rejects(
    () => requestDeepSeek({
      ...baseOptions,
      fetchImpl: async () => ({ ok: false, status: 429 })
    }),
    /暂时不可用/
  );
  await assert.rejects(
    () => requestDeepSeek({
      ...baseOptions,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: " " } }] })
      })
    }),
    /未返回有效回答/
  );
});

test("requestDeepSeek aborts requests that exceed the timeout", async () => {
  const fetchImpl = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  });

  await assert.rejects(
    () => requestDeepSeek({ ...baseOptions, fetchImpl, timeoutMs: 5 }),
    /请求超时/
  );
});
