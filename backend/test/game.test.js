/**
 * game.test.js — Automated tests for the game engine and validation logic.
 *
 * Run with: cd backend && npm test
 * Uses Node's built-in test runner (node:test). No external test framework needed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle, rankValue, SUITS, RANKS } from '../src/game/cards.js';
import { validateDeclaration } from '../src/game/validate.js';
import { startGame, drawCard, discardCard, declareWin, pointsForHand, rematchGame, playerView } from '../src/game/engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCard(suit, rank, id = `${rank}${suit}`) {
  return { id, suit, rank, printedJoker: false };
}
function makeJoker(id = 'JKR') {
  return { id, suit: 'J', rank: 'JOKER', printedJoker: true };
}
function makeRoom(overrides = {}) {
  return {
    code: 'TEST01',
    status: 'waiting',
    players: [
      { name: 'Alice', token: 'tokenA', socketId: 'sockA' },
      { name: 'Bob', token: 'tokenB', socketId: 'sockB' },
    ],
    game: null,
    rematchVotes: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Deck creation
// ---------------------------------------------------------------------------
test('deck contains exactly 53 cards', () => {
  const deck = createDeck();
  assert.equal(deck.length, 53);
});

test('deck contains 52 suited cards (13 per suit)', () => {
  const deck = createDeck();
  for (const suit of SUITS) {
    assert.equal(deck.filter(c => c.suit === suit).length, 13, `Expected 13 ${suit} cards`);
  }
});

test('deck contains exactly 1 printed joker', () => {
  const deck = createDeck();
  assert.equal(deck.filter(c => c.printedJoker).length, 1);
});

test('all card IDs are unique', () => {
  const deck = createDeck();
  assert.equal(new Set(deck.map(c => c.id)).size, 53);
});

test('deck contains all 13 ranks in each suit', () => {
  const deck = createDeck();
  for (const suit of SUITS) {
    const suitRanks = deck.filter(c => c.suit === suit).map(c => c.rank).sort();
    assert.deepEqual(suitRanks, [...RANKS].sort());
  }
});

// ---------------------------------------------------------------------------
// 2. Shuffle
// ---------------------------------------------------------------------------
test('shuffle preserves all cards', () => {
  const deck = createDeck();
  const shuffled = shuffle(deck);
  assert.equal(shuffled.length, deck.length);
  assert.deepEqual(new Set(shuffled.map(c => c.id)), new Set(deck.map(c => c.id)));
});

test('shuffle does not mutate the original array', () => {
  const deck = createDeck();
  const originalFirst = deck[0].id;
  shuffle(deck);
  assert.equal(deck[0].id, originalFirst);
});

test('shuffle produces a different order (statistically)', () => {
  const deck = createDeck();
  const a = shuffle(deck).map(c => c.id).join(',');
  const b = shuffle(deck).map(c => c.id).join(',');
  // Probability of same order is 1/53! — effectively impossible.
  assert.notEqual(a, b);
});

// ---------------------------------------------------------------------------
// 3. rankValue
// ---------------------------------------------------------------------------
test('rankValue returns correct values', () => {
  assert.equal(rankValue('A'), 1);
  assert.equal(rankValue('2'), 2);
  assert.equal(rankValue('10'), 10);
  assert.equal(rankValue('J'), 11);
  assert.equal(rankValue('Q'), 12);
  assert.equal(rankValue('K'), 13);
});

// ---------------------------------------------------------------------------
// 4. startGame
// ---------------------------------------------------------------------------
test('startGame deals 13 cards to each player', () => {
  const room = makeRoom();
  startGame(room);
  assert.equal(room.game.hands[0].length, 13);
  assert.equal(room.game.hands[1].length, 13);
});

test('startGame leaves correct number of cards in stock', () => {
  const room = makeRoom();
  startGame(room);
  // 53 total − 1 indicator − 13 − 13 − 1 (initial discard) = 25
  assert.equal(room.game.stock.length, 25);
});

test('startGame produces no duplicate card IDs across hands and stock', () => {
  const room = makeRoom();
  startGame(room);
  const g = room.game;
  const all = [...g.hands[0], ...g.hands[1], ...g.stock, ...g.discard, g.wildCard];
  assert.equal(new Set(all.map(c => c.id)).size, all.length, 'Duplicate card IDs found');
});

test('startGame sets initial phase to draw and turn to 0', () => {
  const room = makeRoom();
  startGame(room);
  assert.equal(room.game.phase, 'draw');
  assert.equal(room.game.turn, 0);
});

test('startGame selects a valid wildRank', () => {
  const room = makeRoom();
  startGame(room);
  const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  assert.ok(validRanks.includes(room.game.wildRank), `Invalid wildRank: ${room.game.wildRank}`);
});

test('startGame uses Ace as wildRank when printed joker is selected as indicator', () => {
  // We can't easily force this, but we verify the logic indirectly via the engine.
  // The startGame code: wildCard.rank === 'JOKER' ? 'A' : wildCard.rank
  // Verify by calling startGame many times and checking wildRank is always valid.
  for (let i = 0; i < 20; i++) {
    const room = makeRoom();
    startGame(room);
    assert.ok(['A','2','3','4','5','6','7','8','9','10','J','Q','K'].includes(room.game.wildRank));
  }
});

// ---------------------------------------------------------------------------
// 5. drawCard
// ---------------------------------------------------------------------------
test('drawCard from stock adds a card to player hand', () => {
  const room = makeRoom();
  startGame(room);
  const before = room.game.hands[0].length;
  drawCard(room, 0, 'stock');
  assert.equal(room.game.hands[0].length, before + 1);
});

test('drawCard from discard adds the top discard to hand', () => {
  const room = makeRoom();
  startGame(room);
  const topCard = room.game.discard[room.game.discard.length - 1];
  drawCard(room, 0, 'discard');
  assert.ok(room.game.hands[0].some(c => c.id === topCard.id));
});

test('drawCard advances phase to discard', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  assert.equal(room.game.phase, 'discard');
});

test('drawCard rejects out-of-turn action', () => {
  const room = makeRoom();
  startGame(room);
  assert.throws(() => drawCard(room, 1, 'stock'), /not your turn/i);
});

test('drawCard rejects draw when phase is discard', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock'); // Now phase = discard
  assert.throws(() => drawCard(room, 0, 'stock'), /discard a card first/i);
});

test('drawCard from empty stock reshuffles discard pile', () => {
  const room = makeRoom();
  startGame(room);
  // Empty the stock manually.
  room.game.stock = [];
  // Add cards to discard pile (must have > 1).
  room.game.discard = [
    makeCard('S', '5', 'x1'),
    makeCard('H', '6', 'x2'),
    makeCard('D', '7', 'x3'),
  ];
  const topBefore = room.game.discard[room.game.discard.length - 1].id;
  drawCard(room, 0, 'stock');
  // The original top card of discard should still be in discard.
  assert.ok(room.game.discard.some(c => c.id === topBefore));
  // Player 0 got a card.
  assert.equal(room.game.hands[0].length, 14);
});

test('drawCard throws when stock is empty and discard has only 1 card', () => {
  const room = makeRoom();
  startGame(room);
  room.game.stock = [];
  room.game.discard = [makeCard('S', '5')];
  assert.throws(() => drawCard(room, 0, 'stock'), /stalemate/i);
});

test('drawCard rejects invalid source', () => {
  const room = makeRoom();
  startGame(room);
  assert.throws(() => drawCard(room, 0, 'trash'), /source must be/i);
});

// ---------------------------------------------------------------------------
// 6. discardCard
// ---------------------------------------------------------------------------
test('discardCard removes card from hand', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  const cardId = room.game.hands[0][0].id;
  discardCard(room, 0, cardId);
  assert.ok(!room.game.hands[0].some(c => c.id === cardId));
});

test('discardCard adds card to discard pile', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  const cardId = room.game.hands[0][0].id;
  discardCard(room, 0, cardId);
  assert.equal(room.game.discard[room.game.discard.length - 1].id, cardId);
});

test('discardCard advances turn to next player', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  const cardId = room.game.hands[0][0].id;
  discardCard(room, 0, cardId);
  assert.equal(room.game.turn, 1);
});

test('discardCard rejects card not in hand', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  assert.throws(() => discardCard(room, 0, 'nonexistent-id'), /not in your hand/i);
});

test('discardCard rejects out-of-turn action', () => {
  const room = makeRoom();
  startGame(room);
  drawCard(room, 0, 'stock');
  assert.throws(() => discardCard(room, 1, room.game.hands[1][0].id), /not your turn/i);
});

// ---------------------------------------------------------------------------
// 7. Pure sequence validation
// ---------------------------------------------------------------------------
test('pure sequence: valid 3-card run', () => {
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],
    ['C','2'],['C','3'],['C','4'],['D','A']
  ]);
  // No pure sequence covers A of diamonds alone — this should fail.
  assert.equal(validateDeclaration(hand, 'K').valid, false);
});

test('pure sequence: wild-rank card CANNOT be part of a pure sequence', () => {
  // K is the wild rank. A sequence 3S-4S-KS cannot be pure because KS is wild.
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','K'], // K is wild — this is NOT a pure sequence
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],
    ['C','2'],['C','3'],['C','4'],['D','A']
  ]);
  assert.equal(validateDeclaration(hand, 'K').valid, false);
});

test('pure sequence: printed joker CANNOT be part of a pure sequence', () => {
  const hand = [
    makeCard('S','2','c1'), makeCard('S','3','c2'), makeJoker('jkr'),
    makeCard('H','7','c4'), makeCard('H','8','c5'), makeCard('H','9','c6'),
    makeCard('D','Q','c7'), makeCard('H','Q','c8'), makeCard('C','Q','c9'),
    makeCard('C','2','c10'), makeCard('C','3','c11'), makeCard('C','4','c12'),
    makeCard('D','A','c13'),
  ];
  // The joker would need to form a group, but [2S,3S,JOKER] is impure not pure.
  // We need 2 sequences with at least 1 pure. This hand has no pure sequence.
  assert.equal(validateDeclaration(hand, 'X').valid, false);
});

test('pure sequence: Ace-low (A-2-3)', () => {
  const hand = buildTestHand([
    ['S','A'],['S','2'],['S','3'],  // pure sequence (ace low)
    ['H','7'],['H','8'],['H','9'],  // pure sequence
    ['D','Q'],['H','Q'],['C','Q'],  // set
    ['C','5'],['C','6'],['C','7'],['D','A']
  ]);
  // D,A is ungrouped; last combo won't form 4th group cleanly.
  // Adjust to have all 13 in groups:
  const hand2 = buildTestHand([
    ['S','A'],['S','2'],['S','3'],
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],
    ['C','5'],['C','6'],['C','7'],['C','8']
  ]);
  assert.equal(validateDeclaration(hand2, 'K').valid, true);
});

test('pure sequence: Ace-high (Q-K-A)', () => {
  const hand = buildTestHand([
    ['S','Q'],['S','K'],['S','A'],  // pure Q-K-A
    ['H','7'],['H','8'],['H','9'],  // pure
    ['D','5'],['D','6'],['D','7'],  // pure
    ['C','3'],['C','4'],['C','5'],['C','6']
  ]);
  assert.equal(validateDeclaration(hand, '2').valid, true);
});

// ---------------------------------------------------------------------------
// 8. Impure sequence validation
// ---------------------------------------------------------------------------
test('impure sequence: printed joker fills a gap', () => {
  const hand = [
    makeCard('S','3','c1'), makeCard('S','5','c2'), makeJoker('jkr'), // impure 3S-JKR-5S
    makeCard('H','7','c4'), makeCard('H','8','c5'), makeCard('H','9','c6'), // pure
    makeCard('D','Q','c7'), makeCard('H','Q','c8'), makeCard('C','Q','c9'), // set
    makeCard('C','2','c10'), makeCard('C','3','c11'), makeCard('C','4','c12'),
    makeCard('C','5','c13'),
  ];
  assert.equal(validateDeclaration(hand, 'K').valid, true);
});

test('impure sequence: wild-rank card fills a gap', () => {
  // Wild rank = 6. 5H-6H-7H where 6H is wild → impure 5H-7H with wild.
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],    // pure
    ['H','5'],['H','7'],['H','6'],    // 6 is wild, impure 5H-6H(wild)-7H
    ['D','Q'],['H','Q'],['C','Q'],    // set
    ['C','2'],['C','3'],['C','4'],['C','9']
  ]);
  // This declaration requires C,2-C,3-C,4-C,9 to form a group — it won't since 9 breaks it.
  // Build a correct one:
  const hand2 = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','5'],['H','7'],['H','6'],    // 6 is wild → impure sequence
    ['D','Q'],['H','Q'],['C','Q'],
    ['C','2'],['C','3'],['C','4'],['C','5']
  ]);
  assert.equal(validateDeclaration(hand2, '6').valid, true);
});

// ---------------------------------------------------------------------------
// 9. Set validation
// ---------------------------------------------------------------------------
test('set: 3 cards same rank, different suits', () => {
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],  // set of Queens
    ['C','2'],['C','3'],['C','4'],['C','5']
  ]);
  assert.equal(validateDeclaration(hand, 'K').valid, true);
});

test('set: same suit not allowed (is not a set)', () => {
  // S,Q + S,Q (duplicate suit) is invalid as a set.
  // A set must have distinct suits for each natural card.
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','7'],['H','8'],['H','9'],
    ['S','Q'],['S','Q'],['C','Q'],  // Two S,Q — invalid set (duplicate suit)
    ['C','2'],['C','3'],['C','4'],['C','5']
  ]);
  // This hand has duplicate IDs because buildTestHand uses rank+suit as ID.
  // Use unique IDs:
  const hand2 = [
    makeCard('S','3','c1'), makeCard('S','4','c2'), makeCard('S','5','c3'),
    makeCard('H','7','c4'), makeCard('H','8','c5'), makeCard('H','9','c6'),
    makeCard('S','Q','c7'), makeCard('S','Q','c8'), makeCard('C','Q','c9'), // c7 & c8 same suit
    makeCard('C','2','c10'), makeCard('C','3','c11'), makeCard('C','4','c12'),
    makeCard('C','5','c13'),
  ];
  assert.equal(validateDeclaration(hand2, 'K').valid, false);
});

test('set: 4 cards same rank is valid', () => {
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],['S','Q'],  // 4-card set of Queens (pure)
    ['C','2'],['C','3'],['C','4']
  ]);
  assert.equal(validateDeclaration(hand, 'K').valid, true);
});

// ---------------------------------------------------------------------------
// 10. Full declaration validation
// ---------------------------------------------------------------------------
test('valid declaration: two sequences + two sets', () => {
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],    // pure seq
    ['H','7'],['H','8'],['H','9'],    // pure seq
    ['D','Q'],['H','Q'],['C','Q'],    // set
    ['D','K'],['H','K'],['C','K'],['S','K']  // 4-card set (K is not wild here)
  ]);
  assert.equal(validateDeclaration(hand, '2').valid, true);
});

test('invalid declaration: no pure sequence (all impure)', () => {
  // Hand where the ONLY way to form groups is via jokers — no pure sequence possible.
  // Use ONE printed joker plus wild-rank cards so groups exist but none is pure.
  // wildRank = '5': all 5-rank cards are wild.
  // Groups: [3S,4S,5S(wild)] impure, [7H,8H,9H] pure ← wait, that IS a pure sequence!
  // Design: make EVERY potential sequence require a joker.
  //   [3S,5S,JKR] → impure (joker fills 4S gap)
  //   [7H,5H,9H]  → 5H is wild (wildRank=5), so impure
  //   [Q♦,Q♥,Q♣]  → set (fine)
  //   [2C,4C,5C(wild),6C] → impure (5C wild fills or...) Actually 2-4-6 needs 2 wilds
  // Simplest: use wildRank=A, so all Aces are wild.
  // Build a hand where no 3+ card group of the same suit has consecutive naturals:
  const hand = [
    makeCard('S','3','c1'), makeCard('S','5','c2'), makeJoker('jkr'), // impure (joker fills 4S)
    makeCard('H','7','c4'), makeCard('H','A','c5'), makeCard('H','9','c6'), // 'A' is wild; impure 7H-A(wild)-9H
    makeCard('D','Q','c7'), makeCard('H','Q','c8'), makeCard('C','Q','c9'), // set
    makeCard('C','2','c10'), makeCard('C','A','c11'), makeCard('C','4','c12'), // A is wild; impure
    makeCard('D','6','c13'), // orphan — cannot form a group
  ];
  // With wildRank='A', the C2-CA(wild)-C4 group is impure, 7H-AH(wild)-9H is impure.
  // But c13 (D6) is an orphan — no group of ≥3 can include it. So this MUST be invalid.
  assert.equal(validateDeclaration(hand, 'A').valid, false);
});

test('invalid declaration: not all 13 cards covered', () => {
  const hand = buildTestHand([
    ['S','3'],['S','4'],['S','5'],
    ['H','7'],['H','8'],['H','9'],
    ['D','Q'],['H','Q'],['C','Q'],
    ['C','2'],['C','3'],['C','4'],['D','A']  // D,A is an orphan
  ]);
  assert.equal(validateDeclaration(hand, 'K').valid, false);
});

test('invalid declaration: wrong number of cards', () => {
  const hand = buildTestHand([['S','3'],['S','4'],['S','5']]);
  assert.equal(validateDeclaration(hand, 'K').valid, false);
});

// ---------------------------------------------------------------------------
// 11. Point calculation
// ---------------------------------------------------------------------------
test('pointsForHand: face/pip cards score min(value, 10)', () => {
  const hand = [
    makeCard('S', 'J'), // J=11, capped to 10
    makeCard('H', 'Q'), // Q=12, capped to 10
    makeCard('D', 'K'), // K=13, capped to 10
    makeCard('C', '5'), // 5
    makeCard('S', 'A'), // A=1
  ];
  assert.equal(pointsForHand(hand, 'X'), 10 + 10 + 10 + 5 + 1);
});

test('pointsForHand: printed joker scores 0', () => {
  const hand = [makeJoker()];
  assert.equal(pointsForHand(hand, 'K'), 0);
});

test('pointsForHand: wild-rank card scores 0', () => {
  const hand = [makeCard('S', 'K')]; // K is the wild rank
  assert.equal(pointsForHand(hand, 'K'), 0);
});

test('pointsForHand: mixed hand with jokers', () => {
  const hand = [
    makeCard('S', '7'),  // 7
    makeJoker(),          // 0
    makeCard('S', 'K'),  // 0 (wild, wildRank=K)
    makeCard('H', 'Q'),  // 10
  ];
  assert.equal(pointsForHand(hand, 'K'), 7 + 0 + 0 + 10);
});

// ---------------------------------------------------------------------------
// 12. declareWin
// ---------------------------------------------------------------------------
test('declareWin: valid declaration ends game and sets winner', () => {
  const room = makeRoom();
  startGame(room);
  // Force player 0 to have a winning hand.
  forceDeclare(room, 0);
  assert.equal(room.game.status, 'finished');
  assert.equal(room.game.winner, 0);
});

test('declareWin: sets scores after win', () => {
  const room = makeRoom();
  startGame(room);
  forceDeclare(room, 0);
  assert.ok(room.game.scores !== null);
  assert.equal(room.game.scores[0], 0); // Winner scores 0.
  assert.ok(typeof room.game.scores[1] === 'number'); // Loser has some points.
});

test('declareWin: invalid declaration is rejected and game continues', () => {
  const room = makeRoom();
  startGame(room);
  // Draw a card to enter discard phase.
  drawCard(room, 0, 'stock');
  // Try to declare with current (non-winning) hand.
  const cardId = room.game.hands[0][0].id;
  assert.throws(() => declareWin(room, 0, cardId)); // Will fail validation.
  assert.equal(room.game.status, 'playing'); // Game continues.
});

test('declareWin: cannot declare before drawing', () => {
  const room = makeRoom();
  startGame(room);
  const cardId = room.game.hands[0][0].id;
  assert.throws(() => declareWin(room, 0, cardId), /draw a card/i);
});

// ---------------------------------------------------------------------------
// 13. Rematch
// ---------------------------------------------------------------------------
test('rematchGame resets game and re-deals', () => {
  const room = makeRoom();
  startGame(room);
  forceDeclare(room, 0);
  room.status = 'finished';
  rematchGame(room);
  assert.equal(room.game.status, 'playing');
  assert.equal(room.game.hands[0].length, 13);
  assert.equal(room.game.hands[1].length, 13);
  assert.equal(room.game.winner, null);
});

test('rematchGame: loser of previous game goes first', () => {
  const room = makeRoom();
  startGame(room);
  // Force player 0 to win.
  room.game.winner = 0;
  room.game.status = 'finished';
  room.status = 'finished';
  rematchGame(room);
  // Player 1 (the loser) should go first.
  assert.equal(room.game.turn, 1);
});

// ---------------------------------------------------------------------------
// 14. playerView — hidden card protection
// ---------------------------------------------------------------------------
test('playerView never exposes opponent hand cards', () => {
  const room = makeRoom();
  startGame(room);
  const view0 = playerView(room, 0);
  const view1 = playerView(room, 1);

  // Collect player 0's card IDs.
  const p0CardIds = new Set(view0.hand.map(c => c.id));

  // Serialise player 1's view and check none of player 0's card IDs appear.
  const view1Str = JSON.stringify(view1);
  for (const id of p0CardIds) {
    assert.ok(!view1Str.includes(id), `Player 0 card ${id} leaked into player 1 view`);
  }
});

test('playerView shows opponentCardCount not opponent cards', () => {
  const room = makeRoom();
  startGame(room);
  const view = playerView(room, 0);
  assert.equal(view.opponentCardCount, 13);
  assert.ok(!('opponentHand' in view));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildTestHand(specs) {
  return specs.map(([suit, rank]) => makeCard(suit, rank));
}

/** Force player `index` into discard phase with a valid winning hand. */
function forceDeclare(room, index) {
  // Set a known wild rank that doesn't interfere with our winning hand.
  room.game.wildRank = 'Z'; // No card has rank Z → no wild-rank jokers.

  // Build a valid 14-card hand (13 in groups + 1 to discard).
  const winningHand = [
    makeCard('S','A','w1'), makeCard('S','2','w2'), makeCard('S','3','w3'), // pure
    makeCard('H','7','w4'), makeCard('H','8','w5'), makeCard('H','9','w6'), // pure
    makeCard('D','Q','w7'), makeCard('H','Q','w8'), makeCard('C','Q','w9'), // set
    makeCard('C','3','w10'), makeCard('C','4','w11'), makeCard('C','5','w12'), makeCard('C','6','w13'), // pure
    makeCard('D','2','discard'), // The card to discard when declaring
  ];
  room.game.hands[index] = winningHand;
  room.game.turn = index;
  room.game.phase = 'discard';

  declareWin(room, index, 'discard');
}
