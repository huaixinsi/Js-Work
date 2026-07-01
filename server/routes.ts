import express from "express";
import { ResultSetHeader } from "mysql2";
import { query, pool } from "./db.js";
import {
  createAccessToken,
  parseAuthHeader,
  validateRegistration,
  verifyAccessToken
} from "./domain/auth.js";
import { buildDemoReviews } from "./domain/demo-reviews.js";
import { validateReview } from "./domain/reviews.js";
import { fetchPopularMovies } from "./domain/tmdb.js";
import { calculateOrderTotal, createTicketCode } from "./domain/ticketing.js";
import { buildRecommendations } from "./domain/recommendations.js";
import type { AuthUser, OrderPayload, Role } from "./types.js";

export const api = express.Router();
const jwtSecret = process.env.JWT_SECRET ?? "movie-ticket-demo-secret";

function publicUser(user: Record<string, unknown>) {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function requireAuth(req: express.Request, _res: express.Response, next: express.NextFunction) {
  try {
    const token = parseAuthHeader(req.headers.authorization ?? "");
    req.user = verifyAccessToken(token, jwtSecret) as AuthUser;
    next();
  } catch {
    next(new Error("请先登录"));
  }
}

function requireRole(role: Role) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!req.user || req.user.role !== role) {
      next(new Error("当前账号没有权限访问该功能"));
      return;
    }

    next();
  };
}

async function createSeatsForShowtime(connection: Awaited<ReturnType<typeof pool.getConnection>>, showtimeId: number) {
  const rows = ["A", "B", "C", "D", "E", "F"];

  for (const row of rows) {
    for (let seatNumber = 1; seatNumber <= 8; seatNumber += 1) {
      const status =
        row === "A" && seatNumber <= 2
          ? "sold"
          : row === "C" && seatNumber === 5
            ? "broken"
            : row === "D" && [3, 4].includes(seatNumber)
              ? "locked"
              : "available";
      await connection.execute(
        "INSERT INTO seats (showtime_id, row_label, seat_number, status) VALUES (?, ?, ?, ?)",
        [showtimeId, row, seatNumber, status]
      );
    }
  }
}

async function ensureShowtimeForMovie(connection: Awaited<ReturnType<typeof pool.getConnection>>, movieId: number, index: number) {
  const [existing] = await connection.execute("SELECT id FROM showtimes WHERE movie_id = ? LIMIT 1", [movieId]);

  if ((existing as Array<{ id: number }>).length > 0) {
    return;
  }

  const hallId = (index % 4) + 1;
  const dayOffset = index % 5;
  const hour = 14 + (index % 5) * 2;
  const startsAt = `2026-06-${String(20 + dayOffset).padStart(2, "0")} ${String(hour).padStart(2, "0")}:30:00`;
  const price = 39 + (index % 5) * 6;
  const [showtimeResult] = await connection.execute<ResultSetHeader>(
    "INSERT INTO showtimes (movie_id, hall_id, starts_at, language, price) VALUES (?, ?, ?, ?, ?)",
    [movieId, hallId, startsAt, "中文/原声", price]
  );

  await createSeatsForShowtime(connection, showtimeResult.insertId);
}

async function ensureDemoReviews(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  movieId: number,
  title: string,
  users: Array<{ id: number; username: string }>
) {
  const reviews = buildDemoReviews(movieId, title, users);

  for (const review of reviews) {
    const createdAt = new Date(Date.now() - review.daysAgo * 24 * 60 * 60 * 1000);
    await connection.execute(
      `INSERT INTO reviews (movie_id, user_id, rating, content, image_url, created_at)
       SELECT ?, ?, ?, ?, NULL, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM reviews WHERE movie_id = ? AND content = ?
       )`,
      [
        movieId,
        review.userId,
        review.rating,
        review.content,
        createdAt,
        movieId,
        review.content
      ]
    );
  }
}

