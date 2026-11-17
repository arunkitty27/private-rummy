import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, Modal, TouchableOpacity,
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
  const [localError, setLocalError] = useState<string | null>(null);

  // Modal dialog states to prevent keyboard overlay issues in landscape
  const [activeModal, setActiveModal] = useState<'name' | 'code' | null>(null);
  const [tempInput, setTempInput] = useState('');

  const openInputModal = (type: 'name' | 'code') => {
    setLocalError(null);
    setTempInput(type === 'name' ? name : roomCode);
    setActiveModal(type);
  };

  const saveModalInput = () => {
    if (activeModal === 'name') {
      setName(tempInput.trim());
    } else if (activeModal === 'code') {
      setRoomCode(tempInput.trim().toUpperCase());
    }
    setActiveModal(null);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setLocalError('Please enter your name first.');
      openInputModal('name');
      return;
    }
    setLocalError(null);
    onCreateRoom(name.trim());
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setLocalError('Please enter your name first.');
      openInputModal('name');
      return;
    }
    if (!roomCode.trim()) {
      setLocalError('Please enter the 6-character room code.');
      openInputModal('code');
      return;
    }
    setLocalError(null);
    onJoinRoom(name.trim(), roomCode.trim().toUpperCase());
  };

  return (
    <View style={styles.root}>
      {/* Landscape layout: Left Brand / Right Controls */}
      <View style={styles.layoutRow}>
        {/* Left Side: Brand & Status */}
        <View style={styles.leftCol}>
          <Text style={styles.spadeIcon}>♠</Text>
          <Text style={styles.brandTitle}>PRIVATE RUMMY</Text>
          <Text style={styles.tagline}>Classic 13-Card Table for Two</Text>

          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : COLORS.warning }]} />
            <Text style={styles.statusText}>{connected ? 'ONLINE · SERVER READY' : 'CONNECTING TO SERVER…'}</Text>
          </View>

          <Text style={styles.disclaimer}>Recreational Play · No Real Money</Text>
        </View>

        {/* Right Side: Interactive Action Card */}
        <View style={styles.rightCol}>
          <ScrollView
            contentContainerStyle={styles.scrollCard}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name Input Bar */}
            <Text style={styles.fieldLabel}>YOUR PLAYER NAME</Text>
            <TouchableOpacity
              style={styles.inputTrigger}
              onPress={() => openInputModal('name')}
              activeOpacity={0.8}
            >
              <Text style={name ? styles.inputTextFilled : styles.inputTextPlaceholder}>
                {name || 'Tap to enter your name'}
              </Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>

            {/* Start Game Action */}
            <Pressable
              style={[styles.createBtn, (!connected || busy) && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={!connected || busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.bgDark} size="small" />
              ) : (
                <Text style={styles.createBtnText}>＋ CREATE NEW ROOM</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>OR JOIN WITH CODE</Text>
              <View style={styles.divLine} />
            </View>

            {/* Room Code Input Bar & Join Button */}
            <View style={styles.joinRow}>
              <TouchableOpacity
                style={[styles.inputTrigger, styles.codeTrigger]}
                onPress={() => openInputModal('code')}
                activeOpacity={0.8}
              >
                <Text style={roomCode ? styles.codeTextFilled : styles.inputTextPlaceholder}>
                  {roomCode || 'ROOM CODE'}
                </Text>
              </TouchableOpacity>

              <Pressable
                style={[styles.joinBtn, (!connected || busy) && styles.disabledBtn]}
                onPress={handleJoin}
                disabled={!connected || busy}
              >
                <Text style={styles.joinBtnText}>JOIN</Text>
              </Pressable>
            </View>

            {/* Error alerts */}
            {(!!error || !!localError) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error || localError}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Floating Dialog Modal for typing in Landscape */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>
              {activeModal === 'name' ? 'Enter Player Name' : 'Enter 6-Character Room Code'}
            </Text>
            <Text style={styles.dialogSub}>
              {activeModal === 'name'
                ? 'Your partner will see this name at the table.'
                : 'Enter the code given to you by the room creator.'}
            </Text>

            <TextInput
              style={[styles.dialogInput, activeModal === 'code' && styles.dialogCodeInput]}
              value={tempInput}
              onChangeText={activeModal === 'code' ? t => setTempInput(t.toUpperCase()) : setTempInput}
              placeholder={activeModal === 'name' ? 'e.g. Arun' : 'e.g. ABC123'}
              placeholderTextColor="#618976"
              autoFocus
              maxLength={activeModal === 'name' ? 24 : 6}
              autoCapitalize={activeModal === 'code' ? 'characters' : 'words'}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={saveModalInput}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={saveModalInput}
              >
                <Text style={styles.confirmBtnText}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  leftCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    padding: 16,
  },
  spadeIcon: {
    fontSize: 48,
    color: COLORS.gold,
    marginBottom: 4,
  },
  brandTitle: {
    color: COLORS.goldLight,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disclaimer: {
    color: COLORS.textMuted,
    fontSize: 9,
    letterSpacing: 1,
  },

  rightCol: {
    flex: 1.2,
    backgroundColor: COLORS.panelBg,
    borderRadius: 16,
    borderColor: COLORS.panelBorder,
    borderWidth: 1,
    padding: 14,
  },
  scrollCard: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fieldLabel: {
    color: COLORS.textLabel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputTrigger: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputTextFilled: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  inputTextPlaceholder: {
    color: '#658a79',
    fontSize: 13,
  },
  editIcon: {
    fontSize: 14,
  },
  createBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  createBtnText: {
    color: COLORS.bgDark,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.panelBorder,
  },
  divText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  codeTrigger: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  codeTextFilled: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: COLORS.tableGreen,
    borderColor: COLORS.tableBorder,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 11,
    textAlign: 'center',
  },

  // Modal Dialog Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '80%',
    maxWidth: 480,
    backgroundColor: COLORS.panelBg,
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  dialogTitle: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  dialogSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 14,
  },
  dialogInput: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  dialogCodeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
    color: COLORS.goldLight,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  confirmBtnText: {
    color: COLORS.bgDark,
    fontSize: 12,
    fontWeight: '900',
  },
});
