/**
 * validate.js — Declaration validator for Indian Rummy
 *
 * HOW isWild IS PROPAGATED:
 *   validateDeclaration() sets `isWild` on every card via:
 *     const cards = hand.map(c => ({ ...c, isWild: isJoker(c, wildRank) }));
 *   All internal helpers (isPureSequence, isSequence, isSet) receive these
 *   annotated cards, so `c.isWild` is always defined when they check it.
 *
 * PURE SEQUENCE:
 *   - Minimum 3 cards, all same suit, consecutive ranks.
 *   - NO card may be a printed joker OR a wild-rank card.
 *   - Ace may be used as low (A-2-3) or high (Q-K-A).
 *
 * IMPURE SEQUENCE:
 *   - Minimum 3 cards, same suit for natural cards.
 *   - Printed joker / wild-rank cards may fill rank gaps.
 *   - Total span of natural cards + wildcards must cover the gap.
 *
 * SET:
 *   - 3 or 4 cards of the same rank, each in a different suit.
 *   - Printed joker / wild-rank cards may substitute.
 *
 * DECLARATION:
 *   - Exactly 13 cards (the final discard is NOT included; engine handles that).
 *   - Must be partitioned into valid groups (each card in exactly one group).
 *   - At least one group must be a pure sequence.
 */

import { rankValue } from './cards.js';

// A card is a joker (wild) if it is the printed joker or its rank equals wildRank.
function isJoker(card, wildRank) {
  return card.printedJoker || card.rank === wildRank;
}

// ---------------------------------------------------------------------------
// isPureSequence — no joker of any kind allowed
// ---------------------------------------------------------------------------
function isPureSequence(cards) {
  if (cards.length < 3) return false;
  // Reject groups containing ANY printed joker OR wild-rank card.
  // `c.printedJoker` is on the original card; `c.isWild` was set by validateDeclaration.
  if (cards.some(c => c.printedJoker || c.isWild)) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  const values = cards.map(c => rankValue(c.rank)).sort((a, b) => a - b);
  // No duplicate ranks within a sequence.
  if (new Set(values).size !== values.length) return false;
  const isConsecutive = arr => arr.every((v, i) => i === 0 || v === arr[i - 1] + 1);
  if (isConsecutive(values)) return true;
  // Ace may be high: Q(12)-K(13)-A(14).
  const highAce = values.map(v => (v === 1 ? 14 : v)).sort((a, b) => a - b);
  return isConsecutive(highAce);
}

// ---------------------------------------------------------------------------
// isSequence — impure sequence (jokers may fill gaps)
// ---------------------------------------------------------------------------
function isSequence(cards) {
  if (cards.length < 3) return false;
  const wilds = cards.filter(c => c.isWild).length;
  const naturals = cards.filter(c => !c.isWild);

  // All-joker groups are technically valid impure sequences but not pure.
  if (naturals.length === 0) return true;

  // All natural cards must share the same suit.
  if (!naturals.every(c => c.suit === naturals[0].suit)) return false;

  const values = naturals.map(c => rankValue(c.rank)).sort((a, b) => a - b);
  // No duplicate ranks among natural cards.
  if (new Set(values).size !== values.length) return false;

  // Check if the wilds can bridge the gap in rank span.
  const fits = vals => {
    const span = vals[vals.length - 1] - vals[0] + 1;
    const gaps = span - vals.length;      // Rank positions not covered by naturals.
    return gaps <= wilds && span <= cards.length;
  };

  if (fits(values)) return true;
  const highAce = values.map(v => (v === 1 ? 14 : v)).sort((a, b) => a - b);
  return fits(highAce);
}

// ---------------------------------------------------------------------------
// isSet — same rank, different suits (3 or 4 cards)
// ---------------------------------------------------------------------------
function isSet(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  const naturals = cards.filter(c => !c.isWild);
  if (naturals.length === 0) return true;
  const rank = naturals[0].rank;
  // All naturals must have the same rank, and each must have a unique suit.
  return (
    naturals.every(c => c.rank === rank) &&
    new Set(naturals.map(c => c.suit)).size === naturals.length
  );
}

// ---------------------------------------------------------------------------
// validateDeclaration — entry point for checking a winning hand
// ---------------------------------------------------------------------------
export function validateDeclaration(hand, wildRank) {
  if (!Array.isArray(hand) || hand.length !== 13) {
    return { valid: false, reason: 'A declaration must contain exactly 13 cards.' };
  }

  // Annotate every card with isWild. This is what all helpers read.
  const cards = hand.map(c => ({ ...c, isWild: isJoker(c, wildRank) }));
  const n = cards.length;

  // Build a list of valid candidate groups (all bitmask subsets of size 3–4,
  // or any size ≥ 3 that forms a sequence; we cap at deck-sensible sizes).
  const candidates = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const count = popcount(mask);
    if (count < 3 || count > 7) continue; // No valid Indian Rummy group has > 7 cards.
    const group = cards.filter((_, i) => mask & (1 << i));
    const pure = isPureSequence(group);
    if (pure || isSequence(group) || isSet(group)) {
      candidates.push({ mask, pure });
    }
  }

  // Index candidates by the lowest set bit for fast access.
  const byBit = Array.from({ length: n }, () => []);
  for (const c of candidates) {
    for (let i = 0; i < n; i++) {
      if (c.mask & (1 << i)) byBit[i].push(c);
    }
  }

  // Backtracking solver: can we partition all 13 cards into valid groups
  // where at least one group is a pure sequence?
  const full = (1 << n) - 1;
  const memo = new Map();

  function solve(remaining, hasPure) {
    if (remaining === 0) return hasPure; // All cards accounted for; check pure.
    const key = `${remaining}:${hasPure ? 1 : 0}`;
    if (memo.has(key)) return memo.get(key);

    // Always try to place the lowest remaining card first (branch on it).
    let first = 0;
    while (!(remaining & (1 << first))) first++;

    for (const group of byBit[first]) {
      if ((group.mask & remaining) !== group.mask) continue; // Cards not all available.
      if (solve(remaining ^ group.mask, hasPure || group.pure)) {
        memo.set(key, true);
        return true;
      }
    }
    memo.set(key, false);
    return false;
  }

  const valid = solve(full, false);
  return valid
    ? {
        valid: true,
        reason: 'Valid declaration: all 13 cards form valid groups including at least one pure sequence.',
      }
    : {
        valid: false,
        reason:
          'Invalid declaration. All 13 cards must form valid groups (sequences or sets) with at least one pure sequence containing no joker.',
      };
}

// Count set bits (Brian Kernighan).
function popcount(n) {
  let c = 0;
  while (n) { n &= n - 1; c++; }
  return c;
}
