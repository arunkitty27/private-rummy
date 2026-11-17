// ============================================================
// All shared TypeScript types for the Private Rummy mobile app
// ============================================================

export type Suit = 'S' | 'H' | 'D' | 'C' | 'J';
export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  printedJoker: boolean;
}

export interface PlayerInfo {
  name: string;
  isYou?: boolean;
  connected?: boolean;
}

export interface Scores {
  you: number;
  opponent: number;
}

export interface RematchVotes {
  you: boolean;
  opponent: boolean;
}

/** Sanitised, player-specific game view received from the server. */
export interface GameView {
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  players: PlayerInfo[];
  hand?: Card[];
  opponentCardCount?: number;
  opponentHand?: Card[];
  stockCount?: number;
  discardTop?: Card | null;
  discardCount?: number;
  wildRank?: string;
  wildCard?: Card;
  turn?: number;
  yourTurn?: boolean;
  phase?: 'draw' | 'discard';
  winner?: number | null;
  youWon?: boolean;
  lastAction?: string;
  scores?: Scores | null;
  rematchVotes?: RematchVotes | null;
}

/** Stored locally in AsyncStorage for session resume. */
export interface Session {
  roomCode: string;
  playerToken: string;
}

export type Screen = 'lobby' | 'waiting' | 'game' | 'gameover';

export interface OpponentEvent {
  type: 'disconnected' | 'reconnected' | 'left' | 'rematch-vote';
  name: string;
}

// ---------------------------------------------------------------------------
// App state (useReducer)
// ---------------------------------------------------------------------------
export interface AppState {
  screen: Screen;
  session: Session | null;
  view: GameView | null;
  error: string | null;
  busy: boolean;
  connected: boolean;
  opponentConnected: boolean;
  opponentLeft: boolean;
}

export type AppAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SET_SESSION'; session: Session }
  | { type: 'SET_VIEW'; view: GameView }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'OPPONENT_DISCONNECTED' }
  | { type: 'OPPONENT_RECONNECTED' }
  | { type: 'OPPONENT_LEFT' }
  | { type: 'RESET' };
