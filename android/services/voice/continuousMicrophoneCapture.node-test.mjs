import {
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFERED_AUDIO_REDACTION_LABEL,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  DEFAULT_ROLLING_BUFFER_DURATION_SECONDS,
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  appendCapturedFrameToCircularBuffer,
  createOnDeviceCircularAudioBuffer,
} from "../../constants/audioBuffer.ts";
import { inspect } from "node:util";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createContinuousMicrophoneFrameSource,
  createPcm16AudioEmbedding,
  DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS,
  DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED,
  DEFAULT_CONTINUOUS_CAPTURE_ROLLING_BUFFER_WINDOW_DURATION_SECONDS,
  DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  getDefaultContinuousCapturePrivacyProfile,
} from "./continuousMicrophoneCapture.ts";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectArrayEqual(actual, expected, message) {
  const actualArray = Array.from(actual);
  if (
    actualArray.length !== expected.length ||
    actualArray.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${message}: expected [${expected.join(", ")}], received [${actualArray.join(", ")}]`,
    );
  }
}

function expectLessThanOrEqual(actual, expected, message) {
  if (!(actual <= expected)) {
    throw new Error(
      `${message}: expected ${actual} to be less than or equal to ${expected}`,
    );
  }
}

function expectIncludes(actual, expected, message) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${message}: expected ${actual} to include ${expected}`);
  }
}

function createManualMicrophoneCapture() {
  let handlers = null;
  let stopped = false;

  return {
    capture: {
      start(nextHandlers) {
        handlers = nextHandlers;
        stopped = false;
      },
      stop() {
        stopped = true;
        handlers = null;
      },
    },
    emit(frame) {
      if (!handlers) throw new Error("capture source was not started");
      handlers.onAudioFrame(frame);
    },
    get stopped() {
      return stopped;
    },
  };
}

function assertRetainedAudioWithinActiveWindow(buffer, message) {
  const state = buffer.getState();
  const activeWindowMs = state.rollingBufferActiveDurationSeconds * 1000;
  const retainedWindowMs =
    state.oldestRetainedAudioTimestampMs === null ||
    state.newestRetainedAudioTimestampMs === null
      ? 0
      : state.newestRetainedAudioTimestampMs -
        state.oldestRetainedAudioTimestampMs;

  expectEqual(
    state.bufferLocation,
    BUFFER_LOCATION_ON_DEVICE,
    `${message}: retained rolling audio stays on-device`,
  );
  expectLessThanOrEqual(
    state.sizeBytes,
    state.capacityBytes,
    `${message}: retained byte count never exceeds active window capacity`,
  );
  expectLessThanOrEqual(
    state.availableDurationSeconds,
    state.rollingBufferActiveDurationSeconds,
    `${message}: retained duration never exceeds active rolling window`,
  );
  expectLessThanOrEqual(
    retainedWindowMs,
    activeWindowMs,
    `${message}: retained timestamp span never exceeds active rolling window`,
  );

  for (const chunk of buffer.readChunks({ sink: "local-processing" })) {
    expectLessThanOrEqual(
      chunk.endedAtMs - chunk.startedAtMs,
      activeWindowMs,
      `${message}: each retained chunk remains bounded by the active window`,
    );
    if (state.newestRetainedAudioTimestampMs !== null) {
      expectLessThanOrEqual(
        state.newestRetainedAudioTimestampMs - chunk.startedAtMs,
        activeWindowMs,
        `${message}: retained chunk starts inside the active window`,
      );
    }
  }
}

