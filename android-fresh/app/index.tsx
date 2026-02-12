import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { ChatScreen } from '@/components/chat';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const { isAuthenticated, isLoading, error, authenticate } = useAuth();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      authenticate();
    }
  }, [isAuthenticated, isLoading, authenticate]);

  if (!isAuthenticated && !isWeb) {
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
