import { Card, Rank } from './types';
import { RANK_ORDER } from './constants';

export interface GroupEvaluation {
  type: 'pure_seq' | 'impure_seq' | 'set' | 'invalid';
  label: string;
  valid: boolean;
  color: string;
}

function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  const idx = RANK_ORDER.indexOf(rank);
  return idx + 1; // A=1, 2=2, ..., K=13
}

export function isCardWild(card: Card, wildRank: string): boolean {
  return card.printedJoker || card.rank === wildRank;
}

export function evaluateGroup(cards: Card[], wildRank: string): GroupEvaluation {
  if (cards.length === 0) {
    return { type: 'invalid', label: 'Empty', valid: false, color: '#777' };
  }
  if (cards.length < 3) {
    return { type: 'invalid', label: `${cards.length} cards`, valid: false, color: '#a0a0a0' };
  }

  const annotated = cards.map(c => ({
    ...c,
    isWild: isCardWild(c, wildRank),
  }));

  // 1. Pure sequence check (no jokers allowed, same suit, consecutive)
  if (isPureSeq(annotated)) {
    return { type: 'pure_seq', label: '★ Pure Seq', valid: true, color: '#52d18c' };
  }

  // 2. Impure sequence check (jokers allowed to bridge gaps, same suit for naturals)
  if (isImpureSeq(annotated)) {
    return { type: 'impure_seq', label: '✔ Sequence', valid: true, color: '#5dade2' };
  }

  // 3. Set check (3 or 4 cards, same rank, different suits)
  if (isCardSet(annotated)) {
    return { type: 'set', label: '✔ Set', valid: true, color: '#f5b041' };
  }

  return { type: 'invalid', label: 'Invalid', valid: false, color: '#e74c3c' };
}

function isPureSeq(cards: Array<Card & { isWild: boolean }>): boolean {
  if (cards.length < 3) return false;
  if (cards.some(c => c.printedJoker || c.isWild)) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  const values = cards.map(c => rankValue(c.rank)).sort((a, b) => a - b);
  if (new Set(values).size !== values.length) return false;
  const isConsecutive = (arr: number[]) => arr.every((v, i) => i === 0 || v === arr[i - 1] + 1);
  if (isConsecutive(values)) return true;
  // Ace high check (Q-K-A)
  const highAce = values.map(v => (v === 1 ? 14 : v)).sort((a, b) => a - b);
  return isConsecutive(highAce);
}

function isImpureSeq(cards: Array<Card & { isWild: boolean }>): boolean {
  if (cards.length < 3) return false;
  const wilds = cards.filter(c => c.isWild).length;
  const naturals = cards.filter(c => !c.isWild);

  if (naturals.length === 0) return true;
  if (!naturals.every(c => c.suit === naturals[0].suit)) return false;

  const values = naturals.map(c => rankValue(c.rank)).sort((a, b) => a - b);
  if (new Set(values).size !== values.length) return false;

  const fits = (vals: number[]) => {
    const span = vals[vals.length - 1] - vals[0] + 1;
    const gaps = span - vals.length;
    return gaps <= wilds && span <= cards.length;
  };

  if (fits(values)) return true;
  const highAce = values.map(v => (v === 1 ? 14 : v)).sort((a, b) => a - b);
  return fits(highAce);
}

function isCardSet(cards: Array<Card & { isWild: boolean }>): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const naturals = cards.filter(c => !c.isWild);
  if (naturals.length === 0) return true;
  const rank = naturals[0].rank;
  return (
    naturals.every(c => c.rank === rank) &&
    new Set(naturals.map(c => c.suit)).size === naturals.length
  );
}
