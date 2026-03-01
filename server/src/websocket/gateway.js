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

// Broadcast to ALL connected clients — no exclusion so sender sees their own presence update
function broadcastAll(wss, data) {
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && !client._yakk_closed) {
      client.send(payload);
    }
  }
}

async function broadcastPresence(wss) {
  const liveUserIds = new Set();
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && !client._yakk_closed && client.user?.id) {
      liveUserIds.add(String(client.user.id));
    }
  }
  const redisIds = await redis.sMembers("online_users");
  for (const id of redisIds) {
    if (!liveUserIds.has(id)) await redis.sRem("online_users", id);
  }
  for (const id of liveUserIds) await redis.sAdd("online_users", id);

  if (liveUserIds.size === 0) {
    const payload = JSON.stringify({ type: "presence", users: [] });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
    return;
  }

  const { rows } = await db.query(
    `SELECT id, COALESCE(nickname, username) AS username FROM users WHERE id = ANY($1::int[])`,
    [[...liveUserIds].map(Number)]
  );
  const payload = JSON.stringify({ type: "presence", users: rows });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function getVoiceState() {
  const state = {};
  for (const [key, clients] of channels.entries()) {
    if (!key.startsWith("voice:")) continue;
    const channelId = key.replace("voice:", "");
    const names = [...clients].map(c => c.user?.username).filter(Boolean);
    if (names.length > 0) state[channelId] = names;
  }
  return state;
}

async function getReactions(messageId) {
  const { rows } = await db.query(
    `SELECT r.emoji,
            COUNT(*)::int AS count,
            array_agg(u.username) AS users
     FROM reactions r
     JOIN users u ON r.user_id = u.id
     WHERE r.message_id = $1
     GROUP BY r.emoji
     ORDER BY MIN(r.created_at)`,
    [messageId]
  );
  return rows;
}

async function attachReactions(messages) {
  if (messages.length === 0) return messages;
  const ids = messages.map(m => m.id);
  const { rows } = await db.query(
    `SELECT r.message_id, r.emoji,
            COUNT(*)::int AS count,
            array_agg(u.username) AS users
     FROM reactions r
     JOIN users u ON r.user_id = u.id
     WHERE r.message_id = ANY($1::int[])
     GROUP BY r.message_id, r.emoji
     ORDER BY MIN(r.created_at)`,
    [ids]
  );
  const byMsg = {};
  for (const row of rows) {
    if (!byMsg[row.message_id]) byMsg[row.message_id] = [];
    byMsg[row.message_id].push({ emoji: row.emoji, count: row.count, users: row.users });
  }
  return messages.map(m => ({ ...m, reactions: byMsg[m.id] || [] }));
}

