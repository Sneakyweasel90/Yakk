import express from "express";
import db from "../db/postgres.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Store the user's ECDH public key (called after login)
router.post("/public-key", requireAuth, async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) return res.status(400).json({ error: "publicKey required" });

  await db.query(
    `UPDATE users SET public_key = $1 WHERE id = $2`,
    [publicKey, req.user.id]
  );
  res.json({ ok: true });
});

// Fetch another user's public key (for DM encryption)
router.get("/:userId/public-key", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT public_key FROM users WHERE id = $1`,
    [req.params.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ publicKey: rows[0].public_key });
});

export default router;