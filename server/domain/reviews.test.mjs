import test from "node:test";
import assert from "node:assert/strict";
import { validateReview } from "./reviews.js";

test("validateReview accepts rating and trims local comment content", () => {
  const review = validateReview({ rating: 8.5, content: "  很适合周末去看  " });

  assert.deepEqual(review, { rating: 8.5, content: "很适合周末去看" });
});

test("validateReview rejects empty content and invalid rating", () => {
  assert.throws(() => validateReview({ rating: 11, content: "不错" }), /评分需要/);
  assert.throws(() => validateReview({ rating: 8, content: "" }), /评论内容/);
});
