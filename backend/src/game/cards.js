/**
 * cards.js — Deck creation and utilities
 *
 * DECK CONFIGURATION (53-card single-deck, per project specification):
 *   - 52 standard cards: 4 suits × 13 ranks.
 *   - 1 printed joker (suit='J', rank='JOKER', printedJoker=true).
 *   - The printed joker may substitute for any card in an impure sequence or set.
 *   - Total: 53 cards before the wild-rank indicator is removed by the engine.
 *
 * WILD RANK:
 *   - The engine pops the top card of the shuffled deck as the indicator.
 *   - All cards of that rank (across all suits) become wild-rank jokers.
 *   - If the printed joker is selected as the indicator, Ace becomes the wild rank.
 *   - The indicator card itself is removed from play (not in stock or hands).
 *
 * JOKER TYPES:
 *   1. Printed joker  — the single physical joker card (printedJoker: true).
 *   2. Wild-rank card — any suited card whose rank equals the selected wild rank.
 *   Both types score 0 penalty points and may not be part of a pure sequence.
 *
 * To use two decks or modify joker count, change createDeck() here and
 * update the dealing logic in engine.js accordingly.
 */

import { randomInt, randomUUID } from 'node:crypto';

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Create a fresh 53-card deck (unshuffled). */
export function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: randomUUID(), suit, rank, printedJoker: false });
    }
  }
  // One printed joker.
  cards.push({ id: randomUUID(), suit: 'J', rank: 'JOKER', printedJoker: true });
  return cards;
}

/** Cryptographically secure Fisher-Yates shuffle. Returns a new array. */
export function shuffle(cards) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Numeric rank value used for sequence detection and point scoring.
 * Ace = 1 (low); may also be treated as 14 (high) in sequence checks.
 * Face cards (J, Q, K) = 11, 12, 13 respectively, capped at 10 for scoring.
 */
export function rankValue(rank) {
  if (rank === 'A') return 1;
  const idx = RANKS.indexOf(rank);
  return idx + 1; // A=1, 2=2, ..., K=13
}

/** Human-readable label for display / logging. */
export function cardLabel(card) {
  if (card.printedJoker) return '🃏';
  const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit] ?? card.suit;
  return `${card.rank}${suitSymbol}`;
}
