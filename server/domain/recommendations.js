function takeSorted(movies, field) {
  return [...movies].sort((a, b) => b[field] - a[field]).slice(0, 6);
}

export function buildRecommendations(movies) {
  return {
    hot: takeSorted(movies, "heat"),
    local: takeSorted(movies, "cityHeat"),
    topRated: takeSorted(movies, "rating")
  };
}
