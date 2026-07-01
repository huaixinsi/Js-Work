import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { api, syncTmdbPopularMovies } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

app.use(cors());
app.use(express.json());
app.use("/api", api);
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({
    error: error.message || "Request failed"
  });
});

app.listen(port, () => {
  console.log(`Movie ticket system is running on http://localhost:${port}`);
  if (process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY) {
    syncTmdbPopularMovies()
      .then((count) => console.log(`Synced ${count} popular TMDB movies from the last two years`))
      .catch((error) => console.warn(`TMDB sync skipped: ${error.message}`));
  }
});
