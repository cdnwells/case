import {
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  type ActiveAudioFormat,
  type CapturedAudioFrame,
  type CircularAudioBufferInput,
} from "../../constants/audioBuffer.ts";
import type {
  VoiceEmbedding,
  VoiceGateFrame,
} from "./voiceGate";

const BUFFERED_AUDIO_REDACTION_LABEL =
  "[buffered audio redacted: local memory only]";
const NODE_INSPECT_CUSTOM = Symbol.for("nodejs.util.inspect.custom");
const CONTINUOUS_CAPTURE_BUFFER_LOCATION_ON_DEVICE = "on-device";
const CONTINUOUS_CAPTURE_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY =
  "ephemeral-in-memory";
const CONTINUOUS_CAPTURE_AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED =
  "discard-unless-explicitly-saved";
const CONTINUOUS_CAPTURE_AUDIO_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY =
  "local-memory-only";
const CONTINUOUS_CAPTURE_PERSISTENCE_HOOK_GUARD_ERROR =
  "capture audio must remain in local memory unless explicitly saved; automatic audio buffer persistence or retention hooks are not supported";
const PROHIBITED_CONTINUOUS_CAPTURE_PERSISTENCE_HOOKS = Object.freeze([
  "audioRetentionDurationSeconds",
  "backgroundQueue",
  "backgroundWorker",
  "backgroundWorkerQueue",
  "audioFilePath",
  "audioFileUri",
  "cacheKey",
  "deleteFile",
  "filePath",
  "fileUri",
  "persistedAudioUri",
  "retentionAdapter",
  "retentionSink",
  "persistenceAdapter",
  "persistenceSink",
  "onRetainAudio",
  "onPersistAudio",
  "offlineStorage",
  "offlineStorageAdapter",
  "offlineStorageKey",
  "queue",
  "queueAdapter",
  "queueSink",
  "sessionPersistence",
  "sessionPersistenceAdapter",
  "sessionSnapshot",
  "sessionStorage",
  "sessionStorageKey",
  "storageAdapter",
  "storageKey",
  "temporaryCapturedAudioFile",
  "temporaryCapturedAudioFiles",
  "unsavedCapturedAudioCache",
  "unsavedCapturedAudioCaches",
  "writeFile",
] as const);

export const DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT: ActiveAudioFormat = {
  sampleRateHz: 16000,
  channelCount: 1,
  bytesPerSample: 2,
};
export const DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS =
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS;
export const DEFAULT_CONTINUOUS_CAPTURE_ROLLING_BUFFER_WINDOW_DURATION_SECONDS =
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS;
export const DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED =
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT;
export const DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT = false;
export const DEFAULT_CONTINUOUS_CAPTURE_PRIVACY_PROFILE = Object.freeze({
  processingWindowDurationSeconds:
    DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS,
  rollingBufferWindowDurationSeconds:
    DEFAULT_CONTINUOUS_CAPTURE_ROLLING_BUFFER_WINDOW_DURATION_SECONDS,
  rawAudioPersistenceEnabled:
    DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED,
  saveIntentPresent: DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  bufferLocation: CONTINUOUS_CAPTURE_BUFFER_LOCATION_ON_DEVICE,
  bufferStorageKind: CONTINUOUS_CAPTURE_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  persistencePolicy:
    CONTINUOUS_CAPTURE_AUDIO_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  automaticPersistenceEnabled: false,
  automaticRetentionEnabled: false,
  audioRetentionPolicy:
    CONTINUOUS_CAPTURE_AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
} as const);

