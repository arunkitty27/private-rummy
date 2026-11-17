/**
 * engine.js — Private Rummy game engine
 *
 * Deck: 53 cards (52 standard + 1 printed joker). Single-deck, as per README.
 * Wild rank: determined by the indicator card popped from the top of the shuffled deck.
 *   - If the indicator is the printed joker, the wild rank is Ace.
 *   - The indicator card is removed from play (not in stock, not in hands).
 * Pure sequence: a run of 3+ same-suit natural cards with NO joker of any kind.
 * Impure sequence: a run of 3+ same-suit cards where jokers may fill gaps.
 * Set: 3 or 4 cards of the same rank, different suits (jokers may substitute).
 * Declaration: requires all 13 remaining cards (after final discard) to be partitioned
 *   into valid groups, with AT LEAST ONE pure sequence present.
 * Invalid declaration: rejected; player may retry (no penalty in this version).
 * Stock exhaustion: when the closed deck is empty, the discard pile (minus the top card)
 *   is reshuffled and becomes the new stock.
 */

import { createDeck, shuffle, rankValue } from './cards.js';
import { validateDeclaration } from './validate.js';

// ---------------------------------------------------------------------------
// startGame — called when both players are present
// ---------------------------------------------------------------------------
export function startGame(room) {
  const deck = shuffle(createDeck());

  // Pop the top card as the wild-rank indicator. This card is removed from play.
  const indicator = deck.pop();
  const wildRank = indicator.rank === 'JOKER' ? 'A' : indicator.rank;

  // Deal 13 cards to each player.
  const hands = [deck.splice(0, 13), deck.splice(0, 13)];

  // Top of remaining deck becomes the first discard.
  const discard = [deck.pop()];

  room.game = {
    status: 'playing',
    hands,
    stock: deck,
    discard,
    wildRank,
    wildCard: { ...indicator }, // Stored for display; never re-enters play.
    turn: 0,         // Player 0 goes first.
    phase: 'draw',
    winner: null,
    scores: null,    // { [playerIndex]: points } — set after a valid declaration.
    lastAction: 'Game started — Player 1 draws first.',
  };
  room.status = 'playing';
  room.rematchVotes = {};
  return room.game;
}

// ---------------------------------------------------------------------------
// rematchGame — resets for a new game; loser of the previous game goes first.
// ---------------------------------------------------------------------------
export function rematchGame(room) {
  const deck = shuffle(createDeck());
  const indicator = deck.pop();
  const wildRank = indicator.rank === 'JOKER' ? 'A' : indicator.rank;
  const hands = [deck.splice(0, 13), deck.splice(0, 13)];
  const discard = [deck.pop()];

  // The loser of the previous game goes first (or player 0 if no previous winner).
  const previousWinner = room.game ? room.game.winner : null;
  const firstTurn = previousWinner !== null ? (1 - previousWinner) : 0;

  room.game = {
    status: 'playing',
    hands,
    stock: deck,
    discard,
    wildRank,
    wildCard: { ...indicator },
    turn: firstTurn,
    phase: 'draw',
    winner: null,
    scores: null,
    lastAction: `New game! ${room.players[firstTurn].name} draws first.`,
  };
  room.status = 'playing';
  room.rematchVotes = {};
  return room.game;
}

