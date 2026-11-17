/**
 * rooms.test.js — Tests for room lifecycle, multiplayer rules, and security.
 *
 * Uses mock sockets so no real network is needed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoom,
  joinRoom,
  authenticate,
  resumeRoom,
  performAction,
  getViews,
  disconnectSocket,
  rematchRoom,
  leaveRoom,
  _rooms,
} from '../src/rooms.js';

// ---------------------------------------------------------------------------
// Mock socket factory
// ---------------------------------------------------------------------------
let _socketCounter = 0;
function mockSocket() {
  const id = `mock-socket-${++_socketCounter}`;
  return { id, _rooms: new Set(), join(room) { this._rooms.add(room); } };
}

// ---------------------------------------------------------------------------
// 1. Room creation
// ---------------------------------------------------------------------------
test('createRoom returns a room code, player token, and view', async () => {
  const socket = mockSocket();
  const result = await createRoom('Alice', socket);
  assert.ok(result.roomCode, 'Missing roomCode');
  assert.ok(result.playerToken, 'Missing playerToken');
  assert.ok(result.view, 'Missing view');
  assert.equal(result.view.status, 'waiting');
});

test('createRoom generates a 6-character uppercase code', async () => {
  const socket = mockSocket();
  const result = await createRoom('Alice', socket);
  assert.match(result.roomCode, /^[A-Z2-9]{6}$/);
});

test('createRoom adds socket to room channel', async () => {
  const socket = mockSocket();
  const result = await createRoom('Alice', socket);
  assert.ok(socket._rooms.has(result.roomCode));
});

// ---------------------------------------------------------------------------
// 2. Room joining
// ---------------------------------------------------------------------------
test('joinRoom succeeds for a valid room code', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  const { room, playerToken } = await joinRoom(roomCode, 'Bob', s2);
  assert.ok(playerToken, 'Missing token for joiner');
  assert.equal(room.players.length, 2);
  assert.equal(room.status, 'playing');
});

test('joinRoom starts the game immediately', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  const { room } = await joinRoom(roomCode, 'Bob', s2);
  assert.ok(room.game !== null, 'Game did not start');
  assert.equal(room.game.status, 'playing');
});

test('joinRoom rejects if room not found', async () => {
  const s = mockSocket();
  await assert.rejects(() => joinRoom('ZZZZZZ', 'Eve', s), /not found/i);
});

test('joinRoom rejects a third player', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const s3 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  await joinRoom(roomCode, 'Bob', s2);
  await assert.rejects(() => joinRoom(roomCode, 'Eve', s3), /no longer accepting/i);
});

test('joinRoom rejects if room is already in playing state', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const s3 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  await joinRoom(roomCode, 'Bob', s2);
  await assert.rejects(() => joinRoom(roomCode, 'Eve', s3));
});

// ---------------------------------------------------------------------------
// 3. Authentication
// ---------------------------------------------------------------------------
test('authenticate succeeds with correct token', async () => {
  const s = mockSocket();
  const { roomCode, playerToken } = await createRoom('Alice', s);
  const { index } = authenticate(roomCode, playerToken);
  assert.equal(index, 0);
});

test('authenticate throws with wrong token', async () => {
  const s = mockSocket();
  const { roomCode } = await createRoom('Alice', s);
  assert.throws(() => authenticate(roomCode, 'bad-token'), /invalid player session/i);
});

test('authenticate throws for non-existent room', () => {
  assert.throws(() => authenticate('NOROOM', 'any-token'), /not found/i);
});

// ---------------------------------------------------------------------------
// 4. performAction — turn enforcement
// ---------------------------------------------------------------------------
async function setupGame() {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const { roomCode, playerToken: token0 } = await createRoom('Alice', s1);
  const { playerToken: token1 } = await joinRoom(roomCode, 'Bob', s2);
  return { roomCode, token0, token1 };
}

test('performAction: draw from stock succeeds on correct turn', async () => {
  const { roomCode, token0 } = await setupGame();
  await assert.doesNotReject(() =>
    performAction(roomCode, token0, 'draw', { source: 'stock' })
  );
});

test('performAction: out-of-turn draw is rejected', async () => {
  const { roomCode, token1 } = await setupGame();
  await assert.rejects(() =>
    performAction(roomCode, token1, 'draw', { source: 'stock' }),
    /not your turn/i
  );
});

test('performAction: cannot draw twice in a row', async () => {
  const { roomCode, token0 } = await setupGame();
  await performAction(roomCode, token0, 'draw', { source: 'stock' });
  await assert.rejects(() =>
    performAction(roomCode, token0, 'draw', { source: 'stock' }),
    /discard a card first/i
  );
});

test('performAction: cannot discard a card not in hand', async () => {
  const { roomCode, token0 } = await setupGame();
  await performAction(roomCode, token0, 'draw', { source: 'stock' });
  await assert.rejects(() =>
    performAction(roomCode, token0, 'discard', { cardId: 'not-my-card' }),
    /not in your hand/i
  );
});

test('performAction: unknown action is rejected', async () => {
  const { roomCode, token0 } = await setupGame();
  await assert.rejects(() =>
    performAction(roomCode, token0, 'cheat', {}),
    /unknown action/i
  );
});

test('performAction: wrong token is rejected', async () => {
  const { roomCode } = await setupGame();
  await assert.rejects(() =>
    performAction(roomCode, 'fake-token', 'draw', { source: 'stock' }),
    /invalid player session/i
  );
});

// ---------------------------------------------------------------------------
// 5. Hidden card protection — CRITICAL SECURITY TEST
// ---------------------------------------------------------------------------
test('getViews: player 0 view does not expose player 1 cards', async () => {
  const { roomCode, token0, token1 } = await setupGame();
  const { room } = authenticate(roomCode, token0);
  const views = getViews(room);

  const p1CardIds = new Set(views[1].hand.map(c => c.id));
  const view0Str = JSON.stringify(views[0]);

  for (const id of p1CardIds) {
    assert.ok(!view0Str.includes(id), `Player 1 card ${id} leaked into player 0's view!`);
  }
});

test('getViews: player 1 view does not expose player 0 cards', async () => {
  const { roomCode, token0 } = await setupGame();
  const { room } = authenticate(roomCode, token0);
  const views = getViews(room);

  const p0CardIds = new Set(views[0].hand.map(c => c.id));
  const view1Str = JSON.stringify(views[1]);

  for (const id of p0CardIds) {
    assert.ok(!view1Str.includes(id), `Player 0 card ${id} leaked into player 1's view!`);
  }
});

test('getViews: opponent card count is shown but not cards', async () => {
  const { roomCode, token0 } = await setupGame();
  const { room } = authenticate(roomCode, token0);
  const views = getViews(room);

  assert.equal(views[0].opponentCardCount, 13);
  assert.ok(!('opponentHand' in views[0]), 'opponentHand should not exist in view');
});

// ---------------------------------------------------------------------------
// 6. Reconnection
// ---------------------------------------------------------------------------
test('resumeRoom restores player session', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const { roomCode, playerToken: token0 } = await createRoom('Alice', s1);
  await joinRoom(roomCode, 'Bob', s2);

  // Simulate disconnect then reconnect with new socket.
  const s1b = mockSocket();
  const { room, index } = await resumeRoom(roomCode, token0, s1b);
  assert.equal(index, 0);
  assert.equal(room.players[0].socketId, s1b.id);
});

test('resumeRoom with wrong token is rejected', async () => {
  const s1 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  const s2 = mockSocket();
  await assert.rejects(() => resumeRoom(roomCode, 'wrong-token', s2), /invalid player session/i);
});

// ---------------------------------------------------------------------------
// 7. Disconnect
// ---------------------------------------------------------------------------
test('disconnectSocket marks player as offline', async () => {
  const s1 = mockSocket();
  const s2 = mockSocket();
  const { roomCode } = await createRoom('Alice', s1);
  await joinRoom(roomCode, 'Bob', s2);
  const { room } = authenticate(roomCode, _rooms.get(roomCode).players[0].token);
  assert.ok(room.players[0].socketId !== null);
  await disconnectSocket(s1.id);
  assert.equal(room.players[0].socketId, null);
});

// ---------------------------------------------------------------------------
// 8. Rematch
// ---------------------------------------------------------------------------
test('rematchRoom: single vote does not restart game', async () => {
  const { roomCode, token0 } = await setupGame();
  const { room } = authenticate(roomCode, token0);
  room.status = 'finished';
  if (room.game) room.game.status = 'finished';
  if (room.game) room.game.winner = 1;
  const { bothReady } = await rematchRoom(roomCode, token0);
  assert.equal(bothReady, false);
  assert.equal(room.status, 'finished');
});

test('rematchRoom: both votes restart the game', async () => {
  const { roomCode, token0, token1 } = await setupGame();
  const { room } = authenticate(roomCode, token0);
  room.status = 'finished';
  if (room.game) { room.game.status = 'finished'; room.game.winner = 1; }
  await rematchRoom(roomCode, token0);
  const { bothReady } = await rematchRoom(roomCode, token1);
  assert.equal(bothReady, true);
  assert.equal(room.status, 'playing');
  assert.equal(room.game.winner, null);
});

// ---------------------------------------------------------------------------
// 9. Leave room
// ---------------------------------------------------------------------------
test('leaveRoom marks room as abandoned', async () => {
  const { roomCode, token0 } = await setupGame();
  const { room, leaverIndex } = await leaveRoom(roomCode, token0);
  assert.equal(room.status, 'abandoned');
  assert.equal(leaverIndex, 0);
});