export interface ContinuousMicrophoneCapturePrivacyProfile {
  processingWindowDurationSeconds: typeof DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS;
  rollingBufferWindowDurationSeconds: typeof DEFAULT_CONTINUOUS_CAPTURE_ROLLING_BUFFER_WINDOW_DURATION_SECONDS;
  rawAudioPersistenceEnabled: typeof DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED;
  saveIntentPresent: typeof DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT;
  bufferLocation: typeof CONTINUOUS_CAPTURE_BUFFER_LOCATION_ON_DEVICE;
  bufferStorageKind: typeof CONTINUOUS_CAPTURE_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  persistencePolicy: typeof CONTINUOUS_CAPTURE_AUDIO_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY;
  automaticPersistenceEnabled: false;
  automaticRetentionEnabled: false;
  audioRetentionPolicy: typeof CONTINUOUS_CAPTURE_AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ContinuousMicrophoneAudioFrame {
  audioBytes: CircularAudioBufferInput;
  embedding?: VoiceEmbedding;
  timestampMs?: number;
  utteranceId?: string;
  sequence?: number;
  saveIntentPresent?: boolean;
  bufferStorageKind?: typeof CONTINUOUS_CAPTURE_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  processingWindowDurationSeconds?: number;
  rollingBufferWindowDurationSeconds?: number;
  rawAudioPersistenceEnabled?: boolean;
}

interface ContinuousMicrophoneCaptureHandlers {
  onAudioFrame: (frame: ContinuousMicrophoneAudioFrame) => void;
  onError?: (error: unknown) => void;
}

export interface ContinuousMicrophoneCapture {
  start: (
    handlers: ContinuousMicrophoneCaptureHandlers,
  ) => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export interface VoiceGateFrameSourceHandlers {
  onFrame: (frame: CapturedAudioFrame<VoiceGateFrame>) => void;
  onError?: (error: unknown) => void;
}

export interface VoiceGateFrameSource {
  start: (handlers: VoiceGateFrameSourceHandlers) => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export type MicrophoneEmbeddingExtractor = (
  frame: ContinuousMicrophoneAudioFrame,
) => VoiceEmbedding;

export function createContinuousMicrophoneFrameSource(
  capture: ContinuousMicrophoneCapture,
  {
    extractEmbedding = createPcm16AudioEmbedding,
  }: {
    extractEmbedding?: MicrophoneEmbeddingExtractor;
  } = {},
): VoiceGateFrameSource {
  return {
    start: (handlers) =>
      capture.start({
        onAudioFrame: (frame) => {
          let nonPersistableFrame: ContinuousMicrophoneAudioFrame | null = null;

          try {
            nonPersistableFrame =
              createNonPersistableContinuousMicrophoneAudioFrame(frame);
            handlers.onFrame(
              createVoiceGateFrameFromContinuousMicrophoneCapture(
                nonPersistableFrame,
                {
                  extractEmbedding,
                },
              ),
            );
          } catch (error) {
            handlers.onError?.(error);
          } finally {
            releaseContinuousMicrophoneAudioFrame(frame);
            releaseContinuousMicrophoneAudioFrame(nonPersistableFrame);
          }
        },
        onError: handlers.onError,
      }),
    stop: () => capture.stop(),
  };
}

export function getDefaultContinuousCapturePrivacyProfile(): ContinuousMicrophoneCapturePrivacyProfile {
  return { ...DEFAULT_CONTINUOUS_CAPTURE_PRIVACY_PROFILE };
}

export function createNonPersistableContinuousMicrophoneAudioFrame(
  frame: ContinuousMicrophoneAudioFrame,
): ContinuousMicrophoneAudioFrame {
  assertDefaultCaptureFrameHasNoSaveIntent(frame);
  const { audioBytes: _audioBytes, ...metadata } = frame;
  return attachNonPersistableAudioBytes(metadata, frame.audioBytes);
}

export function createVoiceGateFrameFromContinuousMicrophoneCapture(
  frame: ContinuousMicrophoneAudioFrame,
  {
    extractEmbedding = createPcm16AudioEmbedding,
  }: {
    extractEmbedding?: MicrophoneEmbeddingExtractor;
  } = {},
): CapturedAudioFrame<VoiceGateFrame> {
  return attachNonPersistableAudioBytes(
    {
      embedding: frame.embedding ?? extractEmbedding(frame),
      timestampMs: frame.timestampMs ?? Date.now(),
      utteranceId: frame.utteranceId,
    },
    frame.audioBytes,
  );
}

export function createPcm16AudioEmbedding(
  frame: ContinuousMicrophoneAudioFrame,
  bucketCount = 16,
): VoiceEmbedding {
  const bytes = normalizeAudioBytes(frame.audioBytes);
  if (bytes.length < 2 || bucketCount <= 0) return [];

  const sampleCount = Math.floor(bytes.length / 2);
  const buckets = Array.from({ length: bucketCount }, () => 0);
  const bucketSampleCounts = Array.from({ length: bucketCount }, () => 0);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const byteOffset = sampleIndex * 2;
    const unsignedSample = bytes[byteOffset] | (bytes[byteOffset + 1] << 8);
    const signedSample =
      unsignedSample >= 0x8000 ? unsignedSample - 0x10000 : unsignedSample;
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.floor((sampleIndex / sampleCount) * bucketCount),
    );

    buckets[bucketIndex] += Math.abs(signedSample / 0x8000);
    bucketSampleCounts[bucketIndex] += 1;
  }

