import { WebSocketServer, WebSocket } from "ws";
import { verifyWsToken } from "../middleware/auth.js";
import db from "../db/postgres.js";
import redis from "../redis/redisClient.js";

const channels = new Map();

const msgCounts = new Map();
function isRateLimited(userId) {
  const now = Date.now();
  const entry = msgCounts.get(userId) || { count: 0, reset: now + 10000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 10000; }
  entry.count++;
  msgCounts.set(userId, entry);
  return entry.count > 20;
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

// Derive presence from live WS connections rather than trusting Redis alone.
// This means even ungraceful disconnects are handled correctly.
async function broadcastPresence(wss) {
  // Collect user IDs that actually have an open connection right now
  const liveUserIds = new Set();
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client.user?.id) {
      liveUserIds.add(String(client.user.id));
    }
  }

  // Sync Redis to match reality
  const redisIds = await redis.sMembers("online_users");
  for (const id of redisIds) {
    if (!liveUserIds.has(id)) await redis.sRem("online_users", id);
  }
  for (const id of liveUserIds) {
    await redis.sAdd("online_users", id);
  }

  if (liveUserIds.size === 0) {
    const payload = JSON.stringify({ type: "presence", users: [] });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
    return;
  }

  const { rows } = await db.query(
    `SELECT id, username FROM users WHERE id = ANY($1::int[])`,
    [[...liveUserIds].map(Number)]
  );
  const payload = JSON.stringify({ type: "presence", users: rows });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

export async function initWebSocket(server) {
  // Clear stale presence data from any previous server run
  await redis.del("online_users");
  console.log("✅ Cleared stale online_users from Redis");

  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const token = new URL(req.url, "http://localhost:4000").searchParams.get("token");
    const user = verifyWsToken(token);

    if (!user) {
      ws.close(1008, "Unauthorized");
      return;
    }

    ws.user = user;
    ws.channels = new Set();

    await redis.sAdd("online_users", String(user.id));
    await broadcastPresence(wss);

    ws.on("message", async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === "join") {
        const { channelId } = msg;
        if (!channels.has(channelId)) channels.set(channelId, new Set());
        channels.get(channelId).add(ws);
        ws.channels.add(channelId);

        const { rows } = await db.query(
          `SELECT m.*, u.username FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id = $1
           ORDER BY m.id DESC LIMIT 50`,
          [channelId]
        );
        const messages = rows.reverse();
        ws.send(JSON.stringify({
          type: "history",
          messages,
          hasMore: rows.length === 50,
          oldestId: messages.length > 0 ? messages[0].id : null,
        }));
      }

      if (msg.type === "load_more") {
        const { channelId, beforeId } = msg;
        if (!channelId || !beforeId) return;

        const { rows } = await db.query(
          `SELECT m.*, u.username FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id = $1 AND m.id < $2
           ORDER BY m.id DESC LIMIT 50`,
          [channelId, beforeId]
        );
        const messages = rows.reverse();
        ws.send(JSON.stringify({
          type: "history_prepend",
          messages,
          hasMore: rows.length === 50,
          oldestId: messages.length > 0 ? messages[0].id : null,
        }));
      }

      if (msg.type === "message") {
        if (isRateLimited(user.id)) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limited" }));
          return;
        }
        const { channelId, content } = msg;
        if (!content?.trim()) return;

        const { rows } = await db.query(
          `INSERT INTO messages (channel_id, user_id, username, content)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [channelId, user.id, user.username, content.trim()]
        );
        broadcast(channelId, { type: "message", message: rows[0] });
      }

      if (msg.type === "typing") {
        broadcast(msg.channelId, { type: "typing", userId: user.id, username: user.username }, ws);
      }

      if (msg.type === "voice_join") {
        const { channelId } = msg;
        ws.voiceChannel = channelId;
        if (!channels.has(`voice:${channelId}`)) channels.set(`voice:${channelId}`, new Set());
        const voiceClients = channels.get(`voice:${channelId}`);
        ws.send(JSON.stringify({
          type: "voice_participants",
          usernames: [...voiceClients].map(c => c.user.username),
        }));
        for (const client of voiceClients) {
          if (client.readyState === WebSocket.OPEN)
            client.send(JSON.stringify({ type: "voice_user_joined", userId: user.id, username: user.username }));
        }
        voiceClients.add(ws);
      }

      if (msg.type === "voice_leave") {
        if (ws.voiceChannel) {
          const voiceClients = channels.get(`voice:${ws.voiceChannel}`);
          voiceClients?.delete(ws);
          for (const client of voiceClients || []) {
            if (client.readyState === WebSocket.OPEN)
              client.send(JSON.stringify({ type: "voice_user_left", userId: user.id, username: user.username }));
          }
          ws.voiceChannel = null;
        }
      }

      if (["voice_offer", "voice_answer", "voice_ice"].includes(msg.type)) {
        for (const client of wss.clients) {
          if (client.user?.id === msg.targetUserId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ ...msg, userId: user.id }));
            break;
          }
        }
      }
    });

    ws.on("close", async () => {
      for (const channelId of ws.channels) channels.get(channelId)?.delete(ws);
      if (ws.voiceChannel) {
        const vc = channels.get(`voice:${ws.voiceChannel}`);
        vc?.delete(ws);
        for (const client of vc || []) {
          if (client.readyState === WebSocket.OPEN)
            client.send(JSON.stringify({ type: "voice_user_left", userId: user.id, username: user.username }));
        }
      }
      await redis.sRem("online_users", String(user.id));
      await broadcastPresence(wss);
    });
  });

  console.log("✅ WebSocket gateway ready");
}