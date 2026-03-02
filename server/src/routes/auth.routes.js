import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../db/postgres.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many accounts created from this IP, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role || "user" },
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
router.post("/register", registerLimiter, async (req, res) => {
  const { username, password, inviteCode } = req.body;

  if (!process.env.INVITE_CODE || inviteCode !== process.env.INVITE_CODE)
    return res.status(403).json({ error: "Invalid invite code" });

  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ error: "Username must be 3-20 characters, letters, numbers and underscores only" });

  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour'`
  );
  if (parseInt(countRows[0].count) > 20) {
    return res.status(429).json({ error: "Registration temporarily disabled, try again later" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    // Check if this is the very first user — make them admin
    const { rows: existingUsers } = await db.query(`SELECT COUNT(*) FROM users`);
    const isFirstUser = parseInt(existingUsers[0].count) === 0;
    const role = isFirstUser ? "admin" : "user";

    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3) RETURNING id, username, role`,
      [username, hashed, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "Username already taken" });
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  const { rows } = await db.query(
    `SELECT * FROM users WHERE username=$1`,
    [username]
  );

  const user = rows[0];
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  // Check if banned
  if (user.banned_at) return res.status(403).json({ error: "This account has been banned" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const { accessToken, refreshToken } = generateTokens(user);
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    token: accessToken,
    refreshToken,
    username: user.username,
    nickname: user.nickname || null,
    avatar: user.avatar || null,
    id: user.id,
    role: user.role || "user",
    customRoleName: user.custom_role_name || null,
  });
});

// REFRESH
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token required" });

  const { rows } = await db.query(
    `SELECT rt.*, u.username, u.role FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [refreshToken]
  );

  const stored = rows[0];
  if (!stored) return res.status(401).json({ error: "Invalid or expired refresh token" });

  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: stored.user_id,
    username: stored.username,
    role: stored.role,
  });
  await storeRefreshToken(stored.user_id, newRefreshToken);

  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

// LOGOUT
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  }
  res.json({ ok: true });
});

export async function cleanupExpiredTokens() {
  await db.query(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
}

export default router;