// ---------------------------------------------------------------------------
// playerView — returns a sanitised, player-specific game state.
// NEVER exposes the opponent's hand cards.
// ---------------------------------------------------------------------------
export function playerView(room, playerIndex) {
  // Before game starts (waiting for second player).
  if (!room.game) {
    return {
      roomCode: room.code,
      status: room.status,
      players: room.players.map(p => ({ name: p.name, connected: p.socketId !== null })),
    };
  }

  const g = room.game;
  const oppIndex = 1 - playerIndex;

  return {
    roomCode: room.code,
    status: g.status,
    players: room.players.map((p, i) => ({
      name: p.name,
      isYou: i === playerIndex,
      connected: p.socketId !== null,
    })),

    // This player's own hand — full card data.
    hand: g.hands[playerIndex].map(c => ({ ...c })),

    // Opponent's card COUNT only — never card data.
    opponentCardCount: g.hands[oppIndex].length,

    // Shared visible state.
    stockCount: g.stock.length,
    discardTop: g.discard.length > 0 ? { ...g.discard[g.discard.length - 1] } : null,
    discardCount: g.discard.length,
    wildRank: g.wildRank,
    wildCard: { ...g.wildCard },

    // Turn / phase.
    turn: g.turn,
    yourTurn: g.turn === playerIndex,
    phase: g.phase,

    // Result.
    winner: g.winner,
    youWon: g.winner === playerIndex,
    lastAction: g.lastAction,

    // Scores (set after game ends): { you: points, opponent: points }.
    scores: g.scores
      ? { you: g.scores[playerIndex] ?? 0, opponent: g.scores[oppIndex] ?? 0 }
      : null,

    // Rematch votes (set after game ends): { you: bool, opponent: bool }.
    rematchVotes: room.rematchVotes
      ? {
          you: !!(room.rematchVotes[playerIndex]),
          opponent: !!(room.rematchVotes[oppIndex]),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// drawCard — draw one card from the closed stock or the open discard pile.
// ---------------------------------------------------------------------------
export function drawCard(room, playerIndex, source) {
  const g = requireTurn(room, playerIndex, 'draw');
  let card;

  if (source === 'stock') {
    // If the stock is empty, reshuffle the discard pile (minus the top card).
    if (g.stock.length === 0) {
      if (g.discard.length <= 1) {
        throw new Error('No cards remain to draw. The game is a stalemate.');
      }
      const topCard = g.discard[g.discard.length - 1];
      const toShuffle = g.discard.slice(0, -1);
      g.stock = shuffle(toShuffle);
      g.discard = [topCard];
      g.lastAction = 'Closed deck reshuffled from discard pile.';
    }
    card = g.stock.pop();
  } else if (source === 'discard') {
    if (g.discard.length === 0) throw new Error('The discard pile is empty.');
    card = g.discard.pop();
  } else {
    throw new Error('source must be "stock" or "discard".');
  }

  g.hands[playerIndex].push(card);
  g.phase = 'discard';
  g.lastAction = `${room.players[playerIndex].name} drew from the ${source} pile.`;
}

// ---------------------------------------------------------------------------
// discardCard — discard one card from the player's hand.
// ---------------------------------------------------------------------------
export function discardCard(room, playerIndex, cardId) {
  const g = requireTurn(room, playerIndex, 'discard');
  const idx = g.hands[playerIndex].findIndex(c => c.id === cardId);
  if (idx < 0) throw new Error('That card is not in your hand.');
  const [card] = g.hands[playerIndex].splice(idx, 1);
  g.discard.push(card);
  g.phase = 'draw';
  g.turn = 1 - playerIndex;
  g.lastAction = `${room.players[playerIndex].name} discarded a card.`;
}

// ---------------------------------------------------------------------------
// declareWin — attempt a winning declaration.
// The player selects the card to discard as their final discard. The remaining
// 13 cards are validated. If invalid, the action is rejected and the player
// can retry (no penalty applied in this version).
// ---------------------------------------------------------------------------
export function declareWin(room, playerIndex, finalDiscardId) {
  const g = room.game;
  if (!g || g.status !== 'playing') throw new Error('No active game.');
  if (g.turn !== playerIndex || g.phase !== 'discard') {
    throw new Error('Draw a card before declaring.');
  }

  const hand = g.hands[playerIndex];
  const discardIdx = hand.findIndex(c => c.id === finalDiscardId);
  if (discardIdx < 0) throw new Error('Select the card you want to discard for your declaration.');

  const remaining = hand.filter((_, i) => i !== discardIdx);
  const result = validateDeclaration(remaining, g.wildRank);

  // Invalid declaration: reject and let player retry (no penalty).
  if (!result.valid) {
    throw new Error(`Invalid declaration: ${result.reason}`);
  }

  // Valid declaration: apply the final discard, record winner, compute scores.
  const [discarded] = hand.splice(discardIdx, 1);
  g.discard.push(discarded);

  g.status = 'finished';
  g.winner = playerIndex;
  room.status = 'finished';

  const loserIndex = 1 - playerIndex;
  const loserPoints = pointsForHand(g.hands[loserIndex], g.wildRank);
  g.scores = {
    [playerIndex]: 0,          // Winner scores 0 points.
    [loserIndex]: loserPoints, // Loser scores their unmelded card points.
  };

  g.lastAction = `${room.players[playerIndex].name} won! ${room.players[loserIndex].name} has ${loserPoints} points.`;
}

// ---------------------------------------------------------------------------
// pointsForHand — compute penalty points for unmelded cards in a hand.
// Jokers (printed or wild-rank) score 0. Face/pip cards score min(face, 10).
// ---------------------------------------------------------------------------
export function pointsForHand(hand, wildRank) {
  return hand.reduce((sum, c) => {
    if (c.printedJoker || c.rank === wildRank) return sum;
    const v = rankValue(c.rank);
    return sum + (v >= 10 ? 10 : v);
  }, 0);
}

// ---------------------------------------------------------------------------
// requireTurn — guard: ensure it is this player's turn and the right phase.
// ---------------------------------------------------------------------------
function requireTurn(room, playerIndex, phase) {
  const g = room.game;
  if (!g || g.status !== 'playing') throw new Error('No active game in progress.');
  if (g.turn !== playerIndex) throw new Error('It is not your turn.');
  if (g.phase !== phase) {
    throw new Error(phase === 'draw' ? 'Discard a card first.' : 'Draw a card first.');
  }
  return g;
}
