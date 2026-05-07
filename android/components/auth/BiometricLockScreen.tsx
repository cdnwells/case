import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed-text';
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
  return (
    <LinearGradient
      colors={['#020610', '#071936', '#020610']}
      locations={[0, 0.48, 1]}
      start={{ x: 0.12, y: 0 }}
      end={{ x: 0.88, y: 1 }}
      style={styles.container}>
      <View style={styles.guideLineVertical} />
      <View style={styles.guideLineHorizontal} />

      <View style={styles.content}>
        <View style={styles.logoFrame}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <View style={styles.copy}>
          <ThemedText type="title" style={styles.title}>
            케이스 잠금
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            생체 인증으로 보호된 채팅을 이어가세요
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <IconSymbol name="lock.fill" size={16} color="#ffb4a6" />
            <ThemedText style={styles.error}>{error}</ThemedText>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <ThemedText style={styles.statusText}>보안 세션 대기 중</ThemedText>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.78}
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onAuthenticate}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff4d8" />
          ) : (
            <View style={styles.buttonContent}>
              <IconSymbol name="touchid" size={22} color="#fff4d8" />
              <ThemedText style={styles.buttonText}>잠금 해제</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  guideLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(77, 235, 255, 0.08)',
  },
  guideLineHorizontal: {
    position: 'absolute',
    top: '46%',
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255, 244, 216, 0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  logoFrame: {
    width: 172,
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 216, 0.22)',
    backgroundColor: 'rgba(255, 244, 216, 0.06)',
    shadowColor: '#4debff',
    shadowOpacity: 0.28,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  logo: {
    width: 136,
    height: 136,
    borderRadius: 34,
  },
  copy: {
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 28,
  },
  title: {
    color: '#fff4d8',
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 280,
    marginTop: 10,
    color: 'rgba(255, 244, 216, 0.72)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  statusRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4debff',
    shadowColor: '#4debff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: {
    color: 'rgba(255, 244, 216, 0.64)',
    fontSize: 13,
    lineHeight: 18,
  },
  errorPanel: {
    minHeight: 44,
    maxWidth: 312,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 166, 0.36)',
    backgroundColor: 'rgba(255, 180, 166, 0.1)',
  },
  error: {
    flex: 1,
    color: '#ffb4a6',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minWidth: 236,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(77, 235, 255, 0.58)',
    backgroundColor: 'rgba(77, 235, 255, 0.14)',
    shadowColor: '#4debff',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff4d8',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
