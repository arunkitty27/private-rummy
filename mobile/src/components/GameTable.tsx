import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert,
} from 'react-native';
import { GameView } from '../lib/types';
import { COLORS, SUIT_SYMBOLS } from '../lib/constants';
import CardView from './CardView';
import PlayerHand from './PlayerHand';

interface GameTableProps {
  view: GameView;
  opponentConnected: boolean;
  roomCode: string;
  selectedId: string | null;
  onSelectCard: (id: string | null) => void;
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
  selectedId,
  onSelectCard,
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
  const wildLabel = wildCard
    ? (wildCard.printedJoker
        ? '🃏 Joker → Wild: Ace'
        : `${wildCard.rank}${SUIT_SYMBOLS[wildCard.suit] ?? wildCard.suit} → Wild rank: ${view.wildRank}`)
    : '';

  const confirmLeave = () => {
    Alert.alert(
      'Leave Game',
      'Your partner will be notified. Are you sure?',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* ───────── Top bar ───────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.roomLabel}>ROOM</Text>
          <Text style={styles.roomCode}>{roomCode}</Text>
        </View>
        <View style={styles.turnBadge}>
          <Text style={[styles.turnText, view.yourTurn && styles.yourTurnText]}>
            {view.yourTurn ? '● YOUR TURN' : '○ THEIR TURN'}
          </Text>
        </View>
        <Pressable onPress={confirmLeave} hitSlop={8} accessibilityLabel="Leave game">
          <Text style={styles.leaveBtn}>✕ LEAVE</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>

        {/* ───────── Opponent area ───────── */}
        <View style={styles.opponentArea}>
          <View style={styles.opponentHeader}>
            <View style={[styles.connDot, { backgroundColor: opponentConnected ? COLORS.success : COLORS.warning }]} />
            <Text style={styles.opponentName}>{opponent?.name ?? 'Partner'}</Text>
            {!opponentConnected && (
              <Text style={styles.reconnectingTag}>reconnecting…</Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opponentCards}>
            {Array.from({ length: view.opponentCardCount ?? 0 }).map((_, i) => (
              <CardView key={i} faceDown size="sm" style={styles.oppCard} />
            ))}
          </ScrollView>
        </View>

        {/* ───────── Wild joker indicator ───────── */}
        <View style={styles.wildRow}>
          <View style={styles.wildCard}>
            <Text style={styles.wildLabel}>WILD JOKER</Text>
            {wildCard && (
              <CardView card={wildCard} size="sm" style={styles.wildCardView} />
            )}
            <Text style={styles.wildRankText}>Rank: {view.wildRank}</Text>
          </View>

          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>CLOSED DECK</Text>
            <Text style={styles.stockCount}>{view.stockCount}</Text>
            <Text style={styles.stockSub}>cards left</Text>
          </View>
        </View>

        {/* ───────── Draw piles ───────── */}
        <View style={styles.pilesRow}>
          {/* Closed deck (stock) */}
          <Pressable
            style={[
              styles.pile,
              view.yourTurn && view.phase === 'draw' && !busy && styles.pileActive,
            ]}
            onPress={() => view.yourTurn && view.phase === 'draw' && !busy && onDraw('stock')}
            disabled={!view.yourTurn || view.phase !== 'draw' || busy}
            accessibilityLabel="Draw from closed deck"
          >
            <CardView faceDown size="lg" />
            <Text style={styles.pileLabel}>CLOSED DECK</Text>
            <Text style={styles.pileCount}>{view.stockCount} left</Text>
          </Pressable>

          {/* Open discard pile */}
          <Pressable
            style={[
              styles.pile,
              view.yourTurn && view.phase === 'draw' && view.discardTop && !busy && styles.pileActive,
            ]}
            onPress={() =>
              view.yourTurn && view.phase === 'draw' && view.discardTop && !busy && onDraw('discard')
            }
            disabled={!view.yourTurn || view.phase !== 'draw' || !view.discardTop || busy}
            accessibilityLabel="Draw from open pile"
          >
            {view.discardTop ? (
              <CardView card={view.discardTop} size="lg" />
            ) : (
              <View style={styles.emptyPile}>
                <Text style={styles.emptyPileText}>Empty</Text>
              </View>
            )}
            <Text style={styles.pileLabel}>OPEN PILE</Text>
          </Pressable>
        </View>

        {/* Last action feed */}
        <View style={styles.actionFeed}>
          <Text style={styles.actionFeedText}>{view.lastAction}</Text>
        </View>

        {/* Error banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

      </ScrollView>

      {/* ───────── Player hand (bottom, fixed) ───────── */}
      <PlayerHand
        hand={view.hand ?? []}
        wildRank={view.wildRank ?? ''}
        selectedId={selectedId}
        yourTurn={view.yourTurn ?? false}
        phase={view.phase ?? 'draw'}
        onSelectCard={onSelectCard}
        onDiscard={onDiscard}
        onDeclare={onDeclare}
        busy={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 12, paddingBottom: 8 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomColor: COLORS.panelBorder,
    borderBottomWidth: 1,
  },
  roomLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  roomCode: { color: COLORS.goldLight, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  turnBadge: { flex: 1, alignItems: 'center' },
  turnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  yourTurnText: { color: COLORS.success, fontSize: 12 },
  leaveBtn: { color: '#f1a19a', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },

  opponentArea: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  opponentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  opponentName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', flex: 1 },
  reconnectingTag: {
    color: COLORS.warning,
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  opponentCards: { flexDirection: 'row' },
  oppCard: { marginRight: 4 },

  wildRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  wildCard: {
    flex: 1,
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.jokerGold,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  wildCardView: { marginVertical: 6 },
  wildLabel: {
    color: COLORS.jokerGold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  wildRankText: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4, fontWeight: '600' },

  stockInfo: {
    flex: 1,
    backgroundColor: COLORS.panelBg,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockLabel: { color: COLORS.textLabel, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  stockCount: { color: COLORS.goldLight, fontSize: 32, fontWeight: '900', marginVertical: 4 },
  stockSub: { color: COLORS.textMuted, fontSize: 10 },

  pilesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
  },
  pile: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pileActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(228,199,123,0.07)',
  },
  pileLabel: { color: COLORS.textLabel, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 7 },
  pileCount: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  emptyPile: {
    width: 68,
    height: 96,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.panelBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPileText: { color: COLORS.textMuted, fontSize: 11 },

  actionFeed: {
    backgroundColor: COLORS.tableGreen,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  actionFeedText: { color: '#d1e2d2', fontSize: 11, textAlign: 'center' },

  errorBanner: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
  },
  errorText: { color: COLORS.error, fontSize: 12, lineHeight: 18 },
});
