import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getSocket, emitWithAck, waitForConnect } from './lib/socket';
import { saveSession, loadSession, clearSession } from './lib/storage';
import { AppState, AppAction, GameView, OpponentEvent, Session } from './lib/types';
import { COLORS } from './lib/constants';
import LobbyScreen from './components/LobbyScreen';
import WaitingScreen from './components/WaitingScreen';
import GameTable from './components/GameTable';
import GameOver from './components/GameOver';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
const initialState: AppState = {
  screen: 'lobby',
  session: null,
  view: null,
  error: null,
  busy: false,
  connected: false,
  opponentConnected: true,
  opponentLeft: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true };
    case 'DISCONNECTED':
      return { ...state, connected: false };
    case 'SET_SESSION':
      return { ...state, session: action.session };
    case 'SET_VIEW': {
      const view = action.view;
      let screen: AppState['screen'] = state.screen;
      if (view.status === 'waiting') screen = 'waiting';
      else if (view.status === 'playing') screen = 'game';
      else if (view.status === 'finished') screen = 'gameover';
      return { ...state, view, screen, error: null };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error, busy: false };
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'OPPONENT_DISCONNECTED':
      return { ...state, opponentConnected: false };
    case 'OPPONENT_RECONNECTED':
      return { ...state, opponentConnected: true };
    case 'OPPONENT_LEFT':
      return { ...state, opponentLeft: true, opponentConnected: false };
    case 'RESET':
      return { ...initialState, connected: state.connected };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// AppScreen
// ---------------------------------------------------------------------------
export default function AppScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rematchWaiting, setRematchWaiting] = useState(false);

  const { screen, session, view, error, busy, connected, opponentConnected, opponentLeft } = state;

  const handleToggleSelectCard = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // ---- Socket setup ----
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => dispatch({ type: 'CONNECTED' });
    const onDisconnect = () => dispatch({ type: 'DISCONNECTED' });

    const onGameState = (payload: { view: GameView }) => {
      if (payload?.view) {
        dispatch({ type: 'SET_VIEW', view: payload.view });
        setSelectedIds([]);
        if (payload.view.status === 'playing' && payload.view.winner === null) {
          setRematchWaiting(false);
        }
      }
    };

    const onOpponentEvent = (evt: OpponentEvent) => {
      if (evt.type === 'disconnected') dispatch({ type: 'OPPONENT_DISCONNECTED' });
      else if (evt.type === 'reconnected') dispatch({ type: 'OPPONENT_RECONNECTED' });
      else if (evt.type === 'left') dispatch({ type: 'OPPONENT_LEFT' });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game-state', onGameState);
    socket.on('opponent-event', onOpponentEvent);

    if (socket.connected) {
      dispatch({ type: 'CONNECTED' });
    } else {
      socket.connect();
    }

    // Try to restore previous session on mount
    loadSession().then((savedSession: Session | null) => {
      if (!savedSession) return;
      dispatch({ type: 'SET_SESSION', session: savedSession });
      const tryResume = async () => {
        try {
          const result = await emitWithAck('resume-room', savedSession);
          if (result?.view) dispatch({ type: 'SET_VIEW', view: result.view });
        } catch {
          await clearSession();
          dispatch({ type: 'RESET' });
        }
      };

      if (socket.connected) {
        tryResume();
      } else {
        socket.once('connect', tryResume);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game-state', onGameState);
      socket.off('opponent-event', onOpponentEvent);
    };
  }, []);

  // ---- Actions ----
  const withBusy = useCallback(
    async (fn: () => Promise<void>) => {
      dispatch({ type: 'SET_BUSY', busy: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        await fn();
      } catch (e: any) {
        dispatch({ type: 'SET_ERROR', error: e.message ?? 'Something went wrong.' });
      } finally {
        dispatch({ type: 'SET_BUSY', busy: false });
      }
    },
    []
  );

  const handleCreateRoom = useCallback(
    (name: string) =>
      withBusy(async () => {
        await waitForConnect();
        const result = await emitWithAck('create-room', { playerName: name });
        const sess: Session = { roomCode: result.roomCode, playerToken: result.playerToken };
        await saveSession(sess);
        dispatch({ type: 'SET_SESSION', session: sess });
        dispatch({ type: 'SET_VIEW', view: result.view });
      }),
    [withBusy]
  );

  const handleJoinRoom = useCallback(
    (name: string, roomCode: string) =>
      withBusy(async () => {
        await waitForConnect();
        const result = await emitWithAck('join-room', { playerName: name, roomCode });
        const sess: Session = { roomCode: result.roomCode, playerToken: result.playerToken };
        await saveSession(sess);
        dispatch({ type: 'SET_SESSION', session: sess });
        dispatch({ type: 'SET_VIEW', view: result.view });
      }),
    [withBusy]
  );

  const handleDraw = useCallback(
    (source: 'stock' | 'discard') =>
      withBusy(async () => {
        if (!session) return;
        await emitWithAck('game-action', { ...session, action: 'draw', payload: { source } });
      }),
    [session, withBusy]
  );

  const handleDiscard = useCallback(
    (cardId: string) =>
      withBusy(async () => {
        if (!session) return;
        setSelectedIds([]);
        await emitWithAck('game-action', { ...session, action: 'discard', payload: { cardId } });
      }),
    [session, withBusy]
  );

  const handleDeclare = useCallback(
    (cardId: string) =>
      withBusy(async () => {
        if (!session) return;
        await emitWithAck('game-action', { ...session, action: 'declare', payload: { cardId } });
      }),
    [session, withBusy]
  );

  const handleRematch = useCallback(
    () =>
      withBusy(async () => {
        if (!session) return;
        setRematchWaiting(true);
        const result = await emitWithAck('rematch', session);
        if (result.started) setRematchWaiting(false);
      }),
    [session, withBusy]
  );

  const handleLeave = useCallback(async () => {
    const socket = getSocket();
    if (session) {
      try { await emitWithAck('leave-room', session); } catch {}
    }
    await clearSession();
    dispatch({ type: 'RESET' });
    setSelectedIds([]);
    setRematchWaiting(false);
  }, [session]);

  // ---- Render ----
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar hidden />

      {/* Opponent left overlay */}
      {opponentLeft && (
        <View style={styles.overlay}>
          <Text style={styles.overlayIcon}>🚪</Text>
          <Text style={styles.overlayTitle}>Partner left the game</Text>
          <Text style={styles.overlaySub}>The room has ended. You can return to the lobby.</Text>
        </View>
      )}

      {/* Screen routing */}
      <View style={styles.flex}>
        {screen === 'lobby' && (
          <LobbyScreen
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            connected={connected}
            error={error}
            busy={busy}
          />
        )}

        {screen === 'waiting' && session && (
          <WaitingScreen
            roomCode={session.roomCode}
            onLeave={handleLeave}
          />
        )}

        {screen === 'game' && view && (
          <GameTable
            view={view}
            opponentConnected={opponentConnected}
            roomCode={session?.roomCode ?? ''}
            selectedIds={selectedIds}
            onToggleSelectCard={handleToggleSelectCard}
            onClearSelection={handleClearSelection}
            onDraw={handleDraw}
            onDiscard={handleDiscard}
            onDeclare={handleDeclare}
            onLeave={handleLeave}
            busy={busy}
            error={error}
          />
        )}

        {screen === 'gameover' && view && (
          <GameOver
            view={view}
            onRematch={handleRematch}
            onLeave={handleLeave}
            rematchWaiting={rematchWaiting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgDark },
  flex: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(3,24,15,0.94)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  overlayIcon: { fontSize: 48, marginBottom: 14 },
  overlayTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlaySub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});
