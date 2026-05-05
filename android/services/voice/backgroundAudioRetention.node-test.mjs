import assert from "node:assert/strict";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
  CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR,
  CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  appendCapturedFrameToCircularBuffer,
  assertBackgroundWorkerPayloadExcludesCapturedAudio,
  assertOfflineStoragePayloadExcludesCapturedAudio,
  assertQueuePayloadExcludesCapturedAudio,
  assertSessionPersistencePayloadExcludesCapturedAudio,
  attachNonPersistableAudioBytes,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createApprovedSpeechAudioRelease,
  createBackgroundWorkerSafeJsonBody,
  createLocalApprovedAudioClipStore,
  createOfflineStorageSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  createQueueSafeJsonBody,
  createSavedApprovedAudioRecordView,
  createSessionPersistenceSafeJsonBody,
  releaseCapturedAudioFrame,
  saveApprovedAudioClipFromExplicitSaveAction,
} from "../../constants/audioBuffer.ts";
import { createContinuousMicrophoneFrameSource } from "./continuousMicrophoneCapture.ts";

const retentionSurfaces = [
  {
    surface: "background-worker",
    assertPayload: assertBackgroundWorkerPayloadExcludesCapturedAudio,
    createJson: createBackgroundWorkerSafeJsonBody,
  },
  {
    surface: "queue",
    assertPayload: assertQueuePayloadExcludesCapturedAudio,
    createJson: createQueueSafeJsonBody,
  },
  {
    surface: "offline-storage",
    assertPayload: assertOfflineStoragePayloadExcludesCapturedAudio,
    createJson: createOfflineStorageSafeJsonBody,
  },
  {
    surface: "session-persistence",
    assertPayload: assertSessionPersistencePayloadExcludesCapturedAudio,
    createJson: createSessionPersistenceSafeJsonBody,
  },
];

function createShortRollingAudioBuffer(initialAudioBytes = []) {
  const buffer = createOnDeviceCircularAudioBuffer(
    {
      sampleRateHz: 4,
      channelCount: 1,
      bytesPerSample: 1,
    },
    {
      rollingBufferActiveDurationSeconds: 1,
    },
  );

  if (initialAudioBytes.length > 0) {
    buffer.append(Uint8Array.from(initialAudioBytes), { timestampMs: 1000 });
  }

  return buffer;
}

function createApprovedSaveRequestInput() {
  const requestedAtMs = 1_700_000_000_000;
  const userVisiblePurpose = "Save the approved clip for note playback";

  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "case-owner",
      confidence: 0.98,
      recognizedAtMs: requestedAtMs - 120,
      recognitionLatencyMs: 120,
      reason: "approved_voice_match",
    },
    approvedUserIdentity: {
      approvedVoiceId: "case-owner",
      approvedUserId: "user-case-owner",
      displayName: "Case Owner",
    },
    userVisiblePurpose,
    purposeMetadata: {
      kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
      userVisiblePurpose,
      requestedAtMs,
    },
    retentionMetadata: {
      requestedAtMs,
      retentionDurationSeconds: 3600,
      expiresAtMs: requestedAtMs + 3_600_000,
      storageLocation: BUFFER_LOCATION_ON_DEVICE,
      retentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    },
  };
}

function createManualMicrophoneCapture() {
  let handlers = null;

  return {
    capture: {
      start(nextHandlers) {
        handlers = nextHandlers;
      },
      stop() {
        handlers = null;
      },
    },
    emit(frame) {
      if (!handlers) throw new Error("manual capture was not started");
      handlers.onAudioFrame(frame);
    },
  };
}

assert.deepEqual(
  Array.from(CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES),
  ["background-worker", "queue", "offline-storage", "session-persistence"],
  "voice audio retention guard names every non-save retention surface",
);

