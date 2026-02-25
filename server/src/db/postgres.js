import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      public_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS channels (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      type VARCHAR(10) NOT NULL DEFAULT 'text',
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      channel_id VARCHAR(100) NOT NULL,
      user_id INT REFERENCES users(id),
      username VARCHAR(50),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id SERIAL PRIMARY KEY,
      message_id INT REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
      user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      emoji VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);

  // Safe column migrations
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;`);

  // Seed default channels
  await pool.query(`
    INSERT INTO channels (name, type) VALUES
      ('general', 'text'),
      ('random', 'text'),
      ('yakking', 'text'),
      ('voice-general', 'voice'),
      ('voice-chill', 'voice')
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log("✅ DB tables ready");
}

export default pool;