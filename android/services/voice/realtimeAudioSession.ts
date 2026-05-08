import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type NativeRealtimeAudioSessionModule = {
  start: (speakerphone: boolean) => boolean;
  stop: () => boolean;
};

let nativeRealtimeAudioSessionModule:
  | NativeRealtimeAudioSessionModule
  | null
  | undefined;

function getNativeRealtimeAudioSessionModule(): NativeRealtimeAudioSessionModule | null {
  if (Platform.OS !== "android") {
    return null;
  }

  if (nativeRealtimeAudioSessionModule !== undefined) {
    return nativeRealtimeAudioSessionModule;
  }

  nativeRealtimeAudioSessionModule =
    requireOptionalNativeModule<NativeRealtimeAudioSessionModule>(
      "CaseRealtimeAudioSession",
    ) || null;

  return nativeRealtimeAudioSessionModule;
}

export function startRealtimeAudioSession({
  speakerphone = true,
}: { speakerphone?: boolean } = {}): boolean {
  try {
    return Boolean(getNativeRealtimeAudioSessionModule()?.start(speakerphone));
  } catch {
    return false;
  }
}

export function stopRealtimeAudioSession(): boolean {
  try {
    return Boolean(getNativeRealtimeAudioSessionModule()?.stop());
  } catch {
    return false;
  }
}
