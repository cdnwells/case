import { requireNativeModule } from "expo-modules-core";

const BatteryOptimizationModule = requireNativeModule("BatteryOptimization");

export function isIgnoringBatteryOptimizations(): boolean {
  return BatteryOptimizationModule.isIgnoringBatteryOptimizations();
}

export function requestIgnoreBatteryOptimizations(): void {
  BatteryOptimizationModule.requestIgnoreBatteryOptimizations();
}
