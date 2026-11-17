import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { Card as CardType } from '../lib/types';
import { COLORS, RANK_ORDER, SUIT_ORDER } from '../lib/constants';
import CardView from './CardView';

interface PlayerHandProps {
  hand: CardType[];
  wildRank: string;
  selectedId: string | null;
  yourTurn: boolean;
  phase: 'draw' | 'discard';
  onSelectCard: (id: string | null) => void;
  onDiscard: (id: string) => void;
  onDeclare: (id: string) => void;
  busy: boolean;
}

export default function PlayerHand({
  hand,
  wildRank,
  selectedId,
  yourTurn,
  phase,
  onSelectCard,
  onDiscard,
  onDeclare,
  busy,
}: PlayerHandProps) {
  // Local card order (IDs only). Initialise by sorting suit then rank.
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    [...hand]
      .sort((a, b) => {
        const si = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
        if (si !== 0) return si;
        return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      })
      .map(c => c.id)
  );

  // Keep cardOrder in sync when new cards arrive (draw/discard changes hand length).
  const syncedOrder = React.useMemo(() => {
    const handIds = new Set(hand.map(c => c.id));
    // Remove IDs no longer in hand, then append any new IDs at the end.
    const filtered = cardOrder.filter(id => handIds.has(id));
    const existing = new Set(filtered);
    const added = hand.filter(c => !existing.has(c.id)).map(c => c.id);
    return [...filtered, ...added];
  }, [hand, cardOrder]);

  const orderedHand = syncedOrder.map(id => hand.find(c => c.id === id)).filter(Boolean) as CardType[];

  const handleCardPress = useCallback((cardId: string) => {
    if (phase !== 'discard') return; // Can only select/swap during discard phase.

    if (selectedId === null) {
      // Select this card.
      onSelectCard(cardId);
    } else if (selectedId === cardId) {
      // Deselect.
      onSelectCard(null);
    } else {
      // Swap the two cards' positions in order.
      setCardOrder(prev => {
        const next = [...prev];
        const idxA = next.indexOf(selectedId);
        const idxB = next.indexOf(cardId);
        if (idxA >= 0 && idxB >= 0) {
          [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
        }
        return next;
      });
      // The previously selected card keeps selection (now in new position).
      // This lets chaining swaps to sort cards.
      onSelectCard(selectedId);
    }
  }, [selectedId, phase, onSelectCard]);

  const isWild = (c: CardType) => c.printedJoker || c.rank === wildRank;
  const canAct = yourTurn && phase === 'discard' && !busy;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>YOUR HAND · {hand.length} CARDS</Text>
        {phase === 'discard' && yourTurn && (
          <Text style={styles.swapHint}>
            {selectedId ? 'Tap another card to swap positions' : 'Tap a card to select'}
          </Text>
        )}
      </View>

      {/* Card row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.handScroll}
      >
        {orderedHand.map(card => (
          <CardView
            key={card.id}
            card={card}
            selected={selectedId === card.id}
            disabled={!canAct}
            onPress={() => handleCardPress(card.id)}
            size="md"
            style={[
              styles.cardMargin,
              isWild(card) && styles.wildCard,
            ]}
          />
        ))}
      </ScrollView>

      {/* Action buttons */}
      {phase === 'discard' && yourTurn && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.discardBtn, (!selectedId || busy) && styles.disabledBtn]}
            onPress={() => selectedId && onDiscard(selectedId)}
            disabled={!selectedId || busy}
            accessibilityLabel="Discard selected card"
          >
            <Text style={styles.discardBtnText}>🗑  DISCARD</Text>
          </Pressable>

          <Pressable
            style={[styles.declareBtn, (!selectedId || busy) && styles.disabledBtn]}
            onPress={() => selectedId && onDeclare(selectedId)}
            disabled={!selectedId || busy}
            accessibilityLabel="Declare win with selected card as final discard"
          >
            <Text style={styles.declareBtnText}>🏆  DECLARE WIN</Text>
          </Pressable>
        </View>
      )}

      {phase === 'draw' && yourTurn && (
        <Text style={styles.drawHint}>Draw a card from the closed deck or open pile above.</Text>
      )}

      {!yourTurn && (
        <Text style={styles.waitHint}>Waiting for your partner to play…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.panelBg,
    borderTopColor: COLORS.panelBorder,
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  title: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  swapHint: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  handScroll: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  cardMargin: {
    marginHorizontal: 3,
  },
  wildCard: {
    borderColor: COLORS.jokerGold,
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
  },
  discardBtn: {
    flex: 1,
    backgroundColor: '#8b3030',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#ffd4d4',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  declareBtn: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  declareBtnText: {
    color: COLORS.bgDark,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  disabledBtn: { opacity: 0.35 },
  drawHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
  },
  waitHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
