import mysql, { type QueryResult } from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "movie_user",
  password: process.env.DB_PASSWORD ?? "movie_pass",
  database: process.env.DB_NAME ?? "movie_ticket",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

export async function query<T>(sql: string, params: Record<string, unknown> = {}) {
  const [rows] = await pool.execute<QueryResult>(sql, params as never);
  return rows as T[];
}
