import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { initDB } from "./db/postgres.js";
import authRoutes from "./routes/auth.routes.js";
import { initWebSocket } from "./websocket/gateway.js";
import { apiLimiter } from "./middleware/rateLimit.js";

const app = express();
const server = http.createServer(app); // shared server for HTTP + WS

app.use(cors());
app.use(express.json());
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

// Boot
await initDB();
initWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🦆 Yakk server running on port ${PORT}`));