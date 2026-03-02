import express from "express";
import db from "../db/postgres.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Middleware: admin only
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

// GET /api/admin/users — list all users with role info
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, username, nickname, avatar, role, custom_role_name, banned_at, created_at
     FROM users ORDER BY created_at ASC`
  );
  res.json(rows);
});

// PATCH /api/admin/users/:id/role — set role (admin/user/custom), optionally set custom_role_name
// Body: { role: "admin"|"user"|"custom", customRoleName?: string }
router.patch("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });

  // Prevent removing your own admin role
  if (targetId === req.user.id) return res.status(400).json({ error: "Cannot change your own role" });

  const { role, customRoleName } = req.body;
  const validRoles = ["admin", "user", "custom"];
  if (!validRoles.includes(role)) return res.status(400).json({ error: "Invalid role" });

  const cleanCustomName = role === "custom"
    ? (customRoleName || "").trim().slice(0, 50) || "Member"
    : null;

  const { rows } = await db.query(
    `UPDATE users SET role = $1, custom_role_name = $2 WHERE id = $3
     RETURNING id, username, role, custom_role_name`,
    [role, cleanCustomName, targetId]
  );

  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// POST /api/admin/users/:id/kick — invalidate all sessions (force logout)
router.post("/users/:id/kick", requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });
  if (targetId === req.user.id) return res.status(400).json({ error: "Cannot kick yourself" });

  // Delete all refresh tokens — forces re-login
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [targetId]);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/ban — ban user (blocks login + kicks sessions)
router.post("/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });
  if (targetId === req.user.id) return res.status(400).json({ error: "Cannot ban yourself" });

  // Check target isn't also an admin
  const { rows: targetRows } = await db.query(`SELECT role FROM users WHERE id = $1`, [targetId]);
  if (!targetRows[0]) return res.status(404).json({ error: "User not found" });
  if (targetRows[0].role === "admin") return res.status(403).json({ error: "Cannot ban another admin" });

  await db.query(`UPDATE users SET banned_at = NOW() WHERE id = $1`, [targetId]);
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [targetId]);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/unban
router.post("/users/:id/unban", requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });

  await db.query(`UPDATE users SET banned_at = NULL WHERE id = $1`, [targetId]);
  res.json({ ok: true });
});

export default router;