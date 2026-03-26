import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
} from "../modules/battery-optimization";

interface UseBatteryOptimizationReturn {
  isExempted: boolean;
  isChecking: boolean;
  request: () => void;
}

export function useBatteryOptimization(): UseBatteryOptimizationReturn {
  const [isExempted, setIsExempted] = useState(Platform.OS !== "android");
  const [isChecking, setIsChecking] = useState(Platform.OS === "android");

  const checkStatus = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      const exempted = isIgnoringBatteryOptimizations();
      setIsExempted(exempted);
    } catch {
      setIsExempted(false);
    }
    setIsChecking(false);
  }, []);

  const request = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      requestIgnoreBatteryOptimizations();
    } catch {
      // Intent failed — status will be re-checked on foreground
    }
  }, []);

  // Check status on mount
  useEffect(() => {
    if (Platform.OS !== "android") return;
    checkStatus();
  }, [checkStatus]);

  // Re-check when app comes back to foreground (after user interacts with the system dialog)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkStatus();
      }
    });

    return () => subscription.remove();
  }, [checkStatus]);

  return { isExempted, isChecking, request };
}
