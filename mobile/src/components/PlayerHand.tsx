import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity, Platform,
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
  // Groups of card IDs: e.g. [ [id1, id2, id3], [id4, id5] ]
  const [groups, setGroups] = useState<string[][]>(() => {
    return [[...hand]
      .sort((a, b) => {
        const si = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
        if (si !== 0) return si;
        return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
      })
      .map(c => c.id)];
  });

  // Keep groups in sync when hand cards change (draw/discard)
  useEffect(() => {
    const currentHandIds = new Set(hand.map(c => c.id));
    setGroups(prevGroups => {
      const cleaned = prevGroups
        .map(grp => grp.filter(id => currentHandIds.has(id)))
        .filter(grp => grp.length > 0);

      const existingIds = new Set(cleaned.flat());
      const newCardIds = hand.filter(c => !existingIds.has(c.id)).map(c => c.id);

      if (newCardIds.length > 0) {
        if (cleaned.length === 0) {
          cleaned.push(newCardIds);
        } else {
          cleaned[cleaned.length - 1].push(...newCardIds);
        }
      }
      return cleaned.length > 0 ? cleaned : [hand.map(c => c.id)];
    });
  }, [hand]);

  const cardMap = useMemo(() => {
    const map = new Map<string, CardType>();
    for (const c of hand) map.set(c.id, c);
    return map;
  }, [hand]);

  // Auto-Sort into suit-wise groups
  const handleAutoSort = useCallback(() => {
    onClearSelection();
    const sorted = [...hand].sort((a, b) => {
      const si = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (si !== 0) return si;
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    });

    const suitGroups: Record<string, string[]> = {};
    for (const card of sorted) {
      const key = card.printedJoker ? 'JOKER' : card.suit;
      if (!suitGroups[key]) suitGroups[key] = [];
      suitGroups[key].push(card.id);
    }
    setGroups(Object.values(suitGroups));
  }, [hand, onClearSelection]);

  // Group selected cards into a new group
  const handleCreateGroup = useCallback(() => {
    if (selectedIds.length === 0) return;

    setGroups(prevGroups => {
      const selectedSet = new Set(selectedIds);
      const remaining = prevGroups
        .map(grp => grp.filter(id => !selectedSet.has(id)))
        .filter(grp => grp.length > 0);

      return [...remaining, [...selectedIds]];
    });

    onClearSelection();
  }, [selectedIds, onClearSelection]);

  // Move dragged or selected card directly to a target group and position
  const moveCardTo = useCallback((draggedCardId: string, targetGroupIdx: number, targetCardIndex?: number) => {
    setGroups(prevGroups => {
      // Remove card from all current groups
      const updated = prevGroups.map(grp => grp.filter(id => id !== draggedCardId));

      // Insert into target group
      if (!updated[targetGroupIdx]) {
        updated[targetGroupIdx] = [];
      }
      if (targetCardIndex !== undefined && targetCardIndex >= 0) {
        updated[targetGroupIdx].splice(targetCardIndex, 0, draggedCardId);
      } else {
        updated[targetGroupIdx].push(draggedCardId);
      }

      return updated.filter(grp => grp.length > 0);
    });
  }, []);

  // Card interaction:
  // If no card is selected -> select this card
  // If 1 card is selected and user taps another card -> move/swap selected card directly to that position!
  const handleCardPress = useCallback((clickedCardId: string, groupIdx: number, cardIdx: number) => {
    if (selectedIds.length === 1 && selectedIds[0] !== clickedCardId) {
      const sourceCardId = selectedIds[0];
      moveCardTo(sourceCardId, groupIdx, cardIdx);
      onClearSelection();
    } else {
      onToggleSelectCard(clickedCardId);
    }
  }, [selectedIds, moveCardTo, onClearSelection, onToggleSelectCard]);

  // HTML5 Drag & Drop handlers for Web browser
  const handleDragStart = (e: any, cardId: string) => {
    if (Platform.OS === 'web' && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', cardId);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: any) => {
    if (Platform.OS === 'web') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDropOnCard = (e: any, targetGroupIdx: number, targetCardIndex: number) => {
    if (Platform.OS === 'web') {
      e.preventDefault();
      const draggedCardId = e.dataTransfer.getData('text/plain');
      if (draggedCardId) {
        moveCardTo(draggedCardId, targetGroupIdx, targetCardIndex);
        onClearSelection();
      }
    }
  };

  const handleDropOnGroup = (e: any, targetGroupIdx: number) => {
    if (Platform.OS === 'web') {
      e.preventDefault();
      const draggedCardId = e.dataTransfer.getData('text/plain');
      if (draggedCardId) {
        moveCardTo(draggedCardId, targetGroupIdx);
        onClearSelection();
      }
    }
  };

  const canDiscardOrDeclare = yourTurn && phase === 'discard' && selectedIds.length === 1 && !busy;
  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <View style={styles.container}>
      {/* Hand Controls Bar */}
      <View style={styles.controlsBar}>
        <View style={styles.leftInfo}>
          <Text style={styles.handCountText}>MY HAND ({hand.length} CARDS)</Text>
          <Text style={styles.hintSub}>
            {selectedIds.length === 1
              ? '✨ Tap any card to move/swap here, or Discard'
              : (yourTurn
                  ? (phase === 'draw' ? '👉 Draw from Open or Closed pile' : '👉 Select 1 card to Discard or Declare')
                  : '⏳ Opponent playing — rearrange & group your cards freely')}
          </Text>
        </View>

        {/* Action Tools */}
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

          {/* Discard & Declare (Available on your discard turn) */}
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
            <View
              key={groupIdx}
              style={styles.groupContainer}
              // @ts-ignore Web drag and drop props
              onDragOver={handleDragOver}
              // @ts-ignore
              onDrop={(e: any) => handleDropOnGroup(e, groupIdx)}
            >
              {/* Meld Evaluation Badge */}
              <View style={[styles.groupBadge, { borderColor: evaluation.color }]}>
                <Text style={[styles.groupBadgeText, { color: evaluation.color }]}>
                  {evaluation.label}
                </Text>
              </View>

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
                        cardIndex > 0 && { marginLeft: -24 },
                      ]}
                      // @ts-ignore Web drag props
                      draggable={Platform.OS === 'web'}
                      // @ts-ignore
                      onDragStart={(e: any) => handleDragStart(e, card.id)}
                      // @ts-ignore
                      onDragOver={handleDragOver}
                      // @ts-ignore
                      onDrop={(e: any) => handleDropOnCard(e, groupIdx, cardIndex)}
                    >
                      <CardView
                        card={card}
                        selected={isSelected}
                        size="md"
                        onPress={() => handleCardPress(card.id, groupIdx, cardIndex)}
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

        {/* Drop zone to create a brand new group */}
        {selectedIds.length > 0 && (
          <TouchableOpacity
            style={styles.newGroupZone}
            onPress={handleCreateGroup}
            activeOpacity={0.8}
            // @ts-ignore
            onDragOver={handleDragOver}
            // @ts-ignore
            onDrop={(e: any) => {
              if (Platform.OS === 'web') {
                e.preventDefault();
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId) {
                  setGroups(prev => [...prev.map(g => g.filter(id => id !== cardId)), [cardId]]);
                  onClearSelection();
                }
              }
            }}
          >
            <Text style={styles.newGroupPlus}>＋</Text>
            <Text style={styles.newGroupText}>New Group</Text>
          </TouchableOpacity>
        )}
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
    alignItems: 'center',
  },
  groupContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 6,
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  groupBadge: {
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
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 86,
    paddingHorizontal: 4,
  },
  cardWrapper: {
    zIndex: 1,
    cursor: 'grab' as any,
  },
  wildGlow: {
    borderColor: COLORS.jokerGold,
    borderWidth: 2,
  },
  newGroupZone: {
    width: 70,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(228, 199, 123, 0.05)',
  },
  newGroupPlus: {
    color: COLORS.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  newGroupText: {
    color: COLORS.goldLight,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
});
