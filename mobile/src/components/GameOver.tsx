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
    <View style={styles.container}>
      <View style={styles.landscapeRow}>
        {/* Left Column: Result & Points */}
        <View style={styles.leftCol}>
          <View style={[styles.resultBanner, winner ? styles.winBanner : styles.loseBanner]}>
            <Text style={styles.resultIcon}>{winner ? '🏆' : '🃏'}</Text>
            <View>
              <Text style={styles.resultTitle}>
                {winner ? 'YOU WON!' : `${opponentName.toUpperCase()} WON`}
              </Text>
              <Text style={styles.resultSub}>
                {winner
                  ? 'Congratulations! Valid 13-card rummy hand declared.'
                  : 'Good game! Review your cards and start a rematch.'}
              </Text>
            </View>
          </View>

          {/* Scoreboard */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>PENALTY POINTS</Text>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreCol, winner && styles.winnerCol]}>
                <Text style={styles.scorePlayerName}>{myName}</Text>
                <Text style={[styles.scorePoints, winner && styles.winnerPoints]}>
                  {winner ? myScore : opponentScore}
                </Text>
                <Text style={styles.scorePtsLabel}>pts</Text>
              </View>

              <Text style={styles.vsText}>VS</Text>

              <View style={[styles.scoreCol, !winner && styles.winnerCol]}>
                <Text style={styles.scorePlayerName}>{opponentName}</Text>
                <Text style={[styles.scorePoints, !winner && styles.winnerPoints]}>
                  {winner ? opponentScore : myScore}
                </Text>
                <Text style={styles.scorePtsLabel}>pts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Hand Review & Actions */}
        <View style={styles.rightCol}>
          <Text style={styles.sectionTitle}>YOUR FINAL HAND</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handRow}
          >
            {view.hand?.map(c => (
              <CardView key={c.id} card={c} size="sm" style={styles.cardItem} />
            ))}
          </ScrollView>

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
    flex: 1.1,
    justifyContent: 'center',
    gap: 12,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 14,
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
    fontSize: 36,
  },
  resultTitle: {
    color: COLORS.goldLight,
    fontSize: 20,
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
    padding: 12,
  },
  scoreTitle: {
    color: COLORS.textLabel,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreCol: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 100,
  },
  winnerCol: {
    backgroundColor: '#1a4e2c',
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  scorePlayerName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  scorePoints: {
    color: COLORS.textSecondary,
    fontSize: 28,
    fontWeight: '900',
  },
  winnerPoints: {
    color: COLORS.success,
  },
  scorePtsLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  vsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },

  rightCol: {
    flex: 1,
    backgroundColor: COLORS.panelBg,
    borderRadius: 14,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  handRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  cardItem: {
    marginRight: 4,
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
    marginTop: 8,
  },
  rematchBtn: {
    flex: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});