export async function syncTmdbPopularMovies() {
  const movies = await fetchPopularMovies(process.env.TMDB_ACCESS_TOKEN, process.env.TMDB_API_KEY);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [demoUserRows] = await connection.execute(
      `SELECT id, username
       FROM users
       WHERE username IN ('demo', 'vipuser', 'plain')
       ORDER BY FIELD(username, 'demo', 'vipuser', 'plain')`
    );
    const demoUsers = demoUserRows as Array<{ id: number; username: string }>;

    for (const [index, movie] of movies.entries()) {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO movies
          (tmdb_id, title, poster, trailer_url, actors, genre, region, release_year, rating, heat, cityHeat, status, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          poster = VALUES(poster),
          trailer_url = VALUES(trailer_url),
          actors = VALUES(actors),
          genre = VALUES(genre),
          region = VALUES(region),
          release_year = VALUES(release_year),
          rating = VALUES(rating),
          heat = VALUES(heat),
          cityHeat = VALUES(cityHeat),
          status = VALUES(status),
          summary = VALUES(summary)`,
        [
          movie.tmdbId,
          movie.title,
          movie.poster,
          movie.trailerUrl,
          movie.actors,
          movie.genre,
          movie.region,
          movie.releaseYear,
          movie.rating,
          movie.heat,
          movie.cityHeat,
          movie.status,
          movie.summary
        ]
      );
      let movieId = result.insertId;
      if (!movieId) {
        const [existingMovieRows] = await connection.execute(
          "SELECT id FROM movies WHERE tmdb_id = ?",
          [movie.tmdbId]
        );
        movieId = (existingMovieRows as Array<{ id: number }>)[0].id;
      }

      await ensureShowtimeForMovie(connection, movieId, index);
    }

    const [allMovieRows] = await connection.execute("SELECT id, title FROM movies ORDER BY id");
    for (const movie of allMovieRows as Array<{ id: number; title: string }>) {
      await ensureDemoReviews(connection, movie.id, movie.title, demoUsers);
    }

    await connection.execute("INSERT INTO admin_logs (action, operator) VALUES (?, ?)", [
      `同步 TMDB 近两年热门电影 ${movies.length} 部`,
      "system"
    ]);
    await connection.commit();
    return movies.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

api.get("/health", (_req, res) => {
  res.json({ data: { ok: true, service: "movie-ticket-system" } });
});

api.post("/auth/login", async (req, res, next) => {
  try {
    const { username, password, role } = req.body as {
      username?: string;
      password?: string;
      role?: Role;
    };
    const [user] = await query<Record<string, unknown>>(
      "SELECT * FROM users WHERE username = :username AND role = :role",
      { username, role }
    );

    if (!user || user.password_hash !== password) {
      throw new Error("账号、密码或身份不正确");
    }

    const token = createAccessToken(
      { id: Number(user.id), username: String(user.username), role: user.role as Role },
      jwtSecret
    );

    res.json({ data: { token, user: publicUser(user) } });
  } catch (error) {
    next(error);
  }
});

api.post("/auth/register", async (req, res, next) => {
  try {
    const registration = validateRegistration(req.body);
    const existing = await query("SELECT id FROM users WHERE username = :username", {
      username: registration.username
    });

    if (existing.length > 0) {
      throw new Error("账号已存在");
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users
        (username, password_hash, role, nickname, avatar, level, member_discount, points, preference_tags, balance, status)
       VALUES (?, ?, 'user', ?, ?, '普通会员', 1.00, 0, CAST(? AS JSON), 0.00, '正常')`,
      [
        registration.username,
        registration.password,
        registration.nickname,
        "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=120&h=120&fit=crop",
        JSON.stringify(registration.preferenceTags)
      ]
    );
    const [user] = await query<Record<string, unknown>>("SELECT * FROM users WHERE id = :id", {
      id: result.insertId
    });
    const token = createAccessToken(
      { id: Number(user.id), username: String(user.username), role: "user" },
      jwtSecret
    );

    res.status(201).json({ data: { token, user: publicUser(user) } });
  } catch (error) {
    next(error);
  }
});

