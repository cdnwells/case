import assert from "node:assert/strict";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  attachNonPersistableAudioBytes,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createApprovedSpeechAudioRelease,
  createLocalApprovedAudioClipStore,
  createOnDeviceCircularAudioBuffer,
  discardRejectedSpeechBeforeDownstream,
  saveApprovedAudioClipFromExplicitSaveAction,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
} from "../../constants/audioBuffer.ts";

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
    buffer.append(Uint8Array.from(initialAudioBytes));
  }

  return buffer;
}

function createApprovedSaveRequestInput() {
  const requestedAtMs = 1_700_000_000_000;
  const userVisiblePurpose = "Play this approved clip from the saved notes";

  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "voice-owner",
      confidence: 0.97,
      recognizedAtMs: requestedAtMs - 200,
      recognitionLatencyMs: 200,
      reason: "approved_voice_match",
    },
    approvedUserIdentity: {
      approvedVoiceId: "voice-owner",
      approvedUserId: "case-owner",
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

function assertReleasedTemporaryAudioBuffer({
  owner,
  audioBytes,
  expectedByteLength,
  message,
}) {
  assert.deepEqual(
    Array.from(audioBytes),
    Array.from({ length: expectedByteLength }, () => 0),
    `${message}: temporary bytes are zeroed`,
  );
  assert.equal(
    "audioBytes" in owner,
    false,
    `${message}: temporary audio buffer property is removed`,
  );
}

const discardRollingBuffer = createShortRollingAudioBuffer([11, 12, 13]);
const discardFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "cleanup-discard-rejected-speaker",
    timestampMs: 100,
    embedding: [0.1, 0.8, 0.1],
  },
  Uint8Array.from([14, 15]),
);
const discardFrameAudioBytes = discardFrame.audioBytes;
const discardTemporaryFilePaths = [];
const discardCacheKeys = [];

const discardResult = discardRejectedSpeechBeforeDownstream({
  recognitionResult: {
    accepted: false,
    rejectedVoiceId: "guest-speaker",
    reason: "below_threshold",
  },
  rollingAudioBuffer: discardRollingBuffer,
  capturedFrames: [discardFrame],
  temporaryCapturedAudioFiles: [
    {
      filePath: "/tmp/case-discard-temp-audio.raw",
      deleteFile(filePath) {
        discardTemporaryFilePaths.push(filePath);
      },
    },
  ],
  unsavedCapturedAudioCaches: [
    {
      cacheKey: "case-discard-temp-audio-cache",
      clear(cacheKey) {
        discardCacheKeys.push(cacheKey);
      },
    },
  ],
});

assert.equal(
  discardResult.discarded,
  true,
  "discard path marks rejected speech audio discarded",
);
assert.deepEqual(
  Array.from(discardRollingBuffer.read()),
  [],
  "discard path clears the rolling temporary audio buffer",
);
assert.equal(
  discardRollingBuffer.getState().sizeBytes,
  0,
  "discard path leaves no rolling temporary audio bytes",
);
assertReleasedTemporaryAudioBuffer({
  owner: discardFrame,
  audioBytes: discardFrameAudioBytes,
  expectedByteLength: 2,
  message: "discard path releases captured frame audio",
});
assert.deepEqual(
  discardTemporaryFilePaths,
  ["/tmp/case-discard-temp-audio.raw"],
  "discard path deletes temporary audio files",
);
assert.deepEqual(
  discardCacheKeys,
  ["case-discard-temp-audio-cache"],
  "discard path clears temporary audio caches",
);

const saveAction = createApprovedAudioSaveAction(
  createApprovedSaveRequestInput(),
);
const saveAuthorization = createApprovedAudioSaveAuthorization(saveAction);
const saveRollingBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 2,
  },
);
const saveRecognizedAtMs = saveAction.request.approvedVoiceMatch.recognizedAtMs;
saveRollingBuffer.append(Uint8Array.from([21, 22, 23]), {
  timestampMs: saveRecognizedAtMs - 900,
});
saveRollingBuffer.append(Uint8Array.from([31, 32]), {
  timestampMs: saveRecognizedAtMs,
});
const saveSegment =
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: saveRollingBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "voice-owner",
      recognizedAtMs: saveRecognizedAtMs,
      latencyMs: 500,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "voice-owner",
        score: 0.98,
        threshold: 0.9,
      },
    },
    selectedAtMs: saveRecognizedAtMs,
  });

assert.notEqual(
  saveSegment,
  null,
  "save path selects a temporary approved speech segment",
);
const saveSegmentAudioBytes = saveSegment.audioBytes;
const saveClipStore = createLocalApprovedAudioClipStore();
const savedClip = saveApprovedAudioClipFromExplicitSaveAction(
  saveClipStore,
  {
    saveAction,
    saveAuthorization,
    rollingAudioBuffer: saveRollingBuffer,
    approvedSpeechAudioSegment: saveSegment,
    clipId: "cleanup-explicit-save",
    savedAtMs: saveAction.request.retentionMetadata.requestedAtMs + 1000,
  },
);

