import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { GameView } from '../lib/types';
import { COLORS } from '../lib/constants';
import CardView from './CardView';

interface GameOverProps {
  view: GameView;
  onRematch: () => void;
  onLeave: () => void;
  rematchWaiting: boolean;
}

export default function GameOver({ view, onRematch, onLeave, rematchWaiting }: GameOverProps) {
  const youWon = view.youWon ?? false;
  const myScore = view.scores?.you ?? 0;
  const opponentScore = view.scores?.opponent ?? 0;
  const opponentName = view.players?.find(p => !p.isYou)?.name ?? 'Partner';
  const myName = view.players?.find(p => p.isYou)?.name ?? 'You';
  const theyVoted = view.rematchVotes?.opponent ?? false;

  return (
    <View style={styles.container}>
      <View style={styles.landscapeRow}>
        {/* Left Column: Result & Accurate Points */}
        <View style={styles.leftCol}>
          <View style={[styles.resultBanner, youWon ? styles.winBanner : styles.loseBanner]}>
            <Text style={styles.resultIcon}>{youWon ? '🏆' : '🃏'}</Text>
            <View style={styles.bannerText}>
              <Text style={styles.resultTitle}>
                {youWon ? 'YOU WON!' : `${opponentName.toUpperCase()} WON`}
              </Text>
              <Text style={styles.resultSub}>
                {youWon
                  ? 'Congratulations! Valid 13-card Indian Rummy hand declared.'
                  : `${opponentName} declared a winning hand. Review final cards below.`}
              </Text>
            </View>
          </View>

          {/* Accurate Scoreboard */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>PENALTY POINTS</Text>
            <View style={styles.scoreRow}>
              {/* Your Score */}
              <View style={[styles.scoreCol, youWon && styles.winnerCol]}>
                <Text style={styles.scorePlayerName} numberOfLines={1}>{myName} (You)</Text>
                <Text style={[styles.scorePoints, youWon && styles.winnerPoints]}>
                  {myScore}
                </Text>
                <Text style={styles.scorePtsLabel}>{youWon ? 'WINNER (0 pts)' : 'penalty pts'}</Text>
              </View>

              <Text style={styles.vsText}>VS</Text>

              {/* Opponent Score */}
              <View style={[styles.scoreCol, !youWon && styles.winnerCol]}>
                <Text style={styles.scorePlayerName} numberOfLines={1}>{opponentName}</Text>
                <Text style={[styles.scorePoints, !youWon && styles.winnerPoints]}>
                  {opponentScore}
                </Text>
                <Text style={styles.scorePtsLabel}>{!youWon ? 'WINNER (0 pts)' : 'penalty pts'}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Rematch Actions */}
          {theyVoted && !rematchWaiting && (
            <View style={styles.theyVotedBanner}>
              <Text style={styles.theyVotedText}>⚡ {opponentName} wants a rematch!</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.rematchBtn, rematchWaiting && styles.waitingBtn]}
              onPress={onRematch}
            >
              <Text style={styles.rematchBtnText}>
                {rematchWaiting ? '⏳ WAITING FOR PARTNER…' : '🔄 REMATCH'}
              </Text>
            </Pressable>

            <Pressable style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveBtnText}>✕ LOBBY</Text>
            </Pressable>
          </View>
        </View>

        {/* Right Column: Both Players' Final Hands Revealed */}
        <View style={styles.rightCol}>
          {/* Your Hand */}
          <Text style={styles.sectionTitle}>
            YOUR CARDS ({myScore} PTS)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handRow}
          >
            {view.hand?.map(c => (
              <CardView key={c.id} card={c} size="sm" style={styles.cardItem} />
            ))}
          </ScrollView>

          {/* Opponent's Hand Status */}
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
            {opponentName.toUpperCase()}'S CARDS ({opponentScore} PTS)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handRow}
          >
            {view.opponentHand && view.opponentHand.length > 0 ? (
              view.opponentHand.map(c => (
                <CardView key={c.id} card={c} size="sm" style={styles.cardItem} />
              ))
            ) : (
              <Text style={styles.noCardsText}>No cards revealed.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    padding: 16,
    justifyContent: 'center',
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  leftCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
  },
  bannerText: {
    flex: 1,
  },
  winBanner: {
    backgroundColor: '#134e2e',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },
  loseBanner: {
    backgroundColor: '#3f1717',
    borderColor: '#8b3030',
    borderWidth: 1.5,
  },
  resultIcon: {
    fontSize: 32,
  },
  resultTitle: {
    color: COLORS.goldLight,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  resultSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scoreCard: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    padding: 10,
    marginVertical: 4,
  },
  scoreTitle: {
    color: COLORS.textLabel,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  winnerCol: {
    backgroundColor: '#1a4e2c',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },
  scorePlayerName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  scorePoints: {
    color: COLORS.textSecondary,
    fontSize: 26,
    fontWeight: '900',
  },
  winnerPoints: {
    color: COLORS.success,
  },
  scorePtsLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  vsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },

  rightCol: {
    flex: 1.2,
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  handRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  cardItem: {
    marginRight: 4,
  },
  noCardsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  theyVotedBanner: {
    backgroundColor: 'rgba(82, 209, 140, 0.15)',
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  theyVotedText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rematchBtn: {
    flex: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  waitingBtn: {
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  rematchBtnText: {
    color: COLORS.bgDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leaveBtn: {
    flex: 1,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});
