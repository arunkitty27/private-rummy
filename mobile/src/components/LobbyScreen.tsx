import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../lib/constants';

interface LobbyScreenProps {
  onCreateRoom: (name: string) => Promise<void>;
  onJoinRoom: (name: string, roomCode: string) => Promise<void>;
  connected: boolean;
  error: string | null;
  busy: boolean;
}

export default function LobbyScreen({
  onCreateRoom, onJoinRoom, connected, error, busy,
}: LobbyScreenProps) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateRoom(name.trim());
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    onJoinRoom(name.trim(), roomCode.trim().toUpperCase());
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>♠</Text>
          <Text style={styles.heroTitle}>PRIVATE RUMMY</Text>
          <Text style={styles.heroSub}>A private table for two friends</Text>
          <View style={styles.connRow}>
            <View style={[styles.dot, { backgroundColor: connected ? COLORS.success : COLORS.warning }]} />
            <Text style={styles.connText}>{connected ? 'Server reachable' : 'Connecting…'}</Text>
          </View>
        </View>

        {/* Name field (shared between create and join) */}
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#608a75"
            maxLength={24}
            autoCorrect={false}
            returnKeyType="next"
            editable={!busy}
          />

          {/* Create room */}
          <Text style={styles.label}>START A NEW GAME</Text>
          <Text style={styles.hint}>
            Create a room, then share the 6-character code with your partner.
          </Text>
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabledBtn]}
            onPress={handleCreate}
            disabled={busy}
            accessibilityLabel="Create Room"
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={COLORS.bgDark} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>＋ CREATE ROOM</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or join existing</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Join room */}
          <Text style={styles.label}>JOIN WITH ROOM CODE</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={roomCode}
            onChangeText={t => setRoomCode(t.toUpperCase())}
            placeholder="XXXXXX"
            placeholderTextColor="#608a75"
            autoCapitalize="characters"
            maxLength={6}
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
            editable={!busy}
          />
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabledBtn]}
            onPress={handleJoin}
            disabled={busy}
            accessibilityLabel="Join Room"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>JOIN ROOM</Text>
          </Pressable>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          RECREATIONAL PLAY ONLY · NO REAL MONEY
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: 28, paddingTop: 16 },
  heroIcon: { fontSize: 52, color: COLORS.gold, marginBottom: 4 },
  heroTitle: {
    color: COLORS.goldLight,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  heroSub: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12 },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  panel: {
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  label: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 20,
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  codeInput: {
    letterSpacing: 6,
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: COLORS.bgDark,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    borderColor: COLORS.goldDim,
    borderWidth: 1.5,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryBtnText: {
    color: COLORS.goldLight,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  disabledBtn: { opacity: 0.4 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.panelBorder },
  dividerText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  errorText: { color: COLORS.error, fontSize: 13, lineHeight: 20 },
  footer: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1.2,
    marginTop: 36,
  },
});
