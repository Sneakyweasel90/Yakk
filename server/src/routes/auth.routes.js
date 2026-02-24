import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../db/postgres.js";

const router = express.Router();

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = crypto.randomBytes(64).toString("hex");
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, token) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
}

// REGISTER
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2) RETURNING id, username`,
      [username, hashed]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "Username already taken" });
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const { rows } = await db.query(
    `SELECT * FROM users WHERE username=$1`,
    [username]
  );

  const user = rows[0];
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const { accessToken, refreshToken } = generateTokens(user);
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    token: accessToken,
    refreshToken,
    username: user.username,
    id: user.id,
  });
});

// REFRESH — exchange a valid refresh token for a new access + refresh token pair
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token required" });

  const { rows } = await db.query(
    `SELECT rt.*, u.username FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [refreshToken]
  );

  const stored = rows[0];
  if (!stored) return res.status(401).json({ error: "Invalid or expired refresh token" });

  // Rotate: delete old, issue new pair
  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: stored.user_id,
    username: stored.username,
  });
  await storeRefreshToken(stored.user_id, newRefreshToken);

  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

// LOGOUT — revoke refresh token
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  }
  res.json({ ok: true });
});

// Cleanup expired tokens (called periodically)
export async function cleanupExpiredTokens() {
  await db.query(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
}

export default router;