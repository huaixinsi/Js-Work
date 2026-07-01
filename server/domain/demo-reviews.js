const REVIEW_TEMPLATES = [
  "节奏很顺，人物关系也交代得清楚，适合和朋友一起看。",
  "画面和配乐很有影院氛围，中段之后的情绪推进尤其不错。",
  "故事完成度比预想中高，散场后还有一些细节值得回味。",
  "演员表现自然，几个关键场景的感染力很强。",
  "整体观感轻松流畅，类型片爱好者应该会喜欢。",
  "大银幕效果很突出，声音设计让沉浸感提升了不少。"
];

export function buildDemoReviews(movieId, title, users) {
  if (!users.length) {
    return [];
  }

  const normalizedId = Math.abs(Number(movieId)) || 0;
  const count = 2 + (normalizedId % 3);

  return Array.from({ length: count }, (_, index) => {
    const templateIndex = (normalizedId + index * 2) % REVIEW_TEMPLATES.length;
    const ratingStep = (normalizedId + index) % 7;

    return {
      userId: users[(normalizedId + index) % users.length].id,
      rating: 7 + ratingStep * 0.5,
      content: `[演示评论:${movieId}:${index + 1}] 《${title}》${REVIEW_TEMPLATES[templateIndex]}`,
      daysAgo: 1 + ((normalizedId + index * 3) % 14)
    };
  });
}
