/**
 * server.js — Private Rummy WebSocket server
 *
 * Socket events (client → server):
 *   create-room   { playerName }                 → { success, roomCode, playerToken, view }
 *   join-room     { playerName, roomCode }        → { success, roomCode, playerToken, view }
 *   resume-room   { roomCode, playerToken }       → { success, view }
 *   game-action   { roomCode, playerToken, action, payload }  → { success }
 *                 action = 'draw'    payload = { source: 'stock'|'discard' }
 *                 action = 'discard' payload = { cardId }
 *                 action = 'declare' payload = { cardId }
 *   rematch       { roomCode, playerToken }       → { success, waiting?, started? }
 *   leave-room    { roomCode, playerToken }       → { success }
 *
 * Socket events (server → client):
 *   game-state          { view }              — full player-specific state update
 *   opponent-event      { type, name }        — 'disconnected' | 'reconnected' | 'rematch-vote'
 */

import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initStore } from './db/store.js';
import {
  createRoom,
  joinRoom,
  resumeRoom,
  performAction,
  getViews,
  disconnectSocket,
  restoreRooms,
  rematchRoom,
  leaveRoom,
  cleanupFinishedRooms,
  authenticate,
} from './rooms.js';

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

const rawOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
const corsOrigin = rawOrigins.includes('*') ? true : rawOrigins;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/', (_req, res) =>
  res.json({ name: 'Private Rummy API', status: 'online', version: '1.1.0' })
);
app.get('/health', (_req, res) =>
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: { origin: corsOrigin },
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 60_000,
});

// Acknowledge helper.
const ack = (cb, data) => { if (typeof cb === 'function') cb(data); };

// ---------------------------------------------------------------------------
// Simple per-socket rate limiter (no external dependencies).
// Max 30 events per 5-second window per socket.
// ---------------------------------------------------------------------------
const rateLimits = new Map();
function checkRate(socketId) {
  const now = Date.now();
  const windowMs = 5_000;
  const maxEvents = 30;
  let entry = rateLimits.get(socketId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count++;
  rateLimits.set(socketId, entry);
  if (entry.count > maxEvents) throw new Error('Too many requests. Please slow down.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function broadcastViews(room) {
  const views = getViews(room);
  room.players.forEach((p, i) => {
    if (p.socketId) io.to(p.socketId).emit('game-state', { view: views[i] });
  });
}

function notifyOpponent(room, senderIndex, eventType, extra = {}) {
  const oppIndex = 1 - senderIndex;
  const opp = room.players[oppIndex];
  if (opp?.socketId) {
    io.to(opp.socketId).emit('opponent-event', {
      type: eventType,
      name: room.players[senderIndex].name,
      ...extra,
    });
  }
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------
io.on('connection', socket => {
  // --- create-room ---
  socket.on('create-room', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const name = String(data.playerName || '').trim();
      if (!name || name.length > 24) throw new Error('Enter a player name (max 24 characters).');
      const result = await createRoom(name, socket);
      ack(cb, { success: true, ...result });
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- join-room ---
  socket.on('join-room', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const name = String(data.playerName || '').trim();
      if (!name || name.length > 24) throw new Error('Enter a player name (max 24 characters).');
      const { room, playerToken } = await joinRoom(data.roomCode, name, socket);
      const views = getViews(room);

      // Send joining player their view via callback.
      ack(cb, { success: true, roomCode: room.code, playerToken, view: views[1] });

      // Push updated view to the creator.
      const creator = room.players[0];
      if (creator?.socketId) {
        io.to(creator.socketId).emit('game-state', { view: views[0] });
      }
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- resume-room ---
  socket.on('resume-room', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const { room, index } = await resumeRoom(data.roomCode, data.playerToken, socket);
      const views = getViews(room);
      ack(cb, { success: true, view: views[index] });
      // Also push via event (handles Expo background reconnect).
      socket.emit('game-state', { view: views[index] });
      // Notify opponent that this player is back.
      notifyOpponent(room, index, 'reconnected');
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- game-action ---
  socket.on('game-action', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const room = await performAction(
        data.roomCode, data.playerToken, data.action, data.payload
      );
      broadcastViews(room);
      ack(cb, { success: true });
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- rematch ---
  socket.on('rematch', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const { room, bothReady } = await rematchRoom(data.roomCode, data.playerToken);

      if (bothReady) {
        // Both players agreed — broadcast fresh game state.
        broadcastViews(room);
        ack(cb, { success: true, started: true });
      } else {
        // One player has voted — notify opponent of the vote.
        const { index } = authenticate(data.roomCode, data.playerToken);
        notifyOpponent(room, index, 'rematch-vote');
        // Update own view to reflect the vote.
        const views = getViews(room);
        socket.emit('game-state', { view: views[index] });
        ack(cb, { success: true, waiting: true });
      }
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- leave-room ---
  socket.on('leave-room', async (data = {}, cb) => {
    try {
      checkRate(socket.id);
      const { room, leaverIndex } = await leaveRoom(data.roomCode, data.playerToken);
      // Notify the opponent.
      notifyOpponent(room, leaverIndex, 'left');
      ack(cb, { success: true });
    } catch (e) {
      ack(cb, { success: false, message: e.message });
    }
  });

  // --- disconnect (network drop) ---
  socket.on('disconnect', async () => {
    try {
      rateLimits.delete(socket.id);
      const room = await disconnectSocket(socket.id);
      if (room) {
        const leaverIndex = room.players.findIndex(p => p.socketId === null &&
          room.players.some((p2, i2) => i2 !== room.players.indexOf(p) && p2.socketId !== null));
        // Simpler: find which player just disconnected by exclusion.
        const senderIndex = room.players.findIndex(
          p => !p.socketId && room.players.some(p2 => p2.socketId)
        );
        if (senderIndex >= 0) {
          notifyOpponent(room, senderIndex, 'disconnected');
        } else {
          // Both disconnected — just log.
        }
      }
    } catch (e) {
      console.error('disconnect handler error:', e.message);
    }
  });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT || 3000);

// Clean up stale rooms every hour.
setInterval(() => cleanupFinishedRooms(24).catch(console.error), 3_600_000);

initStore()
  .then(restoreRooms)
  .then(() =>
    server.listen(port, '0.0.0.0', () =>
      console.log(`Private Rummy server listening on port ${port}`)
    )
  )
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
