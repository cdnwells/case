import { useCallback, useEffect, useState } from "react";
import { AppState, NativeModules, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

const PACKAGE_NAME =
  NativeModules.AndroidConstants?.packageName ?? "com.cdnwell.caseandroid";

async function requestBatteryExemption(): Promise<boolean> {
  try {
    const result = await IntentLauncher.startActivityAsync(
      "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      { data: `package:${PACKAGE_NAME}` },
    );
    // resultCode -1 = RESULT_OK (user allowed)
    return result.resultCode === -1;
  } catch {
    try {
      // Fallback: open the battery optimization settings list
      await IntentLauncher.startActivityAsync(
        "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
      );
      // Can't determine result from the list view
      return false;
    } catch {
      return false;
    }
  }
}

interface UseBatteryOptimizationReturn {
  isExempted: boolean;
  isChecking: boolean;
  request: () => Promise<void>;
}

export function useBatteryOptimization(): UseBatteryOptimizationReturn {
  const [isExempted, setIsExempted] = useState(Platform.OS !== "android");
  const [isChecking, setIsChecking] = useState(Platform.OS === "android");

  const checkAndRequest = useCallback(async () => {
    if (Platform.OS !== "android") {
      setIsExempted(true);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    const granted = await requestBatteryExemption();
    setIsExempted(granted);
    setIsChecking(false);
  }, []);

  // Auto-request on mount
  useEffect(() => {
    if (Platform.OS !== "android") return;
    checkAndRequest();
  }, [checkAndRequest]);

  // Re-check when app comes back to foreground (in case user changed it in settings)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !isExempted) {
        checkAndRequest();
      }
    });

    return () => subscription.remove();
  }, [isExempted, checkAndRequest]);

  return { isExempted, isChecking, request: checkAndRequest };
}
