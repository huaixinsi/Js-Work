export type SeatStatus = "available" | "sold" | "locked" | "broken";

export interface ApiResponse<T> {
  data: T;
}

export interface OrderPayload {
  showtimeId: number;
  seatIds: number[];
  couponAmount?: number;
  pointsUsed?: number;
}

export type Role = "user" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