api.get("/users/me", requireAuth, async (req, res, next) => {
  try {
    const users = await query<Record<string, unknown>>("SELECT * FROM users WHERE id = :id", {
      id: req.user?.id
    });
    res.json({ data: publicUser(users[0]) });
  } catch (error) {
    next(error);
  }
});

api.get("/movies", async (_req, res, next) => {
  try {
    const movies = await query("SELECT * FROM movies ORDER BY heat DESC");
    res.json({ data: movies });
  } catch (error) {
    next(error);
  }
});

api.get("/movies/recommendations", async (_req, res, next) => {
  try {
    const movies = await query("SELECT * FROM movies WHERE status = '上映中'");
    res.json({ data: buildRecommendations(movies) });
  } catch (error) {
    next(error);
  }
});

api.post("/movies/sync-tmdb", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const count = await syncTmdbPopularMovies();
    res.json({ data: { synced: count } });
  } catch (error) {
    next(error);
  }
});

api.get("/movies/:id", async (req, res, next) => {
  try {
    const [movie] = await query("SELECT * FROM movies WHERE id = :id", { id: req.params.id });
    const reviews = await query(
      `SELECT r.*, u.nickname
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.movie_id = :id
       ORDER BY r.id DESC`,
      { id: req.params.id }
    );
    res.json({ data: { movie, reviews } });
  } catch (error) {
    next(error);
  }
});

api.post("/movies/:id/reviews", requireAuth, requireRole("user"), async (req, res, next) => {
  try {
    const review = validateReview(req.body);
    const currentUser = req.user as AuthUser;
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO reviews (movie_id, user_id, rating, content, image_url) VALUES (?, ?, ?, ?, NULL)",
      [req.params.id, currentUser.id, review.rating, review.content]
    );
    const [created] = await query(
      `SELECT r.*, u.nickname
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = :id`,
      { id: result.insertId }
    );
    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
});

api.get("/cinemas", async (_req, res, next) => {
  try {
    const cinemas = await query("SELECT * FROM cinemas ORDER BY id");
    res.json({ data: cinemas });
  } catch (error) {
    next(error);
  }
});

api.get("/showtimes", async (req, res, next) => {
  try {
    const showtimes = await query(
      `SELECT s.*, m.title AS movie_title, c.name AS cinema_name, h.name AS hall_name, h.type AS hall_type
       FROM showtimes s
       JOIN movies m ON m.id = s.movie_id
       JOIN halls h ON h.id = s.hall_id
       JOIN cinemas c ON c.id = h.cinema_id
       WHERE (:movieId IS NULL OR s.movie_id = :movieId)
       ORDER BY s.starts_at`,
      { movieId: req.query.movieId ?? null }
    );
    res.json({ data: showtimes });
  } catch (error) {
    next(error);
  }
});

api.get("/showtimes/:id/seats", async (req, res, next) => {
  try {
    const seats = await query(
      "SELECT * FROM seats WHERE showtime_id = :id ORDER BY row_label, seat_number",
      { id: req.params.id }
    );
    res.json({ data: seats });
  } catch (error) {
    next(error);
  }
});

