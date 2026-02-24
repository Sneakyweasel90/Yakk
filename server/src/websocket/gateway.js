import { WebSocketServer, WebSocket } from "ws";
import { verifyWsToken } from "../middleware/auth.js";
import db from "../db/postgres.js";
import redis from "../redis/redisClient.js";

// Map of channelId -> Set of WebSocket clients
const channels = new Map();

// Simple per-user rate limiting
const msgCounts = new Map();
function isRateLimited(userId) {
  const now = Date.now();
  const entry = msgCounts.get(userId) || { count: 0, reset: now + 10000 };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 10000;
  }
  entry.count++;
  msgCounts.set(userId, entry);
  return entry.count > 20; // max 20 msgs per 10 seconds
}

function broadcast(channelId, data, excludeWs = null) {
  const clients = channels.get(channelId);
  if (!clients) return;
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
  const token = new URL(req.url, "http://192.168.0.30:4000").searchParams.get("token");
  //console.log("Token received:", token);
  const user = verifyWsToken(token);
  //console.log("User:", user);

  if (!user) {
    console.log("Auth failed, closing");
    ws.close(1008, "Unauthorized");
    return;
  }

    ws.user = user;
    ws.channels = new Set();

    //console.log(`${user.username} connected`);

    // Track presence
    await redis.sAdd("online_users", String(user.id));

    ws.on("message", async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      // JOIN a channel
      if (msg.type === "join") {
        const { channelId } = msg;
        if (!channels.has(channelId)) channels.set(channelId, new Set());
        channels.get(channelId).add(ws);
        ws.channels.add(channelId);

        // Send last 50 messages on join
        const { rows } = await db.query(
          `SELECT m.*, u.username FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id=$1
           ORDER BY m.id DESC LIMIT 50`,
          [channelId]
        );
        ws.send(JSON.stringify({ type: "history", messages: rows.reverse() }));
      }

      // SEND a message
      if (msg.type === "message") {
        if (isRateLimited(user.id)) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limited" }));
          return;
        }

        const { channelId, content } = msg;
        if (!content?.trim()) return;

        // Save to DB
        const { rows } = await db.query(
          `INSERT INTO messages (channel_id, user_id, username, content)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [channelId, user.id, user.username, content.trim()]
        );

        const saved = rows[0];
        broadcast(channelId, { type: "message", message: saved });
      }

      // TYPING indicator
      if (msg.type === "typing") {
        const { channelId } = msg;
        broadcast(channelId, {
          type: "typing",
          userId: user.id,
          username: user.username,
        }, ws); // exclude sender
      }

      // VOICE - join channel
if (msg.type === "voice_join") {
  const { channelId } = msg;
  ws.voiceChannel = channelId;

  if (!channels.has(`voice:${channelId}`)) channels.set(`voice:${channelId}`, new Set());
  const voiceClients = channels.get(`voice:${channelId}`);

  // Tell the new user who's already in the channel
  const existingUsers = [...voiceClients].map((c) => ({
    userId: c.user.id,
    username: c.user.username,
  }));
  ws.send(JSON.stringify({ type: "voice_participants", usernames: existingUsers.map(u => u.username) }));

  // Tell everyone else someone joined
  for (const client of voiceClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "voice_user_joined",
        userId: user.id,
        username: user.username,
      }));
    }
  }

  voiceClients.add(ws);
}

// VOICE - leave channel
if (msg.type === "voice_leave") {
  if (ws.voiceChannel) {
    const voiceClients = channels.get(`voice:${ws.voiceChannel}`);
    voiceClients?.delete(ws);

    // Tell others they left
    for (const client of voiceClients || []) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "voice_user_left",
          userId: user.id,
          username: user.username,
        }));
      }
    }
    ws.voiceChannel = null;
  }
}

// VOICE - WebRTC signaling (offer, answer, ICE)
      if (["voice_offer", "voice_answer", "voice_ice"].includes(msg.type)) {
        const { targetUserId } = msg;
        for (const client of wss.clients) {
          if (client.user?.id === targetUserId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ ...msg, userId: user.id }));
            break;
          }
        }
      }

    }); // closes ws.on("message")

    ws.on("close", async () => {
      for (const channelId of ws.channels) {
        channels.get(channelId)?.delete(ws);
      }
      if (ws.voiceChannel) {
        const voiceClients = channels.get(`voice:${ws.voiceChannel}`);
        voiceClients?.delete(ws);
        for (const client of voiceClients || []) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "voice_user_left",
              userId: user.id,
              username: user.username,
            }));
          }
        }
      }
      await redis.sRem("online_users", String(user.id));
    }); // closes ws.on("close")

  }); // closes wss.on("connection")

  console.log("✅ WebSocket gateway ready");

}