function appendContinuousCaptureBytesToRollingBuffer({
  capture,
  emittedFrames,
  rollingBuffer,
  audioBytes,
  timestampMs,
  message,
}) {
  const sourceAudioBytes = Uint8Array.from(audioBytes);
  const emittedFrameIndex = emittedFrames.length;

  capture.emit({
    utteranceId: "approved-speaker",
    timestampMs,
    audioBytes: sourceAudioBytes,
  });
  expectEqual(
    emittedFrames.length,
    emittedFrameIndex + 1,
    `${message}: continuous capture emits one local frame`,
  );

  const recognitionFrame = appendCapturedFrameToCircularBuffer(
    rollingBuffer,
    emittedFrames[emittedFrameIndex],
  );
  expectEqual(
    "audioBytes" in recognitionFrame,
    false,
    `${message}: recognition frame carries no retained raw audio`,
  );
  expectArrayEqual(
    sourceAudioBytes,
    Array.from(sourceAudioBytes, () => 0),
    `${message}: continuous capture source bytes are scrubbed after local handoff`,
  );
  assertRetainedAudioWithinActiveWindow(rollingBuffer, message);

  return recognitionFrame;
}

const nativeCaptureSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../modules/battery-optimization/android/src/main/java/expo/modules/caseaudio/CaseContinuousMicrophoneCaptureModule.kt",
  ),
  "utf8",
);
const nativeFrameSourceStartupSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "nativeContinuousMicrophoneCapture.ts"),
  "utf8",
);
expectEqual(
  nativeCaptureSource.includes("DEFAULT_SAVE_INTENT_PRESENT = false"),
  true,
  "native default capture declares no save intent",
);
expectEqual(
  nativeCaptureSource.includes(
    "DEFAULT_PROCESSING_WINDOW_DURATION_SECONDS = 0.1",
  ),
  true,
  "native default capture declares the processing-window duration",
);
expectEqual(
  nativeCaptureSource.includes(
    "ROLLING_BUFFER_DEFAULT_DURATION_SECONDS = 15",
  ),
  true,
  "native default capture declares the authoritative rolling-buffer default duration",
);
expectEqual(
  nativeCaptureSource.includes(
    "DEFAULT_ROLLING_BUFFER_WINDOW_DURATION_SECONDS =\n    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS",
  ),
  true,
  "native default capture resolves its rolling-buffer window from the authoritative default",
);
expectEqual(
  nativeFrameSourceStartupSource.includes("createRollingAudioBufferConfig({"),
  true,
  "native continuous capture startup resolves rolling-buffer window through shared active-duration config",
);
expectEqual(
  nativeFrameSourceStartupSource.includes("rollingBufferWindowDurationSeconds: number;"),
  true,
  "native continuous capture startup accepts configured active rolling-buffer durations",
);
expectEqual(
  nativeFrameSourceStartupSource.includes(
    "rollingBufferWindowDurationSeconds:\n        rollingBufferConfig.rollingBufferActiveDurationSeconds",
  ),
  true,
  "native continuous capture startup applies the configured active duration to native capture options",
);
expectEqual(
  nativeCaptureSource.includes(
    "options.rollingBufferWindowDurationSeconds ?: DEFAULT_ROLLING_BUFFER_WINDOW_DURATION_SECONDS.toDouble()",
  ),
  true,
  "native capture startup reads the configured rolling-buffer window duration",
);
expectEqual(
  nativeCaptureSource.includes(
    '"rollingBufferWindowDurationSeconds" to rollingBufferWindowDurationSeconds',
  ),
  true,
  "native capture frame metadata reports the configured rolling-buffer window duration",
);
expectEqual(
  nativeCaptureSource.includes(
    "DEFAULT_RAW_AUDIO_PERSISTENCE_ENABLED = false",
  ),
  true,
  "native default capture disables raw audio persistence",
);
expectEqual(
  nativeCaptureSource.includes("ByteArray(frameSizeBytes)"),
  true,
  "native default capture uses a transient frame byte array",
);
expectEqual(
  nativeCaptureSource.includes("buffer.fill(0.toByte(), 0, bytesRead)"),
  true,
  "native default capture scrubs transient frame bytes after emitting",
);
for (const persistenceWriteApi of [
  "java.io.File",
  "FileOutputStream",
  "OutputStream",
  "openFileOutput",
  "getFilesDir",
  "getCacheDir",
  "filesDir",
  "cacheDir",
  "writeBytes",
  "writeText",
  "appendBytes",
  "appendText",
  "SQLite",
  "SQLiteDatabase",
  "Room.databaseBuilder",
  "SharedPreferences",
  "DataStore",
  "ContentResolver.insert",
  "MediaStore",
]) {
  expectEqual(
    nativeCaptureSource.includes(persistenceWriteApi),
    false,
    `native pre-approval capture has no ${persistenceWriteApi} persistence write path`,
  );
}

