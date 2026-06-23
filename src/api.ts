import type { AdminStats, Movie, Order, Review, Seat, Showtime, User } from "./types";

let authToken = window.localStorage.getItem("movie_ticket_token") ?? "";

export function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    window.localStorage.setItem("movie_ticket_token", token);
  } else {
    window.localStorage.removeItem("movie_ticket_token");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(error.error ?? "请求失败");
  }

  const body = await response.json();
  return body.data as T;
}

export const api = {
  login: (payload: { username: string; password: string; role: "user" | "admin" }) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  register: (payload: {
    username: string;
    password: string;
    nickname: string;
    preferenceTags: string;
  }) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  user: () => request<User>("/users/me"),
  movies: () => request<Movie[]>("/movies"),
  recommendations: () => request<{ hot: Movie[]; local: Movie[]; topRated: Movie[] }>(
    "/movies/recommendations"
  ),
  movie: (id: number) => request<{ movie: Movie; reviews: Review[] }>(`/movies/${id}`),
  syncTmdb: () => request<{ synced: number }>("/movies/sync-tmdb", { method: "POST" }),
  createReview: (movieId: number, payload: { rating: number; content: string }) =>
    request<Review>(`/movies/${movieId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  showtimes: (movieId?: number) =>
    request<Showtime[]>(movieId ? `/showtimes?movieId=${movieId}` : "/showtimes"),
  seats: (showtimeId: number) => request<Seat[]>(`/showtimes/${showtimeId}/seats`),
  createOrder: (payload: {
    showtimeId: number;
    seatIds: number[];
    couponAmount: number;
    pointsUsed: number;
  }) =>
    request<{ id: number; total: number; ticketCode: string; expiresAt: string }>("/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  payOrder: (id: number) => request<{ paid: boolean }>(`/orders/${id}/pay`, { method: "POST" }),
  orders: () => request<Order[]>("/orders"),
  adminStats: () => request<AdminStats>("/admin/stats")
};
