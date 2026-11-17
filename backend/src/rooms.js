/**
 * rooms.js — Room lifecycle management
 *
 * All game state is authoritative here. Clients send intents; this module
 * validates, mutates, and persists.
 */

import { randomInt, randomBytes } from 'node:crypto';
import { saveRoom, deleteRoom, loadSavedRooms } from './db/store.js';
import {
  startGame,
  rematchGame,
  playerView,
  drawCard,
  discardCard,
  declareWin,
} from './game/engine.js';

// In-memory map of active rooms. Restored from DB on server start.
const rooms = new Map();

// Room code alphabet: unambiguous characters only.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const makeToken = () => randomBytes(24).toString('base64url');

// ---------------------------------------------------------------------------
// Server startup — restore persisted rooms from PostgreSQL.
// ---------------------------------------------------------------------------
export async function restoreRooms() {
  const saved = await loadSavedRooms();
  for (const room of saved) {
    // All sockets are disconnected after a server restart.
    for (const player of room.players) player.socketId = null;
    if (!room.rematchVotes) room.rematchVotes = {};
    rooms.set(room.code, room);
  }
  if (saved.length) console.log(`Restored ${saved.length} active room(s) from database.`);
}

// ---------------------------------------------------------------------------
// createRoom — called by player 1.
// ---------------------------------------------------------------------------
export async function createRoom(name, socket) {
  let code;
  do { code = makeCode(); } while (rooms.has(code));

  const room = {
    code,
    status: 'waiting',
    players: [{ name, token: makeToken(), socketId: socket.id }],
    game: null,
    rematchVotes: {},
    createdAt: new Date().toISOString(),
  };

  rooms.set(code, room);
  socket.join(code);
  await saveRoom(room);

  return {
    roomCode: code,
    playerToken: room.players[0].token,
    view: playerView(room, 0),
  };
}

// ---------------------------------------------------------------------------
// joinRoom — called by player 2.
// ---------------------------------------------------------------------------
export async function joinRoom(codeInput, name, socket) {
  const code = String(codeInput || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found. Check the room code and try again.');
  if (room.status !== 'waiting' || room.players.length !== 1) {
    throw new Error('This room is no longer accepting players.');
  }

  const player = { name, token: makeToken(), socketId: socket.id };
  room.players.push(player);
  socket.join(code);
  startGame(room);
  await saveRoom(room);

  return { room, playerToken: player.token };
}

// ---------------------------------------------------------------------------
// authenticate — resolve room + player index from token.
// ---------------------------------------------------------------------------
export function authenticate(code, playerToken) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new Error('Room not found.');
  const index = room.players.findIndex(p => p.token === playerToken);
  if (index < 0) throw new Error('Invalid player session. Please re-join the room.');
  return { room, index };
}

// ---------------------------------------------------------------------------
// resumeRoom — reconnect a player (after disconnect / app restart).
// ---------------------------------------------------------------------------
export async function resumeRoom(code, playerToken, socket) {
  const { room, index } = authenticate(code, playerToken);
  room.players[index].socketId = socket.id;
  socket.join(room.code);
  await saveRoom(room);
  return { room, index };
}

// ---------------------------------------------------------------------------
// performAction — route a game action to the engine.
// All validation (turn ownership, phase, card ownership) is done server-side.
// ---------------------------------------------------------------------------
export async function performAction(code, playerToken, action, payload = {}) {
  const { room, index } = authenticate(code, playerToken);

  switch (action) {
    case 'draw':
      drawCard(room, index, payload.source);
      break;
    case 'discard':
      discardCard(room, index, payload.cardId);
      break;
    case 'declare':
      declareWin(room, index, payload.cardId);
      break;
    default:
      throw new Error(`Unknown action: "${action}".`);
  }

  await saveRoom(room);
  return room;
}

// ---------------------------------------------------------------------------
// rematchRoom — mutual-confirmation rematch.
// Records one vote; resets the game only when BOTH players have voted.
// ---------------------------------------------------------------------------
export async function rematchRoom(code, playerToken) {
  const { room, index } = authenticate(code, playerToken);
  if (room.status !== 'finished') throw new Error('The game has not ended yet.');

  if (!room.rematchVotes) room.rematchVotes = {};
  room.rematchVotes[index] = true;

  const bothReady =
    room.players.length === 2 &&
    room.rematchVotes[0] === true &&
    room.rematchVotes[1] === true;

  if (bothReady) {
    rematchGame(room);
  }

  await saveRoom(room);
  return { room, bothReady };
}

// ---------------------------------------------------------------------------
// leaveRoom — a player voluntarily leaves (or is ejected).
// ---------------------------------------------------------------------------
export async function leaveRoom(code, playerToken) {
  const { room, index } = authenticate(code, playerToken);
  room.status = 'abandoned';
  room.players[index].socketId = null;
  if (room.game) room.game.status = 'abandoned';
  await saveRoom(room);
  return { room, leaverIndex: index };
}

// ---------------------------------------------------------------------------
// getViews — build both player views without exposing opponent hands.
// ---------------------------------------------------------------------------
export function getViews(room) {
  return room.players.map((_, i) => playerView(room, i));
}

// ---------------------------------------------------------------------------
// disconnectSocket — mark a player as offline.
// ---------------------------------------------------------------------------
export async function disconnectSocket(socketId) {
  for (const room of rooms.values()) {
    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      player.socketId = null;
      await saveRoom(room);
      return room; // Return room so server can notify the opponent.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// cleanupFinishedRooms — remove old finished/abandoned rooms.
// Called periodically by server.js (every hour).
// ---------------------------------------------------------------------------
export async function cleanupFinishedRooms(maxAgeHours = 24) {
  const cutoff = Date.now() - maxAgeHours * 3_600_000;
  let removed = 0;
  for (const [code, room] of rooms) {
    const isStale =
      (room.status === 'finished' || room.status === 'abandoned') &&
      new Date(room.createdAt).getTime() < cutoff;
    if (isStale) {
      rooms.delete(code);
      await deleteRoom(code);
      removed++;
    }
  }
  if (removed > 0) console.log(`Cleaned up ${removed} stale room(s).`);
}

// Expose rooms map for testing purposes only.
export { rooms as _rooms };