const capturePrivacyProfile = getDefaultContinuousCapturePrivacyProfile();
expectEqual(
  DEFAULT_CONTINUOUS_CAPTURE_PROCESSING_WINDOW_DURATION_SECONDS,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  "continuous capture processing-window default aliases the capture buffering default",
);
expectEqual(
  DEFAULT_CONTINUOUS_CAPTURE_ROLLING_BUFFER_WINDOW_DURATION_SECONDS,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "continuous capture rolling-buffer-window default uses the resolved active duration",
);
expectEqual(
  DEFAULT_CONTINUOUS_CAPTURE_RAW_AUDIO_PERSISTENCE_ENABLED,
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  "continuous capture raw audio persistence default aliases the capture buffering default",
);
expectEqual(
  capturePrivacyProfile.processingWindowDurationSeconds,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  "default capture privacy profile declares the processing-window duration",
);
expectEqual(
  capturePrivacyProfile.rollingBufferWindowDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "default capture privacy profile declares the resolved active rolling-buffer window",
);
expectEqual(
  DEFAULT_ROLLING_BUFFER_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "legacy rolling-buffer default alias resolves to the authoritative default",
);
expectEqual(
  capturePrivacyProfile.rawAudioPersistenceEnabled,
  false,
  "default capture privacy profile disables raw audio persistence",
);
expectEqual(
  capturePrivacyProfile.saveIntentPresent,
  DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  "default capture starts without a save intent",
);
expectEqual(
  capturePrivacyProfile.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "default capture keeps transient audio on-device",
);
expectEqual(
  capturePrivacyProfile.bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "default capture stores audio only in transient in-memory buffers",
);
expectEqual(
  capturePrivacyProfile.persistencePolicy,
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  "default capture has a local-memory-only persistence policy",
);
expectEqual(
  capturePrivacyProfile.automaticPersistenceEnabled,
  false,
  "default capture has no automatic persistence path",
);
expectEqual(
  capturePrivacyProfile.automaticRetentionEnabled,
  false,
  "default capture has no automatic retention path",
);
expectEqual(
  capturePrivacyProfile.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "default capture discards audio unless an approved explicit save happens later",
);

const manualCapture = createManualMicrophoneCapture();
const frameSource = createContinuousMicrophoneFrameSource(
  manualCapture.capture,
  {
    extractEmbedding: () => [0.7, 0.2, 0.1],
  },
);
const emittedFrames = [];
const captureErrors = [];

await frameSource.start({
  onFrame(frame) {
    emittedFrames.push(frame);
  },
  onError(error) {
    captureErrors.push(error);
  },
});

const sourceAudioBytes = Uint8Array.from([1, 2, 3, 4]);
const sourceFrame = {
  utteranceId: "approved-speaker",
  timestampMs: 120,
  saveIntentPresent: DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  audioBytes: sourceAudioBytes,
};
manualCapture.emit(sourceFrame);

expectEqual(emittedFrames.length, 1, "capture frame source emits one gate frame");
expectArrayEqual(
  emittedFrames[0].audioBytes,
  [1, 2, 3, 4],
  "capture frame source preserves microphone audio bytes",
);
expectArrayEqual(
  sourceAudioBytes,
  [0, 0, 0, 0],
  "default capture source scrubs original frame audio after transient handoff",
);
expectEqual(
  "audioBytes" in sourceFrame,
  false,
  "default capture source removes original frame audio after transient handoff",
);
expectEqual(
  Object.keys(emittedFrames[0]).includes("audioBytes"),
  false,
  "capture frame source keeps microphone audio bytes non-enumerable",
);
expectEqual(
  JSON.stringify(emittedFrames[0].audioBytes),
  JSON.stringify(BUFFERED_AUDIO_REDACTION_LABEL),
  "capture frame audio bytes redact during JSON serialization",
);
if (inspect(emittedFrames[0]).includes("1, 2, 3, 4")) {
  throw new Error("capture frame inspection must not include raw audio bytes");
}
expectArrayEqual(
  emittedFrames[0].embedding,
  [0.7, 0.2, 0.1],
  "capture frame source attaches local voice-gate embedding",
);

