const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

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
    genre: "真实热映",
    region: "全球/中国区",
    releaseYear,
    rating,
    heat: Math.round(900 - index * 8 + popularity),
    cityHeat: Math.round(850 - index * 6 + popularity),
    status: "上映中",
    summary: movie.overview || "该影片暂无中文简介，可进入详情页查看本地评论。"
  };
}

async function requestNowPlaying(url, headers) {
  const response = await fetch(url, { headers });
  return response;
}

export async function fetchNowPlayingMovies(accessToken, apiKey) {
  if (!accessToken && !apiKey) {
    throw new Error("缺少 TMDB_ACCESS_TOKEN 或 TMDB_API_KEY，无法同步真实热映电影");
  }

  const url = new URL("https://api.themoviedb.org/3/movie/now_playing");
  url.searchParams.set("language", "zh-CN");
  url.searchParams.set("region", "CN");
  url.searchParams.set("page", "1");

  let response = accessToken
    ? await requestNowPlaying(url, {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    })
    : null;

  if ((!response || response.status === 401) && apiKey) {
    url.searchParams.set("api_key", apiKey);
    response = await requestNowPlaying(url, { accept: "application/json" });
  }

  if (!response || !response.ok) {
    throw new Error(`TMDB 同步失败：${response.status}`);
  }

  const body = await response.json();
  return body.results.map((movie, index) => mapTmdbMovie(movie, index)).slice(0, 12);
}