api.post("/orders", requireAuth, requireRole("user"), async (req, res, next) => {
  const payload = req.body as OrderPayload;
  const connection = await pool.getConnection();
  const currentUser = req.user as AuthUser;

  try {
    await connection.beginTransaction();
    const [showtimes] = await connection.execute(
      "SELECT price FROM showtimes WHERE id = ? FOR UPDATE",
      [payload.showtimeId]
    );
    const showtime = (showtimes as Array<{ price: number }>)[0];

    const [users] = await connection.execute("SELECT member_discount FROM users WHERE id = ?", [
      currentUser.id
    ]);
    const user = (users as Array<{ member_discount: number }>)[0];

    if (!showtime || !user || payload.seatIds.length === 0) {
      throw new Error("Invalid order request");
    }

    const [seats] = await connection.execute(
      `SELECT id, status FROM seats
       WHERE showtime_id = ? AND id IN (${payload.seatIds.map(() => "?").join(",")})
       FOR UPDATE`,
      [payload.showtimeId, ...payload.seatIds]
    );
    const selectedSeats = seats as Array<{ id: number; status: string }>;
    const invalidSeat = selectedSeats.find((seat) => seat.status !== "available");

    if (selectedSeats.length !== payload.seatIds.length || invalidSeat) {
      throw new Error("Selected seats cannot be selected");
    }

    const total = calculateOrderTotal({
      price: Number(showtime.price),
      seatCount: payload.seatIds.length,
      memberDiscount: Number(user.member_discount),
      couponAmount: Number(payload.couponAmount ?? 0),
      pointsUsed: Number(payload.pointsUsed ?? 0)
    });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO orders (user_id, showtime_id, total_amount, status, expires_at)
       VALUES (?, ?, ?, '待支付', ?)`,
      [currentUser.id, payload.showtimeId, total, expiresAt]
    );
    const orderId = orderResult.insertId;
    const ticketCode = createTicketCode(orderId);

    await connection.execute("UPDATE orders SET ticket_code = ? WHERE id = ?", [ticketCode, orderId]);

    for (const seatId of payload.seatIds) {
      await connection.execute("UPDATE seats SET status = 'locked' WHERE id = ?", [seatId]);
      await connection.execute("INSERT INTO order_seats (order_id, seat_id) VALUES (?, ?)", [
        orderId,
        seatId
      ]);
    }

    await connection.commit();
    res.status(201).json({ data: { id: orderId, total, ticketCode, expiresAt } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

api.post("/orders/:id/pay", requireAuth, requireRole("user"), async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute("SELECT user_id FROM orders WHERE id = ? FOR UPDATE", [
      req.params.id
    ]);
    const order = (orders as Array<{ user_id: number }>)[0];

    if (!order || order.user_id !== req.user?.id) {
      throw new Error("只能支付自己的订单");
    }

    await connection.execute("UPDATE orders SET status = '已支付', paid_at = NOW() WHERE id = ?", [req.params.id]);
    await connection.execute(
      `UPDATE seats SET status = 'sold'
       WHERE id IN (SELECT seat_id FROM order_seats WHERE order_id = ?)`,
      [req.params.id]
    );
    await connection.commit();
    res.json({ data: { paid: true } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

api.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.role === "admin" ? null : req.user?.id;
    const orders = await query(
      `SELECT o.*, m.title AS movie_title, c.name AS cinema_name, s.starts_at
       FROM orders o
       JOIN showtimes s ON s.id = o.showtime_id
       JOIN movies m ON m.id = s.movie_id
       JOIN halls h ON h.id = s.hall_id
       JOIN cinemas c ON c.id = h.cinema_id
       WHERE (:userId IS NULL OR o.user_id = :userId)
       ORDER BY o.id DESC`,
      { userId }
    );
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
});

api.get("/admin/stats", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const [summary] = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = '已支付' THEN total_amount END), 0) AS boxOffice,
        COUNT(*) AS orderCount,
        SUM(CASE WHEN status = '已支付' THEN 1 ELSE 0 END) AS paidOrders
       FROM orders`
    );
    const popularMovies = await query(
      `SELECT m.title, COUNT(o.id) AS orders
       FROM movies m
       LEFT JOIN showtimes s ON s.movie_id = m.id
       LEFT JOIN orders o ON o.showtime_id = s.id
       GROUP BY m.id
       ORDER BY orders DESC, m.heat DESC
       LIMIT 5`
    );
    const users = await query("SELECT id, nickname, level, points, status FROM users ORDER BY id");
    const logs = await query("SELECT * FROM admin_logs ORDER BY id DESC LIMIT 8");

    res.json({
      data: {
        summary,
        popularMovies,
        users,
        logs,
        attendanceRate: 68,
        userGrowth: [120, 138, 156, 188, 220, 248, 286]
      }
    });
  } catch (error) {
    next(error);
  }
});
