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

export default function WaitingScreen({ roomCode, playerName, onLeave }: WaitingScreenProps) {
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dots, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dots, { toValue: 0, duration: 600, useNativeDriver: true }),
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
    <View style={styles.container}>
      {/* Animated waiting indicator */}
      <Animated.View style={[styles.pulseCircle, { opacity: dots }]}>
        <Text style={styles.pulseIcon}>⏳</Text>
      </Animated.View>

      <Text style={styles.title}>Waiting for your partner</Text>
      <Text style={styles.subtitle}>
        Share this room code with the person you want to play with.
      </Text>

      {/* Room code display */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode}</Text>
        <Pressable style={styles.copyBtn} onPress={copyCode} accessibilityLabel="Copy room code">
          <Text style={styles.copyBtnText}>📤  SHARE CODE</Text>
        </Pressable>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ  Both players need an internet connection. The game starts automatically when your partner joins.
        </Text>
      </View>

      {/* Leave */}
      <Pressable style={styles.leaveBtn} onPress={confirmLeave} accessibilityLabel="Leave room">
        <Text style={styles.leaveBtnText}>LEAVE ROOM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.panelBorder,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseIcon: { fontSize: 32 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeCard: {
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.gold,
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  codeLabel: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  code: {
    color: COLORS.goldLight,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 20,
  },
  copyBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  copyBtnText: {
    color: COLORS.bgDark,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  infoBox: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 32,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  leaveBtn: {
    borderColor: '#d1716a',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  leaveBtnText: {
    color: '#f1a19a',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
});
