import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';

interface BiometricLockScreenProps {
  onAuthenticate: () => void;
  isLoading: boolean;
  error: string | null;
}

export function BiometricLockScreen({
  onAuthenticate,
  isLoading,
  error,
}: BiometricLockScreenProps) {
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="lock.fill" size={80} color={tintColor} style={styles.icon} />

      <ThemedText type="title" style={styles.title}>
        채팅은 보안됩니다
      </ThemedText>

      <ThemedText style={styles.subtitle}>지문을 인증해주세요</ThemedText>

      <TouchableOpacity
        style={[styles.button, { borderColor: tintColor }]}
        onPress={onAuthenticate}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={tintColor} />
        ) : (
          <ThemedText style={[styles.buttonText, { color: tintColor }]}>
            지문으로 잠금해제
          </ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 40,
  },
  error: {
    color: '#ff4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
