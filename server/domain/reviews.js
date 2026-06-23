export function validateReview(input) {
  const rating = Math.round(Number(input.rating) * 10) / 10;
  const content = String(input.content ?? "").trim();

  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new Error("评分需要在 0 到 10 分之间");
  }

  if (!content) {
    throw new Error("评论内容不能为空");
  }

  if (content.length > 300) {
    throw new Error("评论内容不能超过 300 字");
  }

  return { rating, content };
}
