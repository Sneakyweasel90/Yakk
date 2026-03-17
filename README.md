# Talko

A private, invite-only chat app for real-time text and voice communication. Available as a web app and a native desktop app on Windows and Linux via Electron.

---

## Features

- **Text channels** — real-time messaging with reactions, replies, edits, deletion, and full-text search
- **Voice channels** — LiveKit-powered audio with noise suppression, push-to-talk, mute, deafen, and per-user volume
- **Screen sharing** — desktop app only; choose a screen or window from a picker before sharing
- **Direct messages** — end-to-end encrypted with ECDH + AES-GCM
- **Member list** — shows online members (with status) and offline members separately
- **User profiles** — avatars, display nicknames, and local nicknames (private per-user renames)
- **Admin tools** — role management, kick, and ban

---

## Running locally

Start the database:

```bash
docker-compose up -d
```

Start the server:

```bash
cd server && npm install && node src/server.js
```

Start the frontend:

```bash
cd client && npm install && npm run dev
```

Run the desktop app in development:

```bash
cd client && npm run electron:dev
```

---

## Environment variables

**Server**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `INVITE_CODE` | Required to register a new account |
| `PORT` | Port to listen on (default 4000) |

**Client**

| Variable | Description |
|---|---|
| `VITE_LIVEKIT_URL` | LiveKit server WebSocket URL |
| `VITE_METERED_USERNAME` | Metered.ca TURN server username |
| `VITE_METERED_CREDENTIAL` | Metered.ca TURN server credential |

---

## Building & releasing

```bash
# Build desktop app
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux

# Release — tag a version and push
git tag v1.x.x && git push origin v1.x.x
```

GitHub Actions will build both installers and attach them to a new GitHub Release. The app will detect and prompt users to update on next launch.