const blockedSaveIntentAudioBytes = Uint8Array.from([91, 92]);
const blockedSaveIntentFrame = {
  utteranceId: "save-intent-at-capture",
  timestampMs: 180,
  saveIntentPresent: true,
  audioBytes: blockedSaveIntentAudioBytes,
};
manualCapture.emit(blockedSaveIntentFrame);
expectEqual(
  emittedFrames.length,
  1,
  "default capture source rejects capture-time save intent frames",
);
expectEqual(
  captureErrors.length,
  1,
  "default capture source reports capture-time save intent as an error",
);
expectIncludes(
  captureErrors[0] instanceof Error
    ? captureErrors[0].message
    : String(captureErrors[0]),
  "transient in-memory",
  "capture-time save intent rejection explains transient in-memory capture",
);
expectArrayEqual(
  blockedSaveIntentAudioBytes,
  [0, 0],
  "rejected capture-time save intent frame still scrubs original audio",
);
expectEqual(
  "audioBytes" in blockedSaveIntentFrame,
  false,
  "rejected capture-time save intent frame removes original audio",
);

const blockedRawPersistenceAudioBytes = Uint8Array.from([93, 94]);
const blockedRawPersistenceFrame = {
  utteranceId: "raw-audio-persistence-at-capture",
  timestampMs: 200,
  rawAudioPersistenceEnabled: true,
  audioBytes: blockedRawPersistenceAudioBytes,
};
manualCapture.emit(blockedRawPersistenceFrame);
expectEqual(
  emittedFrames.length,
  1,
  "default capture source rejects capture-time raw audio persistence frames",
);
expectEqual(
  captureErrors.length,
  2,
  "default capture source reports capture-time raw audio persistence as an error",
);
expectIncludes(
  captureErrors[1] instanceof Error
    ? captureErrors[1].message
    : String(captureErrors[1]),
  "raw audio persistence",
  "capture-time raw audio persistence rejection explains disabled persistence",
);
expectArrayEqual(
  blockedRawPersistenceAudioBytes,
  [0, 0],
  "rejected raw persistence frame still scrubs original audio",
);
expectEqual(
  "audioBytes" in blockedRawPersistenceFrame,
  false,
  "rejected raw persistence frame removes original audio",
);

let automaticPersistenceAdapterWrites = 0;
const blockedPersistenceHookAudioBytes = Uint8Array.from([95, 96]);
const blockedPersistenceHookFrame = {
  utteranceId: "automatic-persistence-adapter-at-capture",
  timestampMs: 220,
  persistenceAdapter() {
    automaticPersistenceAdapterWrites += 1;
  },
  audioBytes: blockedPersistenceHookAudioBytes,
};
manualCapture.emit(blockedPersistenceHookFrame);
expectEqual(
  automaticPersistenceAdapterWrites,
  0,
  "default capture source never invokes automatic raw-audio persistence hooks",
);
expectEqual(
  emittedFrames.length,
  1,
  "default capture source rejects capture-time persistence hook frames",
);
expectEqual(
  captureErrors.length,
  3,
  "default capture source reports capture-time persistence hooks as an error",
);
expectIncludes(
  captureErrors[2] instanceof Error
    ? captureErrors[2].message
    : String(captureErrors[2]),
  "automatic audio buffer persistence",
  "capture-time persistence hook rejection explains disabled automatic persistence",
);
expectArrayEqual(
  blockedPersistenceHookAudioBytes,
  [0, 0],
  "rejected persistence hook frame still scrubs original audio",
);
expectEqual(
  "audioBytes" in blockedPersistenceHookFrame,
  false,
  "rejected persistence hook frame removes original audio",
);

