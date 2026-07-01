const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie";
const DEFAULT_PAGE_COUNT = 3;
const DEFAULT_MOVIE_LIMIT = 60;

export function mapTmdbMovie(movie, index = 0) {
  const releaseYear = Number(String(movie.release_date ?? "").slice(0, 4)) || new Date().getFullYear();
  const rating = Math.round(Number(movie.vote_average ?? 0) * 10) / 10;
  const popularity = Number(movie.popularity ?? 0);

  return {
    tmdbId: Number(movie.id),
    title: movie.title || movie.name || "未命名电影",
    poster: movie.poster_path
      ? `${POSTER_BASE_URL}${movie.poster_path}`
      : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&h=720&fit=crop",
    trailerUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    actors: "TMDB 公开电影资料",
    genre: "近年热门",
    region: "全球/中国区",
    releaseYear,
    rating,
    heat: Math.round(900 - index * 8 + popularity),
    cityHeat: Math.round(850 - index * 6 + popularity),
    status: "上映中",
    summary: movie.overview || "该影片暂无中文简介，可进入详情页查看本地评论。"
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function buildDiscoverUrl(page, now = new Date()) {
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - 2);

  const url = new URL(TMDB_DISCOVER_URL);
  url.searchParams.set("language", "zh-CN");
  url.searchParams.set("region", "CN");
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("primary_release_date.gte", formatDate(start));
  url.searchParams.set("primary_release_date.lte", formatDate(now));
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("include_video", "false");
  url.searchParams.set("page", String(page));
  return url;
}

async function requestDiscoverPage(url, accessToken, apiKey, fetchImpl) {
  let response = accessToken
    ? await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    })
    : null;

  if ((!response || response.status === 401) && apiKey) {
    url.searchParams.set("api_key", apiKey);
    response = await fetchImpl(url, { headers: { accept: "application/json" } });
  }

  if (!response || !response.ok) {
    throw new Error(`TMDB 同步失败：${response?.status ?? "无响应"}`);
  }

  return response.json();
}

function isCompleteMovie(movie) {
  return Boolean(
    Number(movie.id) &&
    (movie.title || movie.name) &&
    movie.poster_path &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(movie.release_date ?? ""))
  );
}

export async function fetchPopularMovies(accessToken, apiKey, options = {}) {
  if (!accessToken && !apiKey) {
    throw new Error("缺少 TMDB_ACCESS_TOKEN 或 TMDB_API_KEY，无法同步真实热门电影");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();
  const pageCount = options.pageCount ?? DEFAULT_PAGE_COUNT;
  const movieLimit = options.movieLimit ?? DEFAULT_MOVIE_LIMIT;
  const rawMovies = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const body = await requestDiscoverPage(
      buildDiscoverUrl(page, now),
      accessToken,
      apiKey,
      fetchImpl
    );
    rawMovies.push(...(body.results ?? []));
  }

  const uniqueMovies = [];
  const seenIds = new Set();

  for (const movie of rawMovies) {
    const tmdbId = Number(movie.id);
    if (!isCompleteMovie(movie) || seenIds.has(tmdbId)) {
      continue;
    }
    seenIds.add(tmdbId);
    uniqueMovies.push(movie);
  }

  return uniqueMovies
    .slice(0, movieLimit)
    .map((movie, index) => mapTmdbMovie(movie, index));
}
