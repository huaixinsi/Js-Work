import test from "node:test";
import assert from "node:assert/strict";
import { buildDiscoverUrl, fetchPopularMovies, mapTmdbMovie } from "./tmdb.js";

test("mapTmdbMovie converts TMDB popular movie data into local movie fields", () => {
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
  assert.equal(mapped.genre, "近年热门");
  assert.equal(mapped.status, "上映中");
  assert.ok(mapped.heat > 500);
});

test("buildDiscoverUrl requests popular movies released in the last two years", () => {
  const url = buildDiscoverUrl(2, new Date("2026-07-01T00:00:00Z"));

  assert.equal(url.pathname, "/3/discover/movie");
  assert.equal(url.searchParams.get("language"), "zh-CN");
  assert.equal(url.searchParams.get("region"), "CN");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("sort_by"), "popularity.desc");
  assert.equal(url.searchParams.get("primary_release_date.gte"), "2024-07-01");
  assert.equal(url.searchParams.get("primary_release_date.lte"), "2026-07-01");
});

test("fetchPopularMovies merges three pages, filters invalid movies, deduplicates, and caps at 60", async () => {
  const requestedPages = [];
  const fetchImpl = async (url) => {
    const page = Number(url.searchParams.get("page"));
    requestedPages.push(page);
    const startId = (page - 1) * 25 + 1;
    const results = Array.from({ length: 25 }, (_, index) => ({
      id: startId + index,
      title: `电影 ${startId + index}`,
      poster_path: `/poster-${startId + index}.jpg`,
      overview: "测试简介",
      release_date: "2025-08-01",
      vote_average: 8,
      popularity: 100 - index
    }));

    if (page === 2) {
      results[0] = { ...results[0], id: 1 };
      results[1] = { ...results[1], poster_path: null };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ results })
    };
  };

  const movies = await fetchPopularMovies("token", "", {
    fetchImpl,
    now: new Date("2026-07-01T00:00:00Z")
  });

  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.equal(movies.length, 60);
  assert.equal(new Set(movies.map((movie) => movie.tmdbId)).size, 60);
  assert.ok(movies.every((movie) => movie.poster.includes("image.tmdb.org")));
});

test("fetchPopularMovies falls back to the API key when the access token is rejected", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({
      authorization: options.headers.Authorization,
      apiKey: url.searchParams.get("api_key")
    });

    if (requests.length === 1) {
      return { ok: false, status: 401 };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        results: [{
          id: 99,
          title: "回退成功",
          poster_path: "/fallback.jpg",
          release_date: "2025-01-01"
        }]
      })
    };
  };

  const movies = await fetchPopularMovies("invalid-token", "valid-key", {
    fetchImpl,
    pageCount: 1
  });

  assert.equal(requests[0].authorization, "Bearer invalid-token");
  assert.equal(requests[0].apiKey, null);
  assert.equal(requests[1].apiKey, "valid-key");
  assert.equal(movies[0].title, "回退成功");
});
