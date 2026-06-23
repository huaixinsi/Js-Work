import test from "node:test";
import assert from "node:assert/strict";
import { mapTmdbMovie } from "./tmdb.js";

test("mapTmdbMovie converts TMDB now-playing data into local movie fields", () => {
  const mapped = mapTmdbMovie(
    {
      id: 123,
      title: "真实热映电影",
      poster_path: "/poster.jpg",
      overview: "来自 TMDB 的简介",
      release_date: "2026-06-01",
      vote_average: 8.67,
      popularity: 321.2
    },
    2
  );

  assert.equal(mapped.tmdbId, 123);
  assert.equal(mapped.title, "真实热映电影");
  assert.equal(mapped.poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(mapped.releaseYear, 2026);
  assert.equal(mapped.rating, 8.7);
  assert.equal(mapped.status, "上映中");
  assert.ok(mapped.heat > 500);
});
