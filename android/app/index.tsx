import { BiometricLockScreen } from "@/components/auth/BiometricLockScreen";
import { BatteryOptimizationScreen } from "@/components/auth/BatteryOptimizationScreen";
import { ChatScreen } from "@/components/chat";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedVoiceProfileRuntime } from "@/hooks/useApprovedVoiceProfileRuntime";
import { useBatteryOptimization } from "@/hooks/useBatteryOptimization";
import React, { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  const { isAuthenticated, isLoading, error, authenticate } = useAuth();
  const { isExempted, isChecking, request } = useBatteryOptimization();
  const isWeb = Platform.OS === "web";
  useApprovedVoiceProfileRuntime({
    enabled: isWeb || isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      authenticate();
    }
  }, [isAuthenticated, authenticate]);

  if (!isAuthenticated && !isWeb) {
    return (
      <BiometricLockScreen
        onAuthenticate={authenticate}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (!isExempted && !isWeb) {
    return (
      <BatteryOptimizationScreen onRequest={request} isChecking={isChecking} />
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
