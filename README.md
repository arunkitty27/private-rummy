# Private Rummy — Two-Player Android App

A private, real-time, two-player 13-card Indian Rummy application for Android. The backend is fully authoritative — clients send intents, the server validates every move, and each player only sees their own hand.

## Features

- **Two-player private rooms** with 6-character room codes
- **Real-time gameplay** via Socket.IO WebSockets
- **Server-authoritative** — no cheating possible from the client side
- **53-card deck** (52 standard + 1 printed joker) with wild-rank joker system
- **Full Indian Rummy rules**: pure sequences, impure sequences, sets, declaration validation
- **Reconnection support** — resume games after network drops or app restarts
- **PostgreSQL persistence** — games survive server restarts (Neon free tier)
- **Shareable APK** — no Play Store needed, send the APK directly

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, TypeScript |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (Neon free tier) |
| Hosting | Render free web service |
| Distribution | APK via EAS Build |

## Quick start (local development)

### 1. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm test          # 80 tests — verify everything passes
npm run dev       # Starts on port 3000 with --watch
```

Health check: `http://localhost:3000/health`

### 2. Start the mobile app

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_SERVER_URL=http://<YOUR_LAN_IP>:3000
npx expo start
```

Scan the QR code with Expo Go on your Android phone. Use two devices (or device + emulator) for two-player testing.

### 3. Play

1. **Player 1**: Enter name → "Create Room" → share the 6-character code
2. **Player 2**: Enter name → paste code → "Join Room"
3. Game starts automatically when both players are connected

## Game rules

Standard 13-card Indian Rummy:

- Each player gets 13 cards from a shuffled 53-card deck
- One card is popped as the **wild-rank indicator** (removed from play)
- All cards of that rank become wild jokers (+ the printed joker)
- **Draw phase**: pick one card from the closed deck or open discard pile
- **Discard phase**: discard one card to end your turn
- **Declaration**: discard your 14th card and show 13 remaining cards as valid groups
- **Winning requires**: at least one **pure sequence** (no jokers) + all cards in valid groups (sequences ≥ 3 of same suit, or sets of 3–4 same rank different suits)
- **Invalid declaration**: rejected with error message, player may retry (no penalty)
- **Stock exhaustion**: discard pile (minus top card) is reshuffled into the stock
- **Rematch**: mutual confirmation — both players must vote

## Project structure

```
private-rummy/
├── backend/
│   ├── migrations/         # SQL migration files
│   │   └── 001_initial.sql
│   ├── src/
│   │   ├── db/
│   │   │   └── store.js    # PostgreSQL persistence layer
│   │   ├── game/
│   │   │   ├── cards.js    # Deck creation, shuffle, rank utilities
│   │   │   ├── engine.js   # Game engine (start, draw, discard, declare)
│   │   │   └── validate.js # Declaration validator (bitmask backtracking)
│   │   ├── rooms.js        # Room lifecycle (create, join, resume, rematch, leave)
│   │   └── server.js       # Express + Socket.IO server
│   └── test/
│       ├── game.test.js    # 50+ game engine and validation tests
│       └── rooms.test.js   # 30+ room, security, and multiplayer tests
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CardView.tsx      # Card rendering (face-up and face-down)
│   │   │   ├── GameOver.tsx      # Score summary and rematch screen
│   │   │   ├── GameTable.tsx     # Main game table (piles, opponent, wild joker)
│   │   │   ├── LobbyScreen.tsx   # Create/join room screen
│   │   │   ├── PlayerHand.tsx    # Interactive card hand with tap-select/swap
│   │   │   └── WaitingScreen.tsx # Waiting for second player
│   │   ├── lib/
│   │   │   ├── constants.ts  # Design tokens, suit symbols, server URL
│   │   │   ├── socket.ts     # Socket.IO client singleton
│   │   │   ├── storage.ts    # AsyncStorage session persistence
│   │   │   └── types.ts      # TypeScript interfaces for game state
│   │   └── AppScreen.tsx     # Root component (useReducer state, screen routing)
│   ├── App.js                # Expo entry point (re-exports AppScreen)
│   ├── app.json              # Expo configuration
│   └── eas.json              # EAS Build profiles
├── docs/
│   └── DEPLOYMENT-CHECKLIST.md  # Full deployment and APK build guide
├── render.yaml               # Render Blueprint configuration
└── .env.example              # Environment variable reference
```

## Socket protocol

| Client → Server | Payload | Response |
|----------------|---------|----------|
| `create-room` | `{ playerName }` | `{ roomCode, playerToken, view }` |
| `join-room` | `{ playerName, roomCode }` | `{ roomCode, playerToken, view }` |
| `resume-room` | `{ roomCode, playerToken }` | `{ view }` |
| `game-action` | `{ roomCode, playerToken, action, payload }` | `{ success }` |
| `rematch` | `{ roomCode, playerToken }` | `{ waiting? / started? }` |
| `leave-room` | `{ roomCode, playerToken }` | `{ success }` |

| Server → Client | Payload |
|-----------------|---------|
| `game-state` | `{ view }` — player-specific sanitised state |
| `opponent-event` | `{ type, name }` — `disconnected` / `reconnected` / `left` / `rematch-vote` |

**Actions** for `game-action`:
- `draw` — `{ source: "stock" | "discard" }`
- `discard` — `{ cardId }`
- `declare` — `{ cardId }` (final discard; remaining 13 cards validated)

## Security model

- **Room codes**: 6-character alphanumeric (unambiguous alphabet, 30 chars) → ~729 million combinations
- **Player tokens**: 24 random bytes, base64url encoded → 192-bit entropy
- **Hidden cards**: the opponent's hand is NEVER sent over the wire (only card count)
- **Server authority**: turn order, card ownership, phase transitions, declaration validity — all enforced server-side
- **Rate limiting**: 30 events per 5-second window per socket
- **Database security**: the `state` JSONB column is never exposed via API; only `playerView()` sanitised views are sent

## Testing

```bash
cd backend
npm test
```

80 tests covering:
- Deck generation, uniqueness, and shuffle
- Joker selection and wild-rank assignment
- Pure/impure sequence validation
- Set validation
- Valid and invalid declarations
- Point calculation
- Room lifecycle (create, join, resume, leave)
- Turn enforcement and out-of-turn rejection
- Hidden card protection
- Rematch voting (mutual confirmation)
- Stock exhaustion and discard pile reshuffle

## Deployment

See [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) for step-by-step instructions covering:
- Neon PostgreSQL setup
- Render deployment
- Mobile app configuration
- APK build with EAS
- Verification checklist

## Limitations (MVP)

- No drag-and-drop card sorting (tap-to-select/swap only)
- No push notifications
- No in-game chat
- No spectator mode
- No tournament or multi-round scoring
- No invite links (manual room code sharing)
- Render free tier sleeps after inactivity (30–60s cold start)
- Single deck only (53 cards)

## License

Private use. Not for commercial distribution.
