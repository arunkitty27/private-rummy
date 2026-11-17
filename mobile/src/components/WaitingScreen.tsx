import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Alert,
  Share,
} from 'react-native';
import { COLORS } from '../lib/constants';

interface WaitingScreenProps {
  roomCode: string;
  playerName?: string;
  onLeave: () => void;
}

export default function WaitingScreen({ roomCode, onLeave }: WaitingScreenProps) {
  const dots = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dots, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dots, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dots]);

  const copyCode = async () => {
    try {
      await Share.share({ message: `Join my Private Rummy game! Room code: ${roomCode}` });
    } catch {
      Alert.alert('Room code', roomCode);
    }
  };

  const confirmLeave = () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room?',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.leftCol}>
          <Animated.View style={[styles.pulseCircle, { opacity: dots }]}>
            <Text style={styles.pulseIcon}>⏳</Text>
          </Animated.View>
          <Text style={styles.title}>Waiting for your partner</Text>
          <Text style={styles.subtitle}>
            Share this 6-character code with your partner to start the game.
          </Text>
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <Text style={styles.codeText}>{roomCode}</Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.shareBtn} onPress={copyCode}>
              <Text style={styles.shareBtnText}>📤  SHARE CODE</Text>
            </Pressable>

            <Pressable style={styles.leaveBtn} onPress={confirmLeave}>
              <Text style={styles.leaveBtnText}>✕ LEAVE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    flexDirection: 'row',
    width: '90%',
    maxWidth: 680,
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 24,
  },
  leftCol: {
    flex: 1,
    alignItems: 'center',
  },
  pulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulseIcon: {
    fontSize: 28,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  rightCol: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  codeLabel: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  codeText: {
    color: COLORS.goldLight,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shareBtnText: {
    color: COLORS.bgDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leaveBtn: {
    borderColor: '#e74c3c',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  leaveBtnText: {
    color: '#ffb4a9',
    fontSize: 12,
    fontWeight: '800',
  },
});