  const averagedBuckets = buckets.map((value, index) =>
    bucketSampleCounts[index] === 0 ? 0 : value / bucketSampleCounts[index],
  );
  const magnitude = Math.sqrt(
    averagedBuckets.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) return [];
  return averagedBuckets.map((value) => value / magnitude);
}

function normalizeAudioBytes(audioBytes: CircularAudioBufferInput): Uint8Array {
  if (audioBytes instanceof ArrayBuffer) {
    return new Uint8Array(audioBytes);
  }

  if (ArrayBuffer.isView(audioBytes)) {
    return new Uint8Array(
      audioBytes.buffer,
      audioBytes.byteOffset,
      audioBytes.byteLength,
    );
  }

  return Uint8Array.from(audioBytes);
}

function attachNonPersistableAudioBytes<TFrame extends object>(
  frameWithoutAudio: TFrame,
  audioBytes: CircularAudioBufferInput,
): CapturedAudioFrame<TFrame> {
  const frame = { ...frameWithoutAudio };
  Object.defineProperty(frame, "audioBytes", {
    value: createNonPersistableAudioBytes(audioBytes),
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return frame as CapturedAudioFrame<TFrame>;
}

function createNonPersistableAudioBytes(
  audioBytes: CircularAudioBufferInput,
): Uint8Array {
  return markAudioBytesAsNonPersistable(
    new Uint8Array(normalizeAudioBytes(audioBytes)),
  );
}

function markAudioBytesAsNonPersistable<TAudioBytes extends Uint8Array>(
  audioBytes: TAudioBytes,
): TAudioBytes {
  defineRedactionMethod(audioBytes, "toJSON");
  defineRedactionMethod(audioBytes, "toString");
  defineRedactionMethod(audioBytes, NODE_INSPECT_CUSTOM);
  return audioBytes;
}

function assertDefaultCaptureFrameHasNoSaveIntent(
  frame: ContinuousMicrophoneAudioFrame,
): void {
  assertNoAutomaticCapturePersistenceHooks(frame);

  const saveIntentPresent =
    frame.saveIntentPresent ?? DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT;
  const rawAudioPersistenceEnabled =
    frame.rawAudioPersistenceEnabled ??
    DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED;

  if (
    saveIntentPresent !== DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT ||
    rawAudioPersistenceEnabled !==
      DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED
  ) {
    throw new Error(
      "default continuous microphone capture stores only transient in-memory audio without an approved save intent or raw audio persistence",
    );
  }
}

function assertNoAutomaticCapturePersistenceHooks(frame: object): void {
  for (const key of PROHIBITED_CONTINUOUS_CAPTURE_PERSISTENCE_HOOKS) {
    if (Object.prototype.hasOwnProperty.call(frame, key)) {
      throw new Error(
        `${CONTINUOUS_CAPTURE_PERSISTENCE_HOOK_GUARD_ERROR}: ${key}`,
      );
    }
  }
}

function releaseContinuousMicrophoneAudioFrame(
  frame: Partial<ContinuousMicrophoneAudioFrame> | null | undefined,
): void {
  if (!frame || !Object.prototype.hasOwnProperty.call(frame, "audioBytes")) {
    return;
  }

  releaseAudioBytes(frame.audioBytes);

  try {
    delete frame.audioBytes;
  } catch {
    // Non-configurable platform frames are still scrubbed in-place above.
  }
}

function releaseAudioBytes(
  audioBytes: CircularAudioBufferInput | undefined,
): void {
  if (audioBytes === undefined) return;

  try {
    if (audioBytes instanceof ArrayBuffer) {
      new Uint8Array(audioBytes).fill(0);
      return;
    }

    if (ArrayBuffer.isView(audioBytes)) {
      new Uint8Array(
        audioBytes.buffer,
        audioBytes.byteOffset,
        audioBytes.byteLength,
      ).fill(0);
      return;
    }

    if (Array.isArray(audioBytes)) {
      for (let index = 0; index < audioBytes.length; index += 1) {
        (audioBytes as number[])[index] = 0;
      }
    }
  } catch {
    // Best-effort release; immutable host-owned buffers may not be writable.
  }
}

function defineRedactionMethod(target: object, key: PropertyKey): void {
  try {
    Object.defineProperty(target, key, {
      value: () => BUFFERED_AUDIO_REDACTION_LABEL,
      enumerable: false,
      configurable: true,
    });
  } catch {
    // Frozen platform-owned buffers still stay inside the local capture path.
  }
}
