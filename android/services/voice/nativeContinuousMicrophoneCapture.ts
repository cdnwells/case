import { requireOptionalNativeModule } from "expo";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  assertRollingBufferDeprecatedDurationNotOverridden,
  createRollingAudioBufferConfig,
  type ActiveAudioFormat,
} from "../../constants/audioBuffer";
import {
  createContinuousMicrophoneFrameSource,
  DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT,
  DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS,
  DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED,
  DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  type ContinuousMicrophoneAudioFrame,
  type ContinuousMicrophoneCapture,
  type VoiceGateFrameSource,
} from "./continuousMicrophoneCapture";

export const CONTINUOUS_MICROPHONE_CAPTURE_FRAME_DURATION_MS =
  DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS * 1000;

interface NativeContinuousMicrophoneCaptureModule {
  start: (options: NativeContinuousMicrophoneCaptureOptions) => void;
  stop: () => void;
  addListener: (
    eventName: "audioFrame" | "error",
    listener: (event: NativeContinuousMicrophoneAudioFrame | NativeErrorEvent) => void,
  ) => { remove: () => void };
}

interface NativeContinuousMicrophoneCaptureOptions extends ActiveAudioFormat {
  frameDurationMs: number;
  saveIntentPresent: typeof DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT;
  processingWindowDurationSeconds: typeof DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS;
  rollingBufferWindowDurationSeconds: number;
  rawAudioPersistenceEnabled: typeof DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED;
}

interface NativeContinuousMicrophoneFrameSourceOptions {
  activeAudioFormat?: ActiveAudioFormat;
  frameDurationMs?: number;
  rollingBufferActiveDurationSeconds?: number;
}

type NativeContinuousMicrophoneAudioFrame = ContinuousMicrophoneAudioFrame & {
  audioBytes: number[];
};

interface NativeErrorEvent {
  message?: string;
  code?: string;
}

export function createNativeContinuousMicrophoneFrameSource(
  options: NativeContinuousMicrophoneFrameSourceOptions = {},
): VoiceGateFrameSource | null {
  assertRollingBufferDeprecatedDurationNotOverridden(options);
  const {
    activeAudioFormat = DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT,
    frameDurationMs = CONTINUOUS_MICROPHONE_CAPTURE_FRAME_DURATION_MS,
    rollingBufferActiveDurationSeconds,
  } = options;
  const rollingBufferConfig = createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds,
  });
  const nativeModule =
    requireOptionalNativeModule<NativeContinuousMicrophoneCaptureModule>(
      "CaseContinuousMicrophoneCapture",
    );

  if (!nativeModule) return null;

  return createContinuousMicrophoneFrameSource(
    createNativeContinuousMicrophoneCapture(nativeModule, {
      ...activeAudioFormat,
      frameDurationMs,
      saveIntentPresent: DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
      processingWindowDurationSeconds:
        DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS,
      rollingBufferWindowDurationSeconds:
        rollingBufferConfig.rollingBufferActiveDurationSeconds,
      rawAudioPersistenceEnabled:
        DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED,
    }),
  );
}

function createNativeContinuousMicrophoneCapture(
  nativeModule: NativeContinuousMicrophoneCaptureModule,
  options: NativeContinuousMicrophoneCaptureOptions,
): ContinuousMicrophoneCapture {
  let frameSubscription: { remove: () => void } | null = null;
  let errorSubscription: { remove: () => void } | null = null;

  return {
    start: async (handlers) => {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (!granted) {
        const error = new Error("microphone permission was not granted");
        handlers.onError?.(error);
        throw error;
      }

      frameSubscription = nativeModule.addListener("audioFrame", (event) => {
        handlers.onAudioFrame(event as NativeContinuousMicrophoneAudioFrame);
      });
      errorSubscription = nativeModule.addListener("error", (event) => {
        const nativeError = event as NativeErrorEvent;
        handlers.onError?.(
          new Error(nativeError.message || "continuous microphone capture failed"),
        );
      });

      nativeModule.start(options);
    },
    stop: () => {
      frameSubscription?.remove();
      errorSubscription?.remove();
      frameSubscription = null;
      errorSubscription = null;
      nativeModule.stop();
    },
  };
}