const blockedFileBackedCaptureAudioBytes = Uint8Array.from([97, 98]);
const blockedFileBackedCaptureFrame = {
  utteranceId: "file-backed-capture-at-capture",
  timestampMs: 230,
  filePath: "/tmp/case-raw-capture-leak.raw",
  audioBytes: blockedFileBackedCaptureAudioBytes,
};
manualCapture.emit(blockedFileBackedCaptureFrame);
expectEqual(
  emittedFrames.length,
  1,
  "default capture source rejects file-backed capture frames",
);
expectEqual(
  captureErrors.length,
  4,
  "default capture source reports file-backed capture metadata as an error",
);
expectIncludes(
  captureErrors[3] instanceof Error
    ? captureErrors[3].message
    : String(captureErrors[3]),
  "local memory unless explicitly saved",
  "capture-time file-backed rejection explains the memory-only rule",
);
expectArrayEqual(
  blockedFileBackedCaptureAudioBytes,
  [0, 0],
  "rejected file-backed capture frame still scrubs original audio",
);
expectEqual(
  "audioBytes" in blockedFileBackedCaptureFrame,
  false,
  "rejected file-backed capture frame removes original audio",
);

const rollingBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
const recognitionFrame = appendCapturedFrameToCircularBuffer(
  rollingBuffer,
  emittedFrames[0],
);

expectArrayEqual(
  rollingBuffer.read(),
  [1, 2, 3, 4],
  "continuous microphone output appends into the rolling audio buffer",
);
expectEqual(
  "audioBytes" in recognitionFrame,
  false,
  "rolling buffer append strips audio before recognition processing",
);

manualCapture.emit({
  utteranceId: "approved-speaker",
  timestampMs: 240,
  audioBytes: Uint8Array.from([5, 6]),
});

const secondRecognitionFrame = appendCapturedFrameToCircularBuffer(
  rollingBuffer,
  emittedFrames[1],
);

expectArrayEqual(
  rollingBuffer.read(),
  [3, 4, 5, 6],
  "continuous capture evicts audio older than the configured duration",
);
expectEqual(
  "audioBytes" in secondRecognitionFrame,
  false,
  "evicted continuous capture frames still strip audio before recognition",
);
expectEqual(
  rollingBuffer.getState().sizeBytes,
  rollingBuffer.capacityBytes,
  "continuous capture buffer size stays capped at configured capacity",
);
expectEqual(
  rollingBuffer.getState().availableDurationSeconds,
  1,
  "continuous capture buffer duration stays capped at configured duration",
);

manualCapture.emit({
  utteranceId: "approved-speaker",
  timestampMs: 360,
  audioBytes: Uint8Array.from([7, 8, 9, 10, 11]),
});

appendCapturedFrameToCircularBuffer(rollingBuffer, emittedFrames[2]);

expectArrayEqual(
  rollingBuffer.read(),
  [8, 9, 10, 11],
  "oversized continuous capture frames retain only the newest duration window",
);

const defaultDurationRollingBuffer = createOnDeviceCircularAudioBuffer({
  sampleRateHz: 1,
  channelCount: 1,
  bytesPerSample: 1,
});
manualCapture.emit({
  utteranceId: "approved-speaker",
  timestampMs: DEFAULT_ROLLING_BUFFER_DURATION_SECONDS * 1000,
  audioBytes: Uint8Array.from(
    { length: DEFAULT_ROLLING_BUFFER_DURATION_SECONDS },
    (_, index) => index,
  ),
});
appendCapturedFrameToCircularBuffer(
  defaultDurationRollingBuffer,
  emittedFrames[3],
);

manualCapture.emit({
  utteranceId: "approved-speaker",
  timestampMs: (DEFAULT_ROLLING_BUFFER_DURATION_SECONDS + 1) * 1000,
  audioBytes: Uint8Array.from([99]),
});
appendCapturedFrameToCircularBuffer(
  defaultDurationRollingBuffer,
  emittedFrames[4],
);

