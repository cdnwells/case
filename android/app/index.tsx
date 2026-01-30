import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { ChatScreen } from '@/components/chat';
import { ThemedView } from '@/components/themed-view';

export default function App() {
  const { isAuthenticated, isLoading, error, authenticate } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      authenticate();
    }
  }, [isAuthenticated, isLoading, authenticate]);

  if (!isAuthenticated) {
    return (
      <BiometricLockScreen onAuthenticate={authenticate} isLoading={isLoading} error={error} />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ChatScreen />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
