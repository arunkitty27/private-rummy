import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '../lib/types';
import { COLORS, SUIT_SYMBOLS, RED_SUITS } from '../lib/constants';

interface CardViewProps {
  card?: Card | null;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: object;
}

const SIZES = {
  sm: { width: 42, height: 60, rank: 14, suit: 13, border: 7 },
  md: { width: 54, height: 76, rank: 18, suit: 16, border: 9 },
  lg: { width: 68, height: 96, rank: 22, suit: 20, border: 11 },
};

export default function CardView({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 'md',
  onPress,
  style,
}: CardViewProps) {
  const dim = SIZES[size];

  if (faceDown || !card) {
    return (
      <Pressable
        style={[styles.cardBack, { width: dim.width, height: dim.height, borderRadius: dim.border }, style]}
        onPress={onPress}
        disabled={disabled || !onPress}
      >
        <View style={styles.backPattern}>
          <Text style={styles.backIcon}>🂠</Text>
        </View>
      </Pressable>
    );
  }

  const isJoker = card.printedJoker;
  const isRed = RED_SUITS.has(card.suit);
  const suitSymbol = SUIT_SYMBOLS[card.suit] ?? card.suit;
  const suitColor = isJoker ? COLORS.jokerGold : (isRed ? COLORS.red : COLORS.darkSuit);

  const cardStyle = [
    styles.card,
    {
      width: dim.width,
      height: dim.height,
      borderRadius: dim.border,
      borderColor: selected ? COLORS.cardSelectedBorder : COLORS.cardBorder,
      borderWidth: selected ? 2.5 : 1.5,
      transform: selected ? [{ translateY: -10 }] : [],
      shadowColor: selected ? COLORS.gold : '#000',
      shadowOpacity: selected ? 0.5 : 0.15,
      shadowRadius: selected ? 6 : 2,
    },
    style,
  ];

  return (
    <Pressable style={cardStyle} onPress={onPress} disabled={disabled || !onPress}>
      {/* Top-left rank + suit */}
      <View style={styles.corner}>
        <Text style={[styles.rank, { fontSize: dim.rank - 2, color: suitColor }]}>
          {isJoker ? '★' : card.rank}
        </Text>
        {!isJoker && (
          <Text style={[styles.suitSmall, { fontSize: dim.suit - 4, color: suitColor }]}>
            {suitSymbol}
          </Text>
        )}
      </View>

      {/* Center symbol */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { fontSize: dim.suit + 4, color: suitColor }]}>
          {isJoker ? '🃏' : suitSymbol}
        </Text>
        {isJoker && (
          <Text style={[styles.jokerLabel, { fontSize: dim.rank - 6 }]}>JOKER</Text>
        )}
      </View>

      {/* Bottom-right rank + suit (rotated) */}
      {!isJoker && (
        <View style={[styles.corner, styles.cornerBottom]}>
          <Text style={[styles.rank, { fontSize: dim.rank - 2, color: suitColor }]}>
            {card.rank}
          </Text>
          <Text style={[styles.suitSmall, { fontSize: dim.suit - 4, color: suitColor }]}>
            {suitSymbol}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    justifyContent: 'space-between',
    padding: 4,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  cardBack: {
    backgroundColor: COLORS.cardBack,
    borderWidth: 1.5,
    borderColor: COLORS.cardBackAccent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  backPattern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackAccent,
    margin: 4,
    borderRadius: 4,
  },
  backIcon: {
    fontSize: 28,
    opacity: 0.4,
    color: '#fff',
  },
  corner: {
    alignItems: 'flex-start',
  },
  cornerBottom: {
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  rank: {
    fontWeight: '900',
    lineHeight: 18,
  },
  suitSmall: {
    lineHeight: 14,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerSuit: {
    fontWeight: '900',
  },
  jokerLabel: {
    color: COLORS.jokerGold,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
});
