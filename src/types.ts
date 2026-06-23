export type SeatStatus = "available" | "sold" | "locked" | "broken";

export interface User {
  id: number;
  username: string;
  role: "user" | "admin";
  nickname: string;
  avatar: string;
  level: string;
  member_discount: number;
  points: number;
  preference_tags: string[] | string;
  balance: number;
  status: string;
}

export interface Movie {
  id: number;
  tmdb_id?: number;
  title: string;
  poster: string;
  trailer_url: string;
  actors: string;
  genre: string;
  region: string;
  release_year: number;
  rating: number;
  heat: number;
  cityHeat: number;
  status: string;
  summary: string;
}

export interface Review {
  id: number;
  movie_id: number;
  user_id: number;
  nickname?: string;
  rating: number;
  content: string;
  created_at: string;
}

export interface Showtime {
  id: number;
  movie_id: number;
  hall_id: number;
  starts_at: string;
  language: string;
  price: number;
  movie_title: string;
  cinema_name: string;
  hall_name: string;
  hall_type: string;
}

export interface Seat {
  id: number;
  showtime_id: number;
  row_label: string;
  seat_number: number;
  status: SeatStatus;
}

export interface Order {
  id: number;
  user_id: number;
  showtime_id: number;
  total_amount: number;
  status: string;
  ticket_code: string;
  expires_at: string;
  movie_title: string;
  cinema_name: string;
  starts_at: string;
}

export interface AdminStats {
  summary: {
    boxOffice: number;
    orderCount: number;
    paidOrders: number;
  };
  popularMovies: Array<{ title: string; orders: number }>;
  users: Array<{ id: number; nickname: string; level: string; points: number; status: string }>;
  logs: Array<{ id: number; action: string; operator: string; created_at: string }>;
  attendanceRate: number;
  userGrowth: number[];
}
