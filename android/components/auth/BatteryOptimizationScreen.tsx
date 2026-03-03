import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import { IconSymbol } from "../ui/icon-symbol";

interface BatteryOptimizationScreenProps {
  onRequest: () => void;
  isChecking: boolean;
}

export function BatteryOptimizationScreen({
  onRequest,
  isChecking,
}: BatteryOptimizationScreenProps) {
  const tintColor = useThemeColor({}, "tint");

  return (
    <ThemedView style={styles.container}>
      <IconSymbol
        name="battery.100.bolt"
        size={80}
        color={tintColor}
        style={styles.icon}
      />

      <ThemedText type="title" style={styles.title}>
        백그라운드 실행 권한 필요
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        음성 명령을 항상 감지하려면{"\n"}배터리 최적화를 해제해야 합니다.
      </ThemedText>

      <TouchableOpacity
        style={[styles.button, { borderColor: tintColor }]}
        onPress={onRequest}
        disabled={isChecking}
      >
        {isChecking ? (
          <ActivityIndicator color={tintColor} />
        ) : (
          <ThemedText style={[styles.buttonText, { color: tintColor }]}>
            배터리 최적화 해제
          </ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