for (const { surface, assertPayload, createJson } of retentionSurfaces) {
  const capturedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: `${surface}-captured-frame`,
      timestampMs: 100,
      embedding: [1, 0, 0],
    },
    Uint8Array.from([11, 12, 13]),
  );

  assert.throws(
    () =>
      assertPayload({
        jobName: "process-approved-speech",
        capturedFrame,
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR) &&
      error.message.includes(surface) &&
      error.message.includes("audioBytes"),
    `${surface} rejects captured frames with raw audio outside explicit save`,
  );

  assert.throws(
    () =>
      createJson({
        utteranceId: `${surface}-raw-audio-field`,
        audioBytes: Uint8Array.from([21, 22]),
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR) &&
      error.message.includes(surface) &&
      error.message.includes("audioBytes"),
    `${surface} JSON persistence rejects raw captured audio fields`,
  );

  assert.throws(
    () =>
      createJson({
        utteranceId: `${surface}-encoded-audio-field`,
        capturedAudioBase64: "CgsM",
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR) &&
      error.message.includes(surface) &&
      error.message.includes("capturedAudioBase64"),
    `${surface} JSON persistence rejects encoded captured audio fields`,
  );

  const metadataOnlyJson = createJson({
    utteranceId: `${surface}-metadata-only`,
    matchedVoiceId: "case-owner",
    transcript: "turn on the office lights",
    retainedAudioRecordCount: 0,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  });
  assert.equal(
    metadataOnlyJson.includes("audioBytes"),
    false,
    `${surface} metadata-only persistence includes no raw audio field`,
  );
  assert.equal(
    metadataOnlyJson.includes("capturedAudio"),
    false,
    `${surface} metadata-only persistence includes no captured audio field`,
  );

  releaseCapturedAudioFrame(capturedFrame);
}

for (const { surface } of retentionSurfaces) {
  const rollingAudioBuffer = createShortRollingAudioBuffer([31, 32, 33]);
  assert.throws(
    () => rollingAudioBuffer.read(undefined, { sink: surface }),
    (error) =>
      error instanceof Error &&
      error.message.includes(`buffered audio must never be written to ${surface}`),
    `${surface} cannot read directly from the rolling audio buffer`,
  );
}

const explicitSaveBuffer = createShortRollingAudioBuffer([41, 42, 43]);
const explicitSaveAction = createApprovedAudioSaveAction(
  createApprovedSaveRequestInput(),
);
const explicitSaveAuthorization =
  createApprovedAudioSaveAuthorization(explicitSaveAction);
const explicitSaveStore = createLocalApprovedAudioClipStore();
const explicitlySavedClip = saveApprovedAudioClipFromExplicitSaveAction(
  explicitSaveStore,
  {
    saveAction: explicitSaveAction,
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: explicitSaveBuffer,
    clipId: "explicitly-saved-retention-surface-test",
    savedAtMs: 1_700_000_000_100,
  },
);
const explicitlySavedRecordView =
  createSavedApprovedAudioRecordView(explicitlySavedClip);

for (const { surface, assertPayload, createJson } of retentionSurfaces) {
  assert.doesNotThrow(
    () =>
      assertPayload({
        savedAudioRecord: explicitlySavedRecordView,
      }),
    `${surface} may retain explicit-save metadata without raw audio`,
  );

  const explicitSaveMetadataJson = createJson({
    savedAudioRecord: explicitlySavedRecordView,
  });
  assert.equal(
    explicitSaveMetadataJson.includes("audioBytes"),
    false,
    `${surface} explicit-save metadata JSON omits raw audio`,
  );
  assert.equal(
    explicitSaveMetadataJson.includes("Explicitly saved for later use"),
    true,
    `${surface} explicit-save metadata preserves the user-visible later-use reason`,
  );

  assert.throws(
    () =>
      assertPayload({
        savedClip: explicitlySavedClip,
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR) &&
      error.message.includes(surface) &&
      error.message.includes("audioBytes"),
    `${surface} cannot retain the raw saved clip outside the explicit save path`,
  );
}

for (const key of [
  "backgroundWorkerQueue",
  "queue",
  "offlineStorage",
  "sessionPersistence",
]) {
  const blockedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: `blocked-${key}`,
      timestampMs: 200,
      embedding: [1, 0, 0],
      [key]: { retainCapturedAudio: true },
    },
    Uint8Array.from([51, 52]),
  );
  const blockedFrameAudioBytes = blockedFrame.audioBytes;

  assert.throws(
    () =>
      createApprovedSpeechAudioRelease({
        capturedFrames: [blockedFrame],
        scheduleProcessingWindowExpiry: false,
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(
        CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
      ) &&
      error.message.includes(key),
    `approved no-save release rejects ${key} retention resources`,
  );
  assert.deepEqual(
    Array.from(blockedFrameAudioBytes),
    [0, 0],
    `${key} rejection zeroes transient captured audio`,
  );
  assert.equal(
    "audioBytes" in blockedFrame,
    false,
    `${key} rejection removes captured audio metadata`,
  );
}

const manualCapture = createManualMicrophoneCapture();
const frameSource = createContinuousMicrophoneFrameSource(manualCapture.capture, {
  extractEmbedding: () => [1, 0, 0],
});
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

const captureTimeQueueAudioBytes = Uint8Array.from([61, 62, 63]);
const captureTimeQueueFrame = {
  utteranceId: "capture-time-background-queue",
  timestampMs: 300,
  backgroundWorkerQueue: {
    enqueue() {
      throw new Error("background queue must not receive captured audio");
    },
  },
  audioBytes: captureTimeQueueAudioBytes,
};
manualCapture.emit(captureTimeQueueFrame);

assert.equal(
  emittedFrames.length,
  0,
  "capture source emits no voice-gate frame when a background queue hook is present",
);
assert.equal(
  captureErrors.length,
  1,
  "capture source reports capture-time background queue retention as an error",
);
assert.match(
  captureErrors[0] instanceof Error
    ? captureErrors[0].message
    : String(captureErrors[0]),
  /local memory unless explicitly saved/,
  "capture-time background queue rejection explains the local-only save path",
);
assert.deepEqual(
  Array.from(captureTimeQueueAudioBytes),
  [0, 0, 0],
  "capture-time background queue rejection zeroes source audio bytes",
);
assert.equal(
  "audioBytes" in captureTimeQueueFrame,
  false,
  "capture-time background queue rejection removes source audio metadata",
);

await frameSource.stop();

const approvedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approved-recognition-metadata-only",
    timestampMs: 400,
    embedding: [1, 0, 0],
  },
  Uint8Array.from([71, 72, 73]),
);
const approvedBuffer = createShortRollingAudioBuffer();
const recognitionFrame = appendCapturedFrameToCircularBuffer(
  approvedBuffer,
  approvedFrame,
);
const sessionSnapshotJson = createSessionPersistenceSafeJsonBody({
  recognitionFrame,
  rollingBufferSizeBytes: approvedBuffer.getState().sizeBytes,
  bufferLocation: BUFFER_LOCATION_ON_DEVICE,
  audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
});
assert.equal(
  sessionSnapshotJson.includes("audioBytes"),
  false,
  "session snapshot can persist recognition metadata only after capture audio is stripped",
);
assert.equal(
  sessionSnapshotJson.includes("71"),
  false,
  "session snapshot does not retain captured audio byte fragments",
);
