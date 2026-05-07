import { BiometricLockScreen } from "@/components/auth/BiometricLockScreen";
import { BatteryOptimizationScreen } from "@/components/auth/BatteryOptimizationScreen";
import { ChatScreen } from "@/components/chat";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedVoiceProfileRuntime } from "@/hooks/useApprovedVoiceProfileRuntime";
import { useBatteryOptimization } from "@/hooks/useBatteryOptimization";
import React, { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PHONE_MAX_SHORTEST_SIDE_DP = 599;

export default function App() {
  const { width, height } = useWindowDimensions();
  const shortestSideDp = Math.min(width, height);
  const isSupportedSmartphone =
    Platform.OS === "android" && shortestSideDp <= PHONE_MAX_SHORTEST_SIDE_DP;

  if (!isSupportedSmartphone) {
    return <SmartphoneOnlyScreen />;
  }

  return <SmartphoneApp />;
}

function SmartphoneApp() {
  const { isAuthenticated, isLoading, error, authenticate } = useAuth();
  const { isExempted, isChecking, request } = useBatteryOptimization();
  const approvedVoiceProfileRuntime = useApprovedVoiceProfileRuntime({
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      authenticate();
    }
  }, [isAuthenticated, authenticate]);

  if (!isAuthenticated) {
    return (
      <BiometricLockScreen
        onAuthenticate={authenticate}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (!isExempted) {
    return (
      <BatteryOptimizationScreen onRequest={request} isChecking={isChecking} />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ChatScreen
          approvedVoiceProfileRuntimeStatus={approvedVoiceProfileRuntime.status}
          approvedVoiceCount={approvedVoiceProfileRuntime.approvedVoiceCount}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function SmartphoneOnlyScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.centeredSafeArea}>
        <View style={styles.unsupportedPanel}>
          <ThemedText type="title" style={styles.unsupportedTitle}>
            스마트폰 전용 앱
          </ThemedText>
          <ThemedText style={styles.unsupportedText}>
            Android 스마트폰의 개발 빌드에서만 사용할 수 있습니다.
          </ThemedText>
        </View>
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
  centeredSafeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  unsupportedPanel: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  unsupportedTitle: {
    textAlign: "center",
  },
  unsupportedText: {
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.72,
  },
});
