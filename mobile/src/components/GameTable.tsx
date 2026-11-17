import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
} from 'react-native';
import { GameView } from '../lib/types';
import { COLORS, SUIT_SYMBOLS } from '../lib/constants';
import CardView from './CardView';
import PlayerHand from './PlayerHand';

interface GameTableProps {
  view: GameView;
  opponentConnected: boolean;
  roomCode: string;
  selectedIds: string[];
  onToggleSelectCard: (id: string) => void;
  onClearSelection: () => void;
  onDraw: (source: 'stock' | 'discard') => Promise<void>;
  onDiscard: (cardId: string) => Promise<void>;
  onDeclare: (cardId: string) => Promise<void>;
  onLeave: () => void;
  busy: boolean;
  error: string | null;
}

export default function GameTable({
  view,
  opponentConnected,
  roomCode,
  selectedIds,
  onToggleSelectCard,
  onClearSelection,
  onDraw,
  onDiscard,
  onDeclare,
  onLeave,
  busy,
  error,
}: GameTableProps) {
  const opponent = view.players?.find(p => !p.isYou);
  const me = view.players?.find(p => p.isYou);

  const wildCard = view.wildCard;
  const isDrawPhase = view.yourTurn && view.phase === 'draw' && !busy;

  const confirmLeave = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave this match? Your partner will be notified.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]
    );
  };

  return (
    <View style={styles.tableRoot}>
      {/* ───────── Top Status Bar ───────── */}
      <View style={styles.headerBar}>
        <View style={styles.roomTag}>
          <Text style={styles.roomLabel}>ROOM</Text>
          <Text style={styles.roomCodeText}>{roomCode}</Text>
        </View>

        {/* Center Turn Indicator */}
        <View style={[styles.turnPill, view.yourTurn ? styles.yourTurnPill : styles.theirTurnPill]}>
          <Text style={[styles.turnText, view.yourTurn ? styles.yourTurnText : styles.theirTurnText]}>
            {view.yourTurn
              ? (view.phase === 'draw' ? '● YOUR TURN — DRAW A CARD' : '● YOUR TURN — DISCARD A CARD')
              : `○ ${opponent?.name || 'PARTNER'}'S TURN`}
          </Text>
        </View>

        <Pressable onPress={confirmLeave} style={styles.leaveBtn} hitSlop={8}>
          <Text style={styles.leaveText}>✕ LEAVE</Text>
        </Pressable>
      </View>

      {/* ───────── Middle Felt Board ───────── */}
      <View style={styles.feltBoard}>
        {/* Opponent Zone (Left) */}
        <View style={styles.opponentSection}>
          <View style={styles.playerTag}>
            <View style={[styles.dot, { backgroundColor: opponentConnected ? COLORS.success : COLORS.warning }]} />
            <Text style={styles.playerName} numberOfLines={1}>
              {opponent?.name ?? 'Partner'}
            </Text>
          </View>
          {!opponentConnected && <Text style={styles.reconnectingAlert}>reconnecting…</Text>}

          {/* Opponent Card Backs */}
          <View style={styles.opponentCardsRow}>
            {Array.from({ length: Math.min(view.opponentCardCount ?? 0, 13) }).map((_, i) => (
              <View key={i} style={[styles.oppCardWrapper, i > 0 && { marginLeft: -18 }]}>
                <CardView faceDown size="sm" />
              </View>
            ))}
          </View>
          <Text style={styles.oppCardCount}>{view.opponentCardCount ?? 0} cards in hand</Text>
        </View>

        {/* Center Game Piles (Draw & Discard) */}
        <View style={styles.pilesSection}>
          {/* Wild Joker Indicator */}
          <View style={styles.wildBox}>
            <Text style={styles.wildTitle}>WILD JOKER</Text>
            {wildCard && <CardView card={wildCard} size="md" />}
            <Text style={styles.wildRankSub}>Rank: {view.wildRank}</Text>
          </View>

          {/* Closed Deck (Stock Pile) */}
          <Pressable
            style={[styles.pileWrapper, isDrawPhase && styles.activePile]}
            onPress={() => isDrawPhase && onDraw('stock')}
            disabled={!isDrawPhase}
          >
            <CardView faceDown size="lg" />
            <Text style={styles.pileCaption}>CLOSED DECK</Text>
            <Text style={styles.pileCount}>{view.stockCount} left</Text>
          </Pressable>

          {/* Open Discard Pile */}
          <Pressable
            style={[styles.pileWrapper, isDrawPhase && view.discardTop && styles.activePile]}
            onPress={() => isDrawPhase && view.discardTop && onDraw('discard')}
            disabled={!isDrawPhase || !view.discardTop}
          >
            {view.discardTop ? (
              <CardView card={view.discardTop} size="lg" />
            ) : (
              <View style={styles.emptyDiscard}>
                <Text style={styles.emptyText}>Empty</Text>
              </View>
            )}
            <Text style={styles.pileCaption}>OPEN PILE</Text>
            <Text style={styles.pileCount}>{view.discardCount ?? 0} cards</Text>
          </Pressable>
        </View>

        {/* Right Info & Live Feed */}
        <View style={styles.feedSection}>
          <Text style={styles.feedTitle}>TABLE LOG</Text>
          <View style={styles.feedBox}>
            <Text style={styles.feedText} numberOfLines={3}>
              {view.lastAction || 'Game in progress.'}
            </Text>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={2}>⚠ {error}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ───────── Bottom Hand Area (Always Interactive) ───────── */}
      <PlayerHand
        hand={view.hand ?? []}
        wildRank={view.wildRank ?? ''}
        selectedIds={selectedIds}
        yourTurn={view.yourTurn ?? false}
        phase={view.phase ?? 'draw'}
        onToggleSelectCard={onToggleSelectCard}
        onClearSelection={onClearSelection}
        onDiscard={onDiscard}
        onDeclare={onDeclare}
        busy={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tableRoot: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#041d14',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomColor: COLORS.panelBorder,
    borderBottomWidth: 1,
  },
  roomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roomCodeText: {
    color: COLORS.goldLight,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  turnPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  yourTurnPill: {
    backgroundColor: 'rgba(82, 209, 140, 0.15)',
    borderColor: COLORS.success,
  },
  theirTurnPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  turnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  yourTurnText: {
    color: COLORS.success,
  },
  theirTurnText: {
    color: COLORS.textSecondary,
  },
  leaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  leaveText: {
    color: '#ffb4a9',
    fontSize: 11,
    fontWeight: '800',
  },

  // Felt Board Layout
  feltBoard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#073b2a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opponentSection: {
    width: '28%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  playerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  reconnectingAlert: {
    color: COLORS.warning,
    fontSize: 9,
    fontWeight: '700',
  },
  opponentCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  oppCardWrapper: {
    zIndex: 1,
  },
  oppCardCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },

  // Center Piles
  pilesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  wildBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: COLORS.jokerGold,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
  },
  wildTitle: {
    color: COLORS.jokerGold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  wildRankSub: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  pileWrapper: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activePile: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(228, 199, 123, 0.12)',
  },
  pileCaption: {
    color: COLORS.textLabel,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  pileCount: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  emptyDiscard: {
    width: 68,
    height: 96,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Feed & Log Section
  feedSection: {
    width: '24%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: 10,
  },
  feedTitle: {
    color: COLORS.textLabel,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  feedBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    minHeight: 46,
    justifyContent: 'center',
  },
  feedText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    lineHeight: 15,
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 10,
  },
});