export async function initWebSocket(server) {
  await redis.del("online_users");

  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const token = new URL(req.url, "http://localhost:4000").searchParams.get("token");
    const user = verifyWsToken(token);

    if (!user) { ws.close(1008, "Unauthorized"); return; }

    ws.user = user;
    ws.channels = new Set();

    await redis.sAdd("online_users", String(user.id));
    await broadcastPresence(wss);

    ws.on("message", async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      // JOIN
      if (msg.type === "join") {
        const { channelId } = msg;
        if (!channels.has(channelId)) channels.set(channelId, new Set());
        channels.get(channelId).add(ws);
        ws.channels.add(channelId);

        const { rows } = await db.query(
          `SELECT m.*, u.username AS raw_username FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id = $1
           ORDER BY m.id DESC LIMIT 50`,
          [channelId]
        );
        const messages = await attachReactions(rows.reverse());
        ws.send(JSON.stringify({
          type: "history",
          messages,
          hasMore: rows.length === 50,
          oldestId: messages.length > 0 ? messages[0].id : null,
        }));

        // Send current voice occupancy snapshot to newly joined client
        const voiceState = getVoiceState();
        if (Object.keys(voiceState).length > 0) {
          ws.send(JSON.stringify({ type: "voice_state", channels: voiceState }));
        }
      }

      // LOAD MORE
      if (msg.type === "load_more") {
        const { channelId, beforeId } = msg;
        if (!channelId || !beforeId) return;
        const { rows } = await db.query(
          `SELECT m.*, u.username AS raw_username FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id = $1 AND m.id < $2
           ORDER BY m.id DESC LIMIT 50`,
          [channelId, beforeId]
        );
        const messages = await attachReactions(rows.reverse());
        ws.send(JSON.stringify({
          type: "history_prepend",
          messages,
          hasMore: rows.length === 50,
          oldestId: messages.length > 0 ? messages[0].id : null,
        }));
      }

      // SEND message
      if (msg.type === "message") {
        if (isRateLimited(user.id)) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limited" }));
          return;
        }
        const { channelId, content } = msg;
        if (!content?.trim()) return;
        const { rows: uRows } = await db.query(
          `SELECT COALESCE(nickname, username) AS display_name FROM users WHERE id = $1`,
          [user.id]
        );
        const displayName = uRows[0]?.display_name || user.username;
        const { rows } = await db.query(
          `INSERT INTO messages (channel_id, user_id, username, content)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [channelId, user.id, displayName, content.trim()]
        );
        const { rows: uRaw } = await db.query(`SELECT username FROM users WHERE id = $1`, [user.id]);
        broadcast(channelId, { type: "message", message: { ...rows[0], raw_username: uRaw[0]?.username || user.username, reactions: [] } });
      }

      // REACT
      if (msg.type === "react") {
        const { messageId, emoji } = msg;
        if (!messageId || !emoji) return;

        const { rows: msgRows } = await db.query(
          `SELECT channel_id FROM messages WHERE id = $1`, [messageId]
        );
        if (!msgRows[0]) return;
        const channelId = msgRows[0].channel_id;

        const { rows: existing } = await db.query(
          `SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
          [messageId, user.id, emoji]
        );

        if (existing.length > 0) {
          await db.query(
            `DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
            [messageId, user.id, emoji]
          );
        } else {
          await db.query(
            `INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
             ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
            [messageId, user.id, emoji]
          );
        }

        const reactions = await getReactions(messageId);
        broadcast(channelId, { type: "reaction_update", messageId, reactions });
      }

      // TYPING
      if (msg.type === "typing") {
        broadcast(msg.channelId, { type: "typing", userId: user.id, username: user.username }, ws);
      }

      // VOICE join
      if (msg.type === "voice_join") {
        const { channelId } = msg;
        ws.voiceChannel = channelId;
        if (!channels.has(`voice:${channelId}`)) channels.set(`voice:${channelId}`, new Set());
        const voiceClients = channels.get(`voice:${channelId}`);

        // Tell the joining user who's already there (for WebRTC)
        ws.send(JSON.stringify({
          type: "voice_participants",
          usernames: [...voiceClients].map(c => c.user.username),
          userIds: [...voiceClients].map(c => c.user.id),
        }));

        // Tell existing channel members a new user joined (for WebRTC)
        for (const client of voiceClients) {
          if (client.readyState === WebSocket.OPEN)
            client.send(JSON.stringify({ type: "voice_user_joined", userId: user.id, username: user.username, channelId }));
        }

        voiceClients.add(ws);

        // Broadcast to ALL clients INCLUDING sender so their own sidebar updates
        broadcastAll(wss, { type: "voice_presence_update", channelId, username: user.username, action: "join" });
      }

      // PING
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }

      // VOICE leave
      if (msg.type === "voice_leave") {
        if (ws.voiceChannel) {
          const channelId = ws.voiceChannel;
          const voiceClients = channels.get(`voice:${channelId}`);
          voiceClients?.delete(ws);

          // Tell people still in channel (for WebRTC cleanup)
          for (const client of voiceClients || []) {
            if (client.readyState === WebSocket.OPEN)
              client.send(JSON.stringify({ type: "voice_user_left", userId: user.id, username: user.username }));
          }

          // Broadcast to ALL clients INCLUDING sender so their own sidebar clears
          broadcastAll(wss, { type: "voice_presence_update", channelId, username: user.username, action: "leave" });

          ws.voiceChannel = null;
        }
      }

      // VOICE signaling
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
      ws._yakk_closed = true;
      for (const channelId of ws.channels) channels.get(channelId)?.delete(ws);
      if (ws.voiceChannel) {
        const channelId = ws.voiceChannel;
        const vc = channels.get(`voice:${channelId}`);
        vc?.delete(ws);
        for (const client of vc || []) {
          if (client.readyState === WebSocket.OPEN)
            client.send(JSON.stringify({ type: "voice_user_left", userId: user.id, username: user.username }));
        }
        // Broadcast to all remaining clients (sender is gone so no point excluding)
        broadcastAll(wss, { type: "voice_presence_update", channelId, username: user.username, action: "leave" });
      }
      await redis.sRem("online_users", String(user.id));
      await broadcastPresence(wss);
      setTimeout(() => broadcastPresence(wss), 500);
    });
  });

  console.log("✅ WebSocket gateway ready");
}