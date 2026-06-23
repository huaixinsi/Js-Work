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