expectEqual(
  defaultDurationRollingBuffer.getConfig().rollingBufferDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "continuous capture rolling buffer defaults to the resolved active duration",
);
expectEqual(
  defaultDurationRollingBuffer.getConfig().rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "continuous capture rolling buffer initializes with the resolved 15-second active duration",
);
expectArrayEqual(
  defaultDurationRollingBuffer.read(),
  [
    ...Array.from(
      { length: DEFAULT_ROLLING_BUFFER_DURATION_SECONDS - 1 },
      (_, index) => index + 1,
    ),
    99,
  ],
  "continuous capture removes buffered audio older than 15 seconds",
);
expectArrayEqual(
  defaultDurationRollingBuffer.read(undefined, { sink: "local-processing" }),
  [
    ...Array.from(
      { length: DEFAULT_ROLLING_BUFFER_DURATION_SECONDS - 1 },
      (_, index) => index + 1,
    ),
    99,
  ],
  "continuous capture processing cannot access audio older than 15 seconds",
);
expectEqual(
  defaultDurationRollingBuffer.readChunks()[0].startedAtMs >= 1000,
  true,
  "continuous capture chunk metadata proves the pre-window audio was evicted",
);

const activeWindowBoundaryCapture = createManualMicrophoneCapture();
const activeWindowBoundaryFrameSource = createContinuousMicrophoneFrameSource(
  activeWindowBoundaryCapture.capture,
  {
    extractEmbedding: () => [1],
  },
);
const activeWindowBoundaryFrames = [];
const activeWindowBoundaryErrors = [];

await activeWindowBoundaryFrameSource.start({
  onFrame(frame) {
    activeWindowBoundaryFrames.push(frame);
  },
  onError(error) {
    activeWindowBoundaryErrors.push(error);
  },
});

const activeWindowRollingBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 10,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 2,
  },
);

expectEqual(
  activeWindowRollingBuffer.getConfig().rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "continuous capture active-window override keeps the immutable 15-second default",
);
expectEqual(
  activeWindowRollingBuffer.getConfig().rollingBufferActiveDurationSeconds,
  2,
  "continuous capture active-window override resolves separately from the immutable default",
);

appendContinuousCaptureBytesToRollingBuffer({
  capture: activeWindowBoundaryCapture,
  emittedFrames: activeWindowBoundaryFrames,
  rollingBuffer: activeWindowRollingBuffer,
  audioBytes: Array.from({ length: 10 }, (_, index) => index + 1),
  timestampMs: 1000,
  message: "continuous capture active-window first second",
});
appendContinuousCaptureBytesToRollingBuffer({
  capture: activeWindowBoundaryCapture,
  emittedFrames: activeWindowBoundaryFrames,
  rollingBuffer: activeWindowRollingBuffer,
  audioBytes: Array.from({ length: 10 }, (_, index) => index + 11),
  timestampMs: 2000,
  message: "continuous capture exact active-window boundary",
});
expectEqual(
  activeWindowRollingBuffer.getState().sizeBytes,
  activeWindowRollingBuffer.capacityBytes,
  "continuous capture exact active-window boundary fills but does not exceed capacity",
);
expectEqual(
  activeWindowRollingBuffer.getState().oldestRetainedAudioTimestampMs,
  0,
  "continuous capture retains audio that starts exactly at the active-window boundary",
);
expectArrayEqual(
  activeWindowRollingBuffer.read(),
  Array.from({ length: 20 }, (_, index) => index + 1),
  "continuous capture exact active-window boundary retains the full active window only",
);

appendContinuousCaptureBytesToRollingBuffer({
  capture: activeWindowBoundaryCapture,
  emittedFrames: activeWindowBoundaryFrames,
  rollingBuffer: activeWindowRollingBuffer,
  audioBytes: [99],
  timestampMs: 2100,
  message: "continuous capture just over active-window boundary",
});
expectEqual(
  activeWindowRollingBuffer.getState().sizeBytes,
  activeWindowRollingBuffer.capacityBytes,
  "continuous capture just over active-window boundary trims before retaining beyond capacity",
);
expectEqual(
  activeWindowRollingBuffer.getState().oldestRetainedAudioTimestampMs,
  100,
  "continuous capture trims pre-window audio immediately after crossing the active-window boundary",
);
expectArrayEqual(
  activeWindowRollingBuffer.read(),
  [...Array.from({ length: 19 }, (_, index) => index + 2), 99],
  "continuous capture just over active-window boundary retains only the newest active window",
);

