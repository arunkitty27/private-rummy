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
  const winner = view.youWon;
  const myScore = view.scores?.you ?? 0;
  const opponentScore = view.scores?.opponent ?? 0;
  const opponentName = view.players?.find(p => !p.isYou)?.name ?? 'Partner';
  const myName = view.players?.find(p => p.isYou)?.name ?? 'You';

  const theyVoted = view.rematchVotes?.opponent ?? false;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Result banner */}
      <View style={[styles.resultBanner, winner ? styles.winBanner : styles.loseBanner]}>
        <Text style={styles.resultIcon}>{winner ? '🏆' : '🃏'}</Text>
        <Text style={styles.resultTitle}>
          {winner ? 'YOU WON!' : `${opponentName} WON`}
        </Text>
        <Text style={styles.resultSub}>
          {winner
            ? 'Congratulations! You declared a valid hand.'
            : 'Better luck next time!'}
        </Text>
      </View>

      {/* Score card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreTitle}>GAME RESULT</Text>
        <View style={styles.scoreRow}>
          <ScoreColumn
            name={myName}
            points={winner ? myScore : opponentScore}
            isWinner={winner ?? false}
            label="YOU"
          />
          <View style={styles.vsCol}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <ScoreColumn
            name={opponentName}
            points={winner ? opponentScore : myScore}
            isWinner={!winner}
            label="PARTNER"
          />
        </View>
        <Text style={styles.pointNote}>
          * Points are the penalty score from unmelded cards. Lower is better.
        </Text>
      </View>

      {/* Last hand summary */}
      {view.hand && view.hand.length > 0 && (
        <View style={styles.handSummary}>
          <Text style={styles.handSummaryLabel}>
            {winner ? 'YOUR WINNING HAND' : 'YOUR CARDS'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.handRow}>
            {view.hand.map(c => (
              <CardView key={c.id} card={c} size="sm" style={styles.handCard} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rematch / Leave */}
      <View style={styles.buttons}>
        {theyVoted && !rematchWaiting && (
          <View style={styles.rematchNotice}>
            <Text style={styles.rematchNoticeText}>
              🎯 {opponentName} wants a rematch!
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.rematchBtn, rematchWaiting && styles.rematchWaitingBtn]}
          onPress={onRematch}
          accessibilityLabel="Vote for rematch"
        >
          <Text style={styles.rematchBtnText}>
            {rematchWaiting ? '⏳ WAITING FOR PARTNER…' : '🔄 REMATCH'}
          </Text>
        </Pressable>

        <Pressable style={styles.leaveBtn} onPress={onLeave} accessibilityLabel="Leave to lobby">
          <Text style={styles.leaveBtnText}>← BACK TO LOBBY</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>RECREATIONAL PLAY ONLY · NO REAL MONEY</Text>
    </ScrollView>
  );
}

function ScoreColumn({
  name, points, isWinner, label,
}: { name: string; points: number; isWinner: boolean; label: string }) {
  return (
    <View style={[styles.scoreCol, isWinner && styles.winnerCol]}>
      {isWinner && <Text style={styles.crownIcon}>👑</Text>}
      <Text style={styles.scorePlayerLabel}>{label}</Text>
      <Text style={styles.scorePlayerName}>{name}</Text>
      <Text style={[styles.scorePoints, isWinner && styles.winnerPoints]}>
        {points}
      </Text>
      <Text style={styles.scorePointsLabel}>pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  resultBanner: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  winBanner: { backgroundColor: '#1a4d2e', borderColor: COLORS.gold, borderWidth: 2 },
  loseBanner: { backgroundColor: '#3d1818', borderColor: '#8b3030', borderWidth: 1 },
  resultIcon: { fontSize: 48, marginBottom: 10 },
  resultTitle: {
    color: COLORS.goldLight,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  resultSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },

  scoreCard: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  scoreTitle: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
  },
  winnerCol: { backgroundColor: '#1e4a2a', borderColor: COLORS.gold, borderWidth: 1 },
  vsCol: { width: 40, alignItems: 'center' },
  vsText: { color: COLORS.textMuted, fontWeight: '900', fontSize: 13 },
  crownIcon: { fontSize: 20, marginBottom: 4 },
  scorePlayerLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  scorePlayerName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 4,
    textAlign: 'center',
  },
  scorePoints: {
    color: COLORS.textSecondary,
    fontSize: 36,
    fontWeight: '900',
  },
  winnerPoints: { color: COLORS.success },
  scorePointsLabel: { color: COLORS.textMuted, fontSize: 10 },
  pointNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },

  handSummary: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  handSummaryLabel: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  handRow: { flexDirection: 'row' },
  handCard: { marginRight: 5 },

  buttons: { gap: 10, marginBottom: 24 },
  rematchNotice: {
    backgroundColor: '#1e4a2a',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  rematchNoticeText: { color: COLORS.success, fontWeight: '700', fontSize: 13 },
  rematchBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rematchWaitingBtn: { backgroundColor: COLORS.panelBg, borderColor: COLORS.goldDim, borderWidth: 1 },
  rematchBtnText: { color: COLORS.bgDark, fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  leaveBtn: {
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveBtnText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 13 },

  footer: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1.2,
    marginTop: 10,
  },
});
