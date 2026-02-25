import express from "express";
import db from "../db/postgres.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all channels
router.get("/", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, type, created_by, created_at FROM channels ORDER BY type, name`
  );
  res.json(rows);
});

// POST create a new channel
router.post("/", requireAuth, async (req, res) => {
  const { name, type = "text" } = req.body;
  if (!name) return res.status(400).json({ error: "Channel name required" });

  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);
  const finalName = type === "voice" ? `voice-${clean.replace(/^voice-/, "")}` : clean;

  try {
    const { rows } = await db.query(
      `INSERT INTO channels (name, type, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [finalName, type, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Channel already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE a channel (only creator or admin can delete — for now just creator)
router.delete("/:id", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM channels WHERE id = $1`, [req.params.id]
  );
  const ch = rows[0];
  if (!ch) return res.status(404).json({ error: "Not found" });
  if (ch.created_by !== req.user.id)
    return res.status(403).json({ error: "Only the channel creator can delete it" });

  // Don't allow deleting seeded defaults
  const defaults = ["general", "random", "yakking", "voice-general", "voice-chill"];
  if (defaults.includes(ch.name))
    return res.status(403).json({ error: "Cannot delete default channels" });

  await db.query(`DELETE FROM channels WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;