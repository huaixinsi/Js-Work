import test from "node:test";
import assert from "node:assert/strict";
import { buildRecommendations } from "./recommendations.js";

test("buildRecommendations returns hot, local, and top rated groups", () => {
  const movies = [
    { id: 1, title: "A", cityHeat: 80, heat: 95, rating: 8.1 },
    { id: 2, title: "B", cityHeat: 98, heat: 50, rating: 9.4 },
    { id: 3, title: "C", cityHeat: 70, heat: 88, rating: 9.8 }
  ];

  const result = buildRecommendations(movies);

  assert.deepEqual(result.hot.map((movie) => movie.title), ["A", "C", "B"]);
  assert.deepEqual(result.local.map((movie) => movie.title), ["B", "A", "C"]);
  assert.deepEqual(result.topRated.map((movie) => movie.title), ["C", "B", "A"]);
});

test("buildRecommendations returns up to 12 movies in each group", () => {
  const movies = Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    title: `电影 ${index + 1}`,
    cityHeat: 100 - index,
    heat: 200 - index,
    rating: 10 - index / 10
  }));

  const result = buildRecommendations(movies);

  assert.equal(result.hot.length, 12);
  assert.equal(result.local.length, 12);
  assert.equal(result.topRated.length, 12);
});
