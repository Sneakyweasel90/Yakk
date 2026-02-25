import express from "express";
import db from "../db/postgres.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/search?q=hello&channel=general&limit=30
router.get("/", requireAuth, async (req, res) => {
  const { q, channel, limit = 30 } = req.query;
  if (!q || String(q).trim().length < 2)
    return res.status(400).json({ error: "Query must be at least 2 characters" });

  const safeLimit = Math.min(Number(limit) || 30, 100);

  try {
    let query, params;

    if (channel) {
      query = `
        SELECT m.id, m.channel_id, m.username, m.content, m.created_at,
               ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) AS rank
        FROM messages m
        WHERE m.channel_id = $2
          AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, m.created_at DESC
        LIMIT $3
      `;
      params = [q, channel, safeLimit];
    } else {
      query = `
        SELECT m.id, m.channel_id, m.username, m.content, m.created_at,
               ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) AS rank
        FROM messages m
        WHERE to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, m.created_at DESC
        LIMIT $2
      `;
      params = [q, safeLimit];
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;