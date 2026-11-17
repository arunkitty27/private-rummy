// App-wide constants

export const SERVER_URL =
  (process.env.EXPO_PUBLIC_SERVER_URL as string | undefined) || 'http://localhost:3000';

export const STORAGE_KEY = 'rummy-session-v2';

/** Suit symbols for display */
export const SUIT_SYMBOLS: Record<string, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
  J: '★',
};

/** Red suits */
export const RED_SUITS = new Set(['H', 'D']);

/** Rank order for hand sorting */
export const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

/** Suit order for hand sorting */
export const SUIT_ORDER = ['S', 'H', 'D', 'C', 'J'];

// Design tokens
export const COLORS = {
  bg: '#062d22',
  bgDark: '#03180f',
  tableGreen: '#0c6041',
  tableBorder: '#36845f',
  panelBg: '#104534',
  panelBorder: '#28654d',
  gold: '#e4c77b',
  goldLight: '#f2d995',
  goldDim: '#d8c17f',
  textPrimary: '#fff5dc',
  textSecondary: '#a9c4b6',
  textMuted: '#658a79',
  textLabel: '#a7c4b3',
  inputBg: '#082f24',
  inputBorder: '#39745a',
  cardBg: '#fffdf5',
  cardBorder: '#e5dfcf',
  cardSelectedBorder: '#e6c56c',
  cardBack: '#1a5c40',
  cardBackAccent: '#154d35',
  red: '#c0392b',
  darkSuit: '#1a1a2e',
  error: '#ffb4a9',
  errorBg: '#542b29',
  success: '#52d18c',
  warning: '#d6a34b',
  jokerGold: '#e67e22',
};
