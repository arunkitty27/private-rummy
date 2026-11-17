# Private Rummy — Deployment & APK Build Guide

This guide covers setting up, deploying, and building the APK for the Private Rummy two-player Android application.

## Architecture overview

```
Android Phone A ─── WebSocket ───┐
                                  ├── Render (Node.js + Socket.IO) ── Neon (PostgreSQL)
Android Phone B ─── WebSocket ───┘
```

- **Backend**: Express + Socket.IO on Render free web service.
- **Database**: PostgreSQL on Neon free tier (persists rooms for server-restart recovery).
- **Mobile**: React Native + Expo, distributed as a shareable APK.

---

## Step 1: Create a Neon PostgreSQL database

1. Sign up at https://neon.tech/.
2. Create a new project (choose a region close to you).
3. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
4. Store this securely — you'll paste it into Render's environment variables.

The backend automatically creates tables via `001_initial.sql` on first startup. No manual SQL is needed.

---

## Step 2: Push to GitHub

> **NOTE:** Do NOT push `.env` files or database credentials.

1. Create a new **private** repository on https://github.com/.
2. Push the project:

```bash
cd private-rummy
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy backend to Render

### Option A: Blueprint deployment (recommended)

1. Go to https://dashboard.render.com/.
2. Click **New → Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and create a free web service.
5. When prompted, set the **DATABASE_URL** environment variable to your Neon connection string.
6. Wait for the first deploy to finish (~2–5 minutes).
7. Verify: open `https://YOUR-SERVICE.onrender.com/health` in your browser.

### Option B: Manual web service

1. Click **New → Web Service**.
2. Connect your GitHub repo.
3. Set:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Plan**: Free
4. Add environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `PG_SSL` = `true`
   - `NODE_ENV` = `production`
5. Deploy and verify `/health`.

### Cold-start behaviour

Render free services **sleep after 15 minutes of inactivity**. The first request after sleep takes 30–60 seconds. This is expected:
- The mobile app's Socket.IO client has automatic reconnection configured.
- If a game was in progress, both players can resume using their stored session tokens.
- If the server restarted, rooms are restored from PostgreSQL on startup.

---

## Step 4: Configure the mobile app

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_SERVER_URL=https://YOUR-SERVICE.onrender.com
```

For **local development** (phone on the same Wi-Fi as your computer):

```env
EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:3000
```

Replace `192.168.x.x` with your computer's local IP (`ifconfig | grep inet` on Mac/Linux).

---

## Step 5: Run locally with Expo (development testing)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone. You need two devices (or one device + Android emulator) to test the full two-player flow.

---

## Step 6: Build a shareable APK

### 6a. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 6b. Configure EAS project

```bash
cd mobile
eas build:configure
```

This creates or updates `eas.json` and sets the `extra.eas.projectId` in `app.json`. Follow the prompts.

### 6c. Build the preview APK

```bash
cd mobile
eas build --platform android --profile preview
```

- The `preview` profile in `eas.json` produces an **APK** (not AAB), suitable for direct installation.
- EAS builds run in the cloud. The first build takes ~10–15 minutes.
- When complete, EAS provides a **download URL** for the APK.

### 6d. Share the APK

1. Download the APK from the EAS build page.
2. Send it to the other player via WhatsApp, Telegram, email, Google Drive, etc.
3. On the recipient's phone: open the APK, allow "Install from unknown sources" if prompted, and install.

---

## Step 7: Verification checklist

Run through this checklist on two separate Android devices:

| # | Check | Status |
|---|-------|--------|
| 1 | `https://YOUR-SERVICE.onrender.com/health` returns `{"status":"healthy",...}` | ☐ |
| 2 | Player 1 creates a room and gets a 6-character code | ☐ |
| 3 | Player 2 joins using the room code (from a different device/network) | ☐ |
| 4 | Both players see 13 cards dealt, wild joker displayed | ☐ |
| 5 | Turn alternation works: draw → discard → opponent's turn | ☐ |
| 6 | Cannot draw out of turn (error shown) | ☐ |
| 7 | Cannot discard a card not in hand | ☐ |
| 8 | Cannot see opponent's cards (only card count shown) | ☐ |
| 9 | Disconnect one phone's Wi-Fi → opponent sees "reconnecting…" | ☐ |
| 10 | Reconnect Wi-Fi → game resumes from exact state | ☐ |
| 11 | Kill and reopen the app → session restored from AsyncStorage | ☐ |
| 12 | Valid declaration ends the game, scores displayed | ☐ |
| 13 | Invalid declaration shows error, player can retry | ☐ |
| 14 | Both players vote Rematch → new game starts | ☐ |
| 15 | Leave game → opponent notified | ☐ |
| 16 | APK installs on a fresh Android phone | ☐ |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not connect to game server" | Check `EXPO_PUBLIC_SERVER_URL` is correct. Verify backend `/health` endpoint. |
| Render service sleeping | First connection after inactivity is slow (30–60s). Wait for reconnection. |
| "Room not found" after server restart | Rooms are restored from PostgreSQL. If `DATABASE_URL` is not set, rooms are lost. |
| APK not installing | Enable "Install from unknown sources" in Android Settings → Security. |
| Cards not updating in real time | Check both phones have internet. The app auto-reconnects via WebSocket. |
| Build fails on EAS | Run `eas build:configure` first. Check `app.json` has valid `extra.eas.projectId`. |

---

## Environment variables reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default 3000) | HTTP server port |
| `NODE_ENV` | No (default development) | Set to `production` on Render |
| `DATABASE_URL` | No (but recommended) | Neon PostgreSQL connection string |
| `PG_SSL` | No (default false) | Set `true` for Neon/hosted PostgreSQL |
| `ALLOWED_ORIGINS` | No (default `*`) | CORS origins, comma-separated |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SERVER_URL` | Yes | Backend WebSocket URL |

---

## Database migrations

Migrations are stored in `backend/migrations/` and applied automatically by the backend on startup.

| File | Purpose |
|------|---------|
| `001_initial.sql` | Creates `rummy_rooms` table with JSONB state column |

To add new migrations: create `002_<name>.sql` and add corresponding runner logic to `backend/src/db/store.js`.
