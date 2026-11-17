import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Card as CardType } from '../lib/types';
import { COLORS, RANK_ORDER, SUIT_ORDER } from '../lib/constants';
import CardView from './CardView';
import { evaluateGroup, isCardWild } from '../lib/meldEvaluator';

interface PlayerHandProps {
  hand: CardType[];
  wildRank: string;
  selectedIds: string[];
  yourTurn: boolean;
  phase: 'draw' | 'discard';
  onToggleSelectCard: (id: string) => void;
  onClearSelection: () => void;
  onDiscard: (id: string) => void;
  onDeclare: (id: string) => void;
  busy: boolean;
}

export default function PlayerHand({
  hand,
  wildRank,
  selectedIds,
  yourTurn,
  phase,
  onToggleSelectCard,
  onClearSelection,
  onDiscard,
  onDeclare,
  busy,
}: PlayerHandProps) {
  // Groups of card IDs: e.g. [ [id1, id2, id3], [id4, id5, id6], ... ]
  const [groups, setGroups] = useState<string[][]>(() => {
    // Initial sort into 1 clean group
    return [[...hand]
      .sort((a, b) => {
        const si = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
        if (si !== 0) return si;
        return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      })
      .map(c => c.id)];
  });

  // Keep groups in sync with incoming hand changes (e.g. drawn card or discarded card)
  useEffect(() => {
    const currentHandIds = new Set(hand.map(c => c.id));
    setGroups(prevGroups => {
      // 1. Remove IDs that are no longer in hand
      const cleaned = prevGroups
        .map(grp => grp.filter(id => currentHandIds.has(id)))
        .filter(grp => grp.length > 0);

      // 2. Find any newly arrived cards that are not in any group
      const existingIds = new Set(cleaned.flat());
      const newCardIds = hand.filter(c => !existingIds.has(c.id)).map(c => c.id);

      if (newCardIds.length > 0) {
        if (cleaned.length === 0) {
          cleaned.push(newCardIds);
        } else {
          // Add new card to the last group
          cleaned[cleaned.length - 1].push(...newCardIds);
        }
      }
      return cleaned.length > 0 ? cleaned : [hand.map(c => c.id)];
    });
  }, [hand]);

  // Create a fast lookup map for cards by ID
  const cardMap = useMemo(() => {
    const map = new Map<string, CardType>();
    for (const c of hand) map.set(c.id, c);
    return map;
  }, [hand]);

  // Action: Auto-Sort into suit-wise groups
  const handleAutoSort = useCallback(() => {
    onClearSelection();
    const sorted = [...hand].sort((a, b) => {
      const si = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (si !== 0) return si;
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    });

    // Group cards by suit
    const suitGroups: Record<string, string[]> = {};
    for (const card of sorted) {
      const key = card.printedJoker ? 'JOKER' : card.suit;
      if (!suitGroups[key]) suitGroups[key] = [];
      suitGroups[key].push(card.id);
    }
    setGroups(Object.values(suitGroups));
  }, [hand, onClearSelection]);

  // Action: Group selected cards together into a new group
  const handleCreateGroup = useCallback(() => {
    if (selectedIds.length === 0) return;

    setGroups(prevGroups => {
      const selectedSet = new Set(selectedIds);
      // Remove selected cards from their current groups
      const remainingGroups = prevGroups
        .map(grp => grp.filter(id => !selectedSet.has(id)))
        .filter(grp => grp.length > 0);

      // Create new group with selected cards
      return [...remainingGroups, [...selectedIds]];
    });

    onClearSelection();
  }, [selectedIds, onClearSelection]);

  // Action: Move card to a specific group
  const handleMoveToGroup = useCallback((targetGroupIndex: number) => {
    if (selectedIds.length === 0) return;

    setGroups(prevGroups => {
      const selectedSet = new Set(selectedIds);
      const updated = prevGroups.map((grp, idx) => {
        const withoutSelected = grp.filter(id => !selectedSet.has(id));
        if (idx === targetGroupIndex) {
          return [...withoutSelected, ...selectedIds];
        }
        return withoutSelected;
      }).filter(grp => grp.length > 0);

      return updated;
    });

    onClearSelection();
  }, [selectedIds, onClearSelection]);

  const canDiscardOrDeclare = yourTurn && phase === 'discard' && selectedIds.length === 1 && !busy;
  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <View style={styles.container}>
      {/* Hand Controls Bar */}
      <View style={styles.controlsBar}>
        <View style={styles.leftInfo}>
          <Text style={styles.handCountText}>MY HAND ({hand.length} CARDS)</Text>
          <Text style={styles.hintSub}>
            {yourTurn
              ? (phase === 'draw' ? '👉 Draw from Open or Closed pile' : '👉 Select 1 card to Discard or Declare')
              : '⏳ Opponent playing — you can arrange & group cards'}
          </Text>
        </View>

        {/* Grouping and Sorting Tools (Always Active!) */}
        <View style={styles.toolsRow}>
          {selectedIds.length >= 2 && (
            <TouchableOpacity
              style={styles.groupBtn}
              onPress={handleCreateGroup}
              activeOpacity={0.8}
            >
              <Text style={styles.groupBtnText}>✨ GROUP ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={handleAutoSort}
            activeOpacity={0.8}
          >
            <Text style={styles.sortBtnText}>⚡ AUTO-SORT</Text>
          </TouchableOpacity>

          {/* Turn-based action buttons */}
          {yourTurn && phase === 'discard' && (
            <View style={styles.turnActions}>
              <Pressable
                style={[styles.discardBtn, !canDiscardOrDeclare && styles.disabledBtn]}
                onPress={() => singleSelectedId && onDiscard(singleSelectedId)}
                disabled={!canDiscardOrDeclare}
              >
                <Text style={styles.discardBtnText}>DISCARD</Text>
              </Pressable>

              <Pressable
                style={[styles.declareBtn, !canDiscardOrDeclare && styles.disabledBtn]}
                onPress={() => singleSelectedId && onDeclare(singleSelectedId)}
                disabled={!canDiscardOrDeclare}
              >
                <Text style={styles.declareBtnText}>DECLARE WIN</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Cards Melds Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupsScroll}
      >
        {groups.map((grp, groupIdx) => {
          const groupCards = grp.map(id => cardMap.get(id)).filter(Boolean) as CardType[];
          const evaluation = evaluateGroup(groupCards, wildRank);

          return (
            <View key={groupIdx} style={styles.groupContainer}>
              {/* Meld Badge & Move-To Target */}
              <TouchableOpacity
                style={[styles.groupBadge, { borderColor: evaluation.color }]}
                onPress={() => handleMoveToGroup(groupIdx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupBadgeText, { color: evaluation.color }]}>
                  {evaluation.label}
                </Text>
                {selectedIds.length > 0 && !grp.some(id => selectedIds.includes(id)) && (
                  <Text style={styles.moveHereHint}>+ Move here</Text>
                )}
              </TouchableOpacity>

              {/* Stacked Cards in this Group */}
              <View style={styles.cardsRow}>
                {groupCards.map((card, cardIndex) => {
                  const isSelected = selectedIds.includes(card.id);
                  const isWild = isCardWild(card, wildRank);

                  return (
                    <View
                      key={card.id}
                      style={[
                        styles.cardWrapper,
                        cardIndex > 0 && { marginLeft: -24 }, // Elegant horizontal overlap
                      ]}
                    >
                      <CardView
                        card={card}
                        selected={isSelected}
                        size="md"
                        onPress={() => onToggleSelectCard(card.id)}
                        style={[
                          isWild && styles.wildGlow,
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#05231a',
    borderTopColor: COLORS.panelBorder,
    borderTopWidth: 1.5,
    paddingTop: 6,
    paddingBottom: 8,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  handCountText: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hintSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  groupBtnText: {
    color: COLORS.bgDark,
    fontSize: 11,
    fontWeight: '900',
  },
  sortBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  turnActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  discardBtn: {
    backgroundColor: '#9e2a2b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  discardBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  declareBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  declareBtnText: {
    color: COLORS.bgDark,
    fontSize: 11,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.35,
  },

  // Groups and Cards Layout
  groupsScroll: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 16,
  },
  groupContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 6,
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    alignItems: 'center',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#082f24',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  moveHereHint: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 86,
    paddingHorizontal: 4,
  },
  cardWrapper: {
    zIndex: 1,
  },
  wildGlow: {
    borderColor: COLORS.jokerGold,
    borderWidth: 2,
  },
});
