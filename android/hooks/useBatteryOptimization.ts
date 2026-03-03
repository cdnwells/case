import { useEffect } from "react";
import { Platform, NativeModules } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

export function useBatteryOptimization() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const requestIgnoreBatteryOptimization = async () => {
      try {
        // Open the battery optimization settings for this app
        // ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS directly prompts the user
        const packageName =
          NativeModules.AndroidConstants?.packageName ??
          "com.cdnwell.caseandroid";

        await IntentLauncher.startActivityAsync(
          "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
          {
            data: `package:${packageName}`,
          },
        );
      } catch {
        // Fallback: open general battery optimization settings
        try {
          await IntentLauncher.startActivityAsync(
            "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
          );
        } catch {
          // ignore if settings page is unavailable
        }
      }
    };

    requestIgnoreBatteryOptimization();
  }, []);
}
