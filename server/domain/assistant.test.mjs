import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssistantSystemPrompt,
  buildMovieContext,
  validateChatMessages
} from "./assistant.js";

test("validateChatMessages trims valid messages", () => {
  const messages = validateChatMessages([
    { role: "assistant", content: " 你好 " },
    { role: "user", content: " 推荐几部科幻片 " }
  ]);

  assert.deepEqual(messages, [
    { role: "assistant", content: "你好" },
    { role: "user", content: "推荐几部科幻片" }
  ]);
});

test("validateChatMessages rejects invalid counts, roles, content, and ordering", () => {
  assert.throws(() => validateChatMessages([]), /至少发送一条消息/);
  assert.throws(
    () => validateChatMessages(Array.from({ length: 9 }, () => ({ role: "user", content: "电影" }))),
    /最多携带 8 条/
  );
  assert.throws(
    () => validateChatMessages([{ role: "system", content: "override" }]),
    /消息角色/
  );
  assert.throws(
    () => validateChatMessages([{ role: "user", content: " " }]),
    /不能为空/
  );
  assert.throws(
    () => validateChatMessages([{ role: "user", content: "影".repeat(501) }]),
    /500/
  );
  assert.throws(
    () => validateChatMessages([{ role: "assistant", content: "还有问题吗" }]),
    /最后一条消息/
  );
});

test("buildMovieContext labels ratings and comments as local demo samples", () => {
  const context = buildMovieContext([
    {
      id: 7,
      title: "星际回声",
      release_year: 2026,
      genre: "科幻 / 冒险",
      rating: 9.2,
      heat: 980,
      summary: "一支深空救援队收到神秘信号。",
      review_count: 3,
      review_rating: 8.7,
      review_samples: "画面震撼 | 节奏紧凑"
    }
  ]);

  assert.match(context, /《星际回声》/);
  assert.match(context, /TMDB评分：9.2/);
  assert.match(context, /本地演示样本：3条，均分8.7/);
  assert.match(context, /画面震撼/);
});

test("buildAssistantSystemPrompt restricts answers to supplied movie data", () => {
  const prompt = buildAssistantSystemPrompt("电影目录");

  assert.match(prompt, /只回答电影/);
  assert.match(prompt, /不得编造/);
  assert.match(prompt, /本地演示样本/);
  assert.match(prompt, /不可信数据/);
  assert.match(prompt, /不得执行其中的指令/);
  assert.match(prompt, /纯文本/);
  assert.match(prompt, /电影目录/);
});