assert.deepEqual(
  Array.from(savedClip.audioBytes),
  [31, 32],
  "save path keeps the explicitly saved audio in the retained local clip",
);
assert.deepEqual(
  Array.from(saveClipStore.get("cleanup-explicit-save").audioBytes),
  [31, 32],
  "save path keeps the saved clip retrievable for the user-visible later-use purpose",
);
assert.deepEqual(
  Array.from(saveRollingBuffer.read()),
  [],
  "save path clears the source rolling temporary audio buffer",
);
assert.equal(
  saveRollingBuffer.getState().sizeBytes,
  0,
  "save path leaves no source rolling temporary audio bytes",
);
assertReleasedTemporaryAudioBuffer({
  owner: saveSegment,
  audioBytes: saveSegmentAudioBytes,
  expectedByteLength: 2,
  message: "save path releases the selected temporary speech segment",
});

const rejectedSaveRollingBuffer = createShortRollingAudioBuffer([51, 52]);
const rejectedSaveSegment = attachNonPersistableAudioBytes(
  {
    kind: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
    source: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
    matchedVoiceId: "voice-owner",
    recognizedAtMs: saveRecognizedAtMs,
    selectedAtMs: saveRecognizedAtMs,
    startedAtMs: saveRecognizedAtMs - 250,
    endedAtMs: saveRecognizedAtMs,
    byteLength: 2,
    chunkCount: 1,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  },
  Uint8Array.from([53, 54]),
);
const rejectedSaveSegmentAudioBytes = rejectedSaveSegment.audioBytes;

assert.throws(
  () =>
    saveApprovedAudioClipFromExplicitSaveAction(saveClipStore, {
      saveAction,
      saveAuthorization: {
        ...saveAuthorization,
        matchedVoiceId: "different-approved-voice",
      },
      rollingAudioBuffer: rejectedSaveRollingBuffer,
      approvedSpeechAudioSegment: rejectedSaveSegment,
      clipId: "cleanup-rejected-explicit-save",
    }),
  "rejected save path does not persist a mismatched approved voice authorization",
);
assert.deepEqual(
  Array.from(rejectedSaveRollingBuffer.read()),
  [],
  "rejected save path clears the rolling temporary audio buffer",
);
assert.equal(
  rejectedSaveRollingBuffer.getState().sizeBytes,
  0,
  "rejected save path leaves no source rolling temporary audio bytes",
);
assertReleasedTemporaryAudioBuffer({
  owner: rejectedSaveSegment,
  audioBytes: rejectedSaveSegmentAudioBytes,
  expectedByteLength: 2,
  message: "rejected save path releases the selected temporary speech segment",
});
assert.equal(
  saveClipStore.get("cleanup-rejected-explicit-save"),
  null,
  "rejected save path creates no retained audio clip",
);

const processingRollingBuffer = createShortRollingAudioBuffer([41, 42, 43]);
const processingFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "cleanup-processing-complete-frame",
    timestampMs: 300,
    embedding: [0.9, 0.05, 0.05],
  },
  Uint8Array.from([44, 45]),
);
const processingFrameAudioBytes = processingFrame.audioBytes;
const processingSegment = attachNonPersistableAudioBytes(
  {
    kind: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
    source: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
    matchedVoiceId: "voice-owner",
    recognizedAtMs: 1_700_000_000_100,
    selectedAtMs: 1_700_000_000_120,
    startedAtMs: 1_700_000_000_000,
    endedAtMs: 1_700_000_000_100,
    byteLength: 3,
    chunkCount: 1,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  },
  Uint8Array.from([46, 47, 48]),
);
const processingSegmentAudioBytes = processingSegment.audioBytes;
const processingTemporaryFilePaths = [];
const processingCacheKeys = [];
const processingRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: processingRollingBuffer,
  capturedFrames: [processingFrame],
  rollingBufferAudioSegments: [processingSegment],
  temporaryCapturedAudioFiles: [
    {
      filePath: "/tmp/case-processing-complete-temp-audio.raw",
      deleteFile(filePath) {
        processingTemporaryFilePaths.push(filePath);
      },
    },
  ],
  unsavedCapturedAudioCaches: [
    {
      cacheKey: "case-processing-complete-temp-audio-cache",
      clear(cacheKey) {
        processingCacheKeys.push(cacheKey);
      },
    },
  ],
  scheduleProcessingWindowExpiry: false,
});

assert.equal(
  processingRelease.release("processing_complete"),
  true,
  "processing completion path runs temporary audio cleanup",
);
assert.deepEqual(
  Array.from(processingRollingBuffer.read()),
  [],
  "processing completion path clears the rolling temporary audio buffer",
);
assert.equal(
  processingRollingBuffer.getState().sizeBytes,
  0,
  "processing completion path leaves no rolling temporary audio bytes",
);
assertReleasedTemporaryAudioBuffer({
  owner: processingFrame,
  audioBytes: processingFrameAudioBytes,
  expectedByteLength: 2,
  message: "processing completion path releases captured frame audio",
});
assertReleasedTemporaryAudioBuffer({
  owner: processingSegment,
  audioBytes: processingSegmentAudioBytes,
  expectedByteLength: 3,
  message: "processing completion path releases selected speech segment audio",
});
assert.deepEqual(
  processingTemporaryFilePaths,
  ["/tmp/case-processing-complete-temp-audio.raw"],
  "processing completion path deletes temporary audio files",
);
assert.deepEqual(
  processingCacheKeys,
  ["case-processing-complete-temp-audio-cache"],
  "processing completion path clears temporary audio caches",
);
