import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoReviews } from "./demo-reviews.js";

const users = [
  { id: 1, username: "demo" },
  { id: 2, username: "vipuser" },
  { id: 3, username: "plain" }
];

test("buildDemoReviews creates 2 to 4 clearly marked reviews", () => {
  for (const movieId of [40, 41, 42]) {
    const reviews = buildDemoReviews(movieId, "测试电影", users);

    assert.ok(reviews.length >= 2 && reviews.length <= 4);
    assert.ok(reviews.every((review) => review.content.includes("演示评论")));
    assert.ok(reviews.every((review) => review.content.includes("测试电影")));
    assert.ok(reviews.every((review) => review.rating >= 7 && review.rating <= 10));
    assert.ok(reviews.every((review) => users.some((user) => user.id === review.userId)));
  }
});

test("buildDemoReviews is deterministic for idempotent database inserts", () => {
  const first = buildDemoReviews(42, "测试电影", users);
  const second = buildDemoReviews(42, "测试电影", users);

  assert.deepEqual(second, first);
  assert.equal(new Set(first.map((review) => review.content)).size, first.length);
});
