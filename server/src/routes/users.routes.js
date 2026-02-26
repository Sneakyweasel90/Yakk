import express from "express";
import bcrypt from "bcrypt";
import db from "../db/postgres.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Store E2E public key
router.post("/public-key", requireAuth, async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) return res.status(400).json({ error: "publicKey required" });
  await db.query(`UPDATE users SET public_key = $1 WHERE id = $2`, [publicKey, req.user.id]);
  res.json({ ok: true });
});

// Fetch another user's public key
router.get("/:userId/public-key", requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT public_key FROM users WHERE id = $1`, [req.params.userId]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ publicKey: rows[0].public_key });
});

// GET current user's profile
router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, username, nickname, avatar, created_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// PATCH update profile — nickname and/or password
router.patch("/me", requireAuth, async (req, res) => {
  const { nickname, avatar, currentPassword, newPassword } = req.body;

  // Handle avatar update (base64 image, max ~500KB)
  if (avatar !== undefined) {
    if (avatar && avatar.length > 700000)
      return res.status(400).json({ error: "Avatar image too large (max ~500KB)" });
    await db.query(`UPDATE users SET avatar = $1 WHERE id = $2`, [avatar || null, req.user.id]);
  }

  // Handle nickname update
  if (nickname !== undefined) {
    const clean = nickname.trim().slice(0, 50);
    await db.query(
      `UPDATE users SET nickname = $1 WHERE id = $2`,
      [clean || null, req.user.id]  // empty string clears nickname
    );
  }

  // Handle password change
  if (newPassword) {
    if (!currentPassword)
      return res.status(400).json({ error: "Current password required to set new password" });

    const { rows } = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "New password must be at least 6 characters" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, req.user.id]);
  }

  // Return updated profile
  const { rows } = await db.query(
    `SELECT id, username, nickname, avatar FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json(rows[0]);
});

export default router;