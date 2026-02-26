import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db/postgres.js";
import authRoutes, { cleanupExpiredTokens } from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import channelsRoutes from "./routes/channels.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { initWebSocket } from "./websocket/gateway.js";
import { apiLimiter } from "./middleware/rateLimit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Lock CORS to your Railway domain + localhost for dev
const allowedOrigins = [
  "https://yakk-production.up.railway.app",
  "http://localhost:5173",
  "http://localhost:4000",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Electron app, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/search", searchRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

// Serve React frontend in production
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

await initDB();
await initWebSocket(server);

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🦆 Yakk server running on port ${PORT}`));