appendContinuousCaptureBytesToRollingBuffer({
  capture: activeWindowBoundaryCapture,
  emittedFrames: activeWindowBoundaryFrames,
  rollingBuffer: activeWindowRollingBuffer,
  audioBytes: Array.from({ length: 10 }, (_, index) => index + 21),
  timestampMs: 4000,
  message: "continuous capture frame ending at active-window boundary",
});
expectEqual(
  activeWindowRollingBuffer.getState().oldestRetainedAudioTimestampMs,
  2000,
  "continuous capture discards audio ending before or at the active-window boundary",
);
expectArrayEqual(
  activeWindowRollingBuffer.read(),
  [99, ...Array.from({ length: 10 }, (_, index) => index + 21)],
  "continuous capture keeps only audio overlapping the active rolling window",
);

appendContinuousCaptureBytesToRollingBuffer({
  capture: activeWindowBoundaryCapture,
  emittedFrames: activeWindowBoundaryFrames,
  rollingBuffer: activeWindowRollingBuffer,
  audioBytes: Array.from({ length: 25 }, (_, index) => index + 31),
  timestampMs: 8000,
  message: "continuous capture oversized frame active-window boundary",
});
expectEqual(
  activeWindowRollingBuffer.getState().sizeBytes,
  activeWindowRollingBuffer.capacityBytes,
  "continuous capture oversized frame is trimmed to the active-window capacity",
);
expectEqual(
  activeWindowRollingBuffer.getState().oldestRetainedAudioTimestampMs,
  6000,
  "continuous capture oversized frame trims the oldest bytes to the active-window start",
);
expectArrayEqual(
  activeWindowRollingBuffer.read(),
  Array.from({ length: 20 }, (_, index) => index + 36),
  "continuous capture oversized frame retains only the newest active-window bytes",
);

const shrunkActiveWindowConfig =
  activeWindowRollingBuffer.updateActiveRollingBufferDurationSeconds(1.2);
expectEqual(
  shrunkActiveWindowConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "continuous capture active-window shrink keeps the immutable default duration",
);
expectEqual(
  shrunkActiveWindowConfig.rollingBufferActiveDurationSeconds,
  1.2,
  "continuous capture active-window shrink updates only the active duration",
);
assertRetainedAudioWithinActiveWindow(
  activeWindowRollingBuffer,
  "continuous capture active-window shrink boundary",
);
expectEqual(
  activeWindowRollingBuffer.getState().sizeBytes,
  12,
  "continuous capture active-window shrink prunes retained audio immediately",
);
expectEqual(
  activeWindowRollingBuffer.getState().oldestRetainedAudioTimestampMs,
  6800,
  "continuous capture active-window shrink moves the retained boundary forward",
);
expectArrayEqual(
  activeWindowRollingBuffer.read(),
  Array.from({ length: 12 }, (_, index) => index + 44),
  "continuous capture active-window shrink retains only the newest shrunken window",
);
expectEqual(
  activeWindowBoundaryErrors.length,
  0,
  "continuous capture active-window boundary verification has no capture errors",
);

await activeWindowBoundaryFrameSource.stop();
expectEqual(
  activeWindowBoundaryCapture.stopped,
  true,
  "continuous capture active-window boundary source stops cleanly",
);

const pcmEmbedding = createPcm16AudioEmbedding({
  audioBytes: Uint8Array.from([0, 0, 255, 127, 0, 128, 0, 64]),
});
expectEqual(
  pcmEmbedding.length,
  16,
  "default local PCM embedding extractor creates a fixed gate vector",
);

await frameSource.stop();
expectEqual(manualCapture.stopped, true, "capture source stops cleanly");
