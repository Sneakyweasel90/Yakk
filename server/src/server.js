import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { initDB } from "./db/postgres.js";
import authRoutes, { cleanupExpiredTokens } from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import channelsRoutes from "./routes/channels.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { initWebSocket } from "./websocket/gateway.js";
import { apiLimiter } from "./middleware/rateLimit.js";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/search", searchRoutes);

app.get("/api/health", (_, res) => res.json({ ok: true }));

await initDB();
await initWebSocket(server);

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🦆 Yakk server running on port ${PORT}`));