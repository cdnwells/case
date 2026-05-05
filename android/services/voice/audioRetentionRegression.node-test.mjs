import { inspect } from "node:util";
import {
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  BUFFERED_AUDIO_REDACTION_LABEL,
  CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
  DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
  TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  appendCapturedFrameToCircularBuffer,
  assertApprovedVoiceVerifiedForBufferedAudioDownstream,
  assertLogPayloadExcludesCapturedAudio,
  assertNetworkPayloadExcludesBufferedAudio,
  attachNonPersistableAudioBytes,
  createApprovedSpeechAudioRelease,
  createDurableApprovedAudioClipStore,
  createLocalApprovedAudioClipStore,
  createLogSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  discardRejectedSpeechBeforeDownstream,
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent,
} from "../../constants/audioBuffer.ts";
import {
  DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  createContinuousMicrophoneFrameSource,
  getDefaultContinuousCapturePrivacyProfile,
} from "./continuousMicrophoneCapture.ts";
import { triggerSpeechProcessingPipelineFromApprovedVoiceEvent } from "./approvedVoiceProcessingLatency.ts";
import { createApprovedVoiceGate } from "./voiceGate.js";

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

function expectThrows(callback, message, expectedMessagePart = "") {
  try {
    callback();
  } catch (error) {
    if (
      expectedMessagePart &&
      !String(error instanceof Error ? error.message : error).includes(
        expectedMessagePart,
      )
    ) {
      throw new Error(
        `${message}: expected error to include ${expectedMessagePart}, received ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return;
  }

  throw new Error(`${message}: expected function to throw`);
}

function expectDoesNotThrow(callback, message) {
  try {
    callback();
  } catch (error) {
    throw new Error(
      `${message}: expected no throw, received ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function expectNotIncludes(actual, expected, message) {
  if (String(actual).includes(expected)) {
    throw new Error(
      `${message}: expected ${actual} not to include ${expected}`,
    );
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
        handlers = null;
        stopped = true;
      },
    },
    emit(frame) {
      if (!handlers) throw new Error("manual capture was not started");
      handlers.onAudioFrame(frame);
    },
    get stopped() {
      return stopped;
    },
  };
}

function createShortRollingAudioBuffer() {
  return createOnDeviceCircularAudioBuffer(
    {
      sampleRateHz: 4,
      channelCount: 1,
      bytesPerSample: 1,
    },
    {
      rollingBufferActiveDurationSeconds: 1,
    },
  );
}

function createApprovedVoices() {
  return [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
  ];
}

const defaultCaptureProfile = getDefaultContinuousCapturePrivacyProfile();
expectEqual(
  defaultCaptureProfile.saveIntentPresent,
  DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  "default continuous capture starts without save intent",
);
expectEqual(
  defaultCaptureProfile.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "default continuous capture keeps audio on-device",
);
expectEqual(
  defaultCaptureProfile.bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "default continuous capture uses ephemeral memory",
);
expectEqual(
  defaultCaptureProfile.persistencePolicy,
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  "default continuous capture has no remote or durable persistence policy",
);
expectEqual(
  defaultCaptureProfile.automaticPersistenceEnabled,
  false,
  "default continuous capture disables automatic persistence",
);
expectEqual(
  defaultCaptureProfile.automaticRetentionEnabled,
  false,
  "default continuous capture disables automatic retention",
);
expectEqual(
  defaultCaptureProfile.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "default continuous capture discards unless explicitly saved",
);

const defaultCaptureClipStore = createLocalApprovedAudioClipStore();
const defaultCaptureBuffer = createShortRollingAudioBuffer();
const manualCapture = createManualMicrophoneCapture();
const defaultCaptureFrames = [];
const defaultCaptureErrors = [];
const defaultFrameSource = createContinuousMicrophoneFrameSource(
  manualCapture.capture,
  {
    extractEmbedding: () => [1, 0, 0],
  },
);

await defaultFrameSource.start({
  onFrame(frame) {
    defaultCaptureFrames.push(frame);
  },
  onError(error) {
    defaultCaptureErrors.push(error);
  },
});

const defaultSourceAudioBytes = Uint8Array.from([10, 11, 12, 13]);
const defaultSourceFrame = {
  utteranceId: "default-capture-no-save-intent",
  timestampMs: 100,
  saveIntentPresent: DEFAULT_CONTINUOUS_CAPTURE_SAVE_INTENT_PRESENT,
  audioBytes: defaultSourceAudioBytes,
};
manualCapture.emit(defaultSourceFrame);

expectEqual(
  defaultCaptureErrors.length,
  0,
  "default capture accepts frames without save intent",
);
expectEqual(
  defaultCaptureFrames.length,
  1,
  "default capture emits one transient voice-gate frame",
);
expectArrayEqual(
  defaultSourceAudioBytes,
  [0, 0, 0, 0],
  "default capture scrubs source frame audio after handoff",
);
expectEqual(
  "audioBytes" in defaultSourceFrame,
  false,
  "default capture removes source frame audio metadata after handoff",
);
expectEqual(
  Object.keys(defaultCaptureFrames[0]).includes("audioBytes"),
  false,
  "default capture keeps emitted audio bytes non-enumerable",
);
expectEqual(
  JSON.stringify(defaultCaptureFrames[0].audioBytes),
  JSON.stringify(BUFFERED_AUDIO_REDACTION_LABEL),
  "default capture emitted audio redacts during JSON serialization",
);
expectNotIncludes(
  inspect(defaultCaptureFrames[0]),
  "10, 11, 12, 13",
  "default capture emitted frame inspection excludes raw audio",
);

const defaultRecognitionFrame = appendCapturedFrameToCircularBuffer(
  defaultCaptureBuffer,
  defaultCaptureFrames[0],
);
expectEqual(
  "audioBytes" in defaultRecognitionFrame,
  false,
  "default capture strips audio before voice-gate recognition",
);
expectArrayEqual(
  defaultCaptureBuffer.read(),
  [10, 11, 12, 13],
  "default capture stores only the on-device rolling buffer before gating",
);
expectEqual(
  defaultCaptureBuffer.getState().persistenceSafeguards.automaticPersistenceEnabled,
  false,
  "default rolling capture has no automatic persistence safeguard enabled",
);
expectEqual(
  defaultCaptureBuffer.getState().persistenceSafeguards.automaticRetentionEnabled,
  false,
  "default rolling capture has no automatic retention safeguard enabled",
);
expectEqual(
  defaultCaptureClipStore.list().length,
  0,
  "default capture creates no saved audio clip without explicit save intent",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      recognitionFrame: defaultRecognitionFrame,
      retainedAudioRecords: defaultCaptureClipStore.list(),
    }),
  "default capture exposes only metadata to network-safe payloads",
);
defaultCaptureBuffer.clear();
expectArrayEqual(
  defaultCaptureBuffer.read(),
  [],
  "default capture discard clears rolling audio when no save intent exists",
);
expectEqual(
  defaultCaptureClipStore.list().length,
  0,
  "default capture still has no retained audio after discard",
);
await defaultFrameSource.stop();
expectEqual(manualCapture.stopped, true, "default capture source stops");

const rejectedClipStore = createLocalApprovedAudioClipStore();
const rejectedBuffer = createShortRollingAudioBuffer();
const rejectedGate = createApprovedVoiceGate({
  approvedVoices: createApprovedVoices(),
});
const rejectedCapturedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "rejected-voice-no-save-intent",
    timestampMs: 200,
    embedding: [0, 1, 0],
  },
  Uint8Array.from([30, 31, 32, 33]),
);
const rejectedCapturedAudioBytes = rejectedCapturedFrame.audioBytes;
const rejectedRecognitionFrame = appendCapturedFrameToCircularBuffer(
  rejectedBuffer,
  rejectedCapturedFrame,
);
const rejectedRecognition = rejectedGate.observeFrame(rejectedRecognitionFrame);

expectEqual(
  rejectedRecognition.accepted,
  false,
  "voice gate rejects a non-approved speaker before transcription",
);
expectEqual(
  rejectedRecognition.matchedVoiceId,
  null,
  "voice gate does not produce an approved identity for rejected speech",
);
expectArrayEqual(
  rejectedCapturedAudioBytes,
  [0, 0, 0, 0],
  "voice-gate capture path zeroes rejected frame bytes after buffering",
);
expectEqual(
  "audioBytes" in rejectedCapturedFrame,
  false,
  "voice-gate capture path removes rejected frame audio metadata",
);
expectThrows(
  () =>
    assertApprovedVoiceVerifiedForBufferedAudioDownstream({
      downstreamPath: "transcription",
      recognitionResult: rejectedRecognition,
    }),
  "voice gate blocks rejected speech from transcription",
);

let rejectedTranscriptionStarted = false;
try {
  assertApprovedVoiceVerifiedForBufferedAudioDownstream({
    downstreamPath: "transcription",
    recognitionResult: rejectedRecognition,
  });
  rejectedTranscriptionStarted = true;
} catch {
  rejectedTranscriptionStarted = false;
}
expectEqual(
  rejectedTranscriptionStarted,
  false,
  "rejected voice-gate flow never starts transcription",
);

const rejectedDiscard = discardRejectedSpeechBeforeDownstream({
  recognitionResult: rejectedRecognition,
  rollingAudioBuffer: rejectedBuffer,
});
expectEqual(
  rejectedDiscard.discarded,
  true,
  "voice gate marks rejected audio discarded",
);
expectArrayEqual(
  rejectedBuffer.read(),
  [],
  "voice gate clears rejected rolling audio without retention",
);
const rejectedTemporaryCapturedAudioFiles = [];
const rejectedUnsavedCapturedAudioCaches = [];
const rejectedExternalResourceDiscard = discardRejectedSpeechBeforeDownstream({
  recognitionResult: {
    accepted: false,
    reason: "non_approved_voice",
    rejectedVoiceId: "guest-speaker",
  },
  temporaryCapturedAudioFiles: [
    {
      filePath: "/tmp/case-rejected-temp.raw",
      deleteFile(filePath) {
        rejectedTemporaryCapturedAudioFiles.push(filePath);
      },
    },
  ],
  unsavedCapturedAudioCaches: [
    {
      cacheKey: "case-rejected-cache",
      clear(cacheKey) {
        rejectedUnsavedCapturedAudioCaches.push(cacheKey);
      },
    },
  ],
});
expectEqual(
  rejectedExternalResourceDiscard.discarded,
  true,
  "voice gate rejected flow discards purgeable external captured-audio resources",
);
expectArrayEqual(
  rejectedTemporaryCapturedAudioFiles,
  ["/tmp/case-rejected-temp.raw"],
  "voice gate rejected flow purges temporary captured-audio files",
);
expectArrayEqual(
  rejectedUnsavedCapturedAudioCaches,
  ["case-rejected-cache"],
  "voice gate rejected flow purges unsaved captured-audio caches",
);
expectEqual(
  rejectedClipStore.list().length,
  0,
  "voice gate persists no clip for rejected speech",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      rejectedDiscard,
      retainedAudioRecords: rejectedClipStore.list(),
    }),
  "voice-gate rejected flow leaves only network-safe metadata",
);
expectDoesNotThrow(
  () =>
    assertLogPayloadExcludesCapturedAudio({
      rejectedDiscard,
      retainedAudioRecords: rejectedClipStore.list(),
    }),
  "voice-gate rejected flow leaves only log-safe metadata",
);
expectNotIncludes(
  JSON.stringify({
    rejectedDiscard,
    retainedAudioRecords: rejectedClipStore.list(),
  }),
  "audioBytes",
  "voice-gate rejected flow serialization contains no captured audio",
);

const approvedTranscriptionClipStore = createLocalApprovedAudioClipStore();
const approvedTranscriptionBuffer = createShortRollingAudioBuffer();
const approvedRecognitionEvents = [];
const approvedGate = createApprovedVoiceGate({
  approvedVoices: createApprovedVoices(),
  nowMs: () => 1_700_000_000_000,
  onApprovedVoiceRecognized(event) {
    approvedRecognitionEvents.push(event);
  },
});
const approvedCapturedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approved-transcription-no-save-intent",
    timestampMs: 300,
    embedding: [1, 0, 0],
  },
  Uint8Array.from([50, 51, 52, 53]),
);
const approvedRecognitionFrame = appendCapturedFrameToCircularBuffer(
  approvedTranscriptionBuffer,
  approvedCapturedFrame,
);
const approvedRecognition = approvedGate.observeFrame(approvedRecognitionFrame);
const transcriptionCapturedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approved-transcription-no-save-intent",
    timestampMs: 420,
    embedding: [1, 0, 0],
  },
  Uint8Array.from([60, 61, 62]),
);
const transcriptionCapturedAudioBytes = transcriptionCapturedFrame.audioBytes;
const blockedFileBackedProcessingFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "blocked-file-backed-processing",
    timestampMs: 430,
    embedding: [1, 0, 0],
    filePath: "/tmp/case-unsaved-processing.raw",
  },
  Uint8Array.from([70, 71]),
);
const blockedFileBackedProcessingBytes =
  blockedFileBackedProcessingFrame.audioBytes;
expectThrows(
  () =>
    createApprovedSpeechAudioRelease({
      capturedFrames: [blockedFileBackedProcessingFrame],
      scheduleProcessingWindowExpiry: false,
    }),
  "approved processing rejects file-backed unsaved captured audio resources",
  CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
);
expectArrayEqual(
  blockedFileBackedProcessingBytes,
  [0, 0],
  "rejected file-backed processing resource zeroes captured audio bytes",
);
expectEqual(
  "audioBytes" in blockedFileBackedProcessingFrame,
  false,
  "rejected file-backed processing resource removes captured audio metadata",
);
const purgedTemporaryCapturedAudioFiles = [];
const temporaryCapturedAudioRelease = createApprovedSpeechAudioRelease({
  temporaryCapturedAudioFiles: [
    {
      filePath: "/tmp/case-unsaved-processing.raw",
      deleteFile(filePath) {
        purgedTemporaryCapturedAudioFiles.push(filePath);
      },
    },
  ],
  scheduleProcessingWindowExpiry: false,
});
expectEqual(
  temporaryCapturedAudioRelease.release("processing_complete"),
  true,
  "approved processing purges temporary captured-audio files before retention",
);
expectArrayEqual(
  purgedTemporaryCapturedAudioFiles,
  ["/tmp/case-unsaved-processing.raw"],
  "approved processing deletes purgeable temporary captured-audio files",
);
const approvedSpeechAudioRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: approvedTranscriptionBuffer,
  capturedFrames: [transcriptionCapturedFrame],
});
let transcriptionCleanup = null;

expectEqual(
  approvedRecognition.accepted,
  true,
  "approved voice recognition succeeds before transcription",
);
expectEqual(
  approvedRecognitionEvents.length,
  1,
  "approved voice recognition emits one metadata event",
);
expectEqual(
  "audioBytes" in approvedRecognitionEvents[0],
  false,
  "approved voice event contains no captured audio",
);
expectEqual(
  approvedTranscriptionClipStore.list().length,
  0,
  "approved transcription starts without retained audio records",
);

const transcriptionTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: approvedRecognitionEvents[0],
    processingStartedAtMs: approvedRecognitionEvents[0].recognizedAtMs + 250,
    startSpeechProcessing: (approvedVoiceEvent) => {
      transcriptionCleanup =
        releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
          releaseCapturedAudio: approvedSpeechAudioRelease.release,
        });
      return {
        transcript: "turn on the lights",
        matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
      };
    },
  });

expectEqual(
  transcriptionTrigger.triggered,
  true,
  "approved transcription starts from approved metadata",
);
expectEqual(
  transcriptionCleanup.transcriptionCompleted,
  true,
  "transcription cleanup records completion",
);
expectEqual(
  transcriptionCleanup.saveIntentPresent,
  DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
  "transcription completion defaults to no save intent",
);
expectEqual(
  transcriptionCleanup.releaseReason,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  "transcription completion uses the no-save release reason",
);
expectEqual(
  transcriptionCleanup.released,
  true,
  "transcription completion releases captured audio immediately",
);
expectEqual(
  approvedSpeechAudioRelease.release("voice_approval_complete"),
  false,
  "approved speech release is already complete after no-save transcription cleanup",
);
expectArrayEqual(
  approvedTranscriptionBuffer.read(),
  [],
  "approved transcription clears rolling audio without explicit save intent",
);
expectArrayEqual(
  transcriptionCapturedAudioBytes,
  [0, 0, 0],
  "approved transcription zeroes transient captured audio bytes",
);
expectEqual(
  "audioBytes" in transcriptionCapturedFrame,
  false,
  "approved transcription removes captured audio metadata",
);
expectEqual(
  approvedTranscriptionClipStore.list().length,
  0,
  "approved transcription persists no audio clip without explicit save intent",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      transcript: transcriptionTrigger.processingResult.transcript,
      matchedVoiceId: transcriptionTrigger.processingResult.matchedVoiceId,
      transcriptionCleanup,
      retainedAudioRecords: approvedTranscriptionClipStore.list(),
    }),
  "approved transcription forwards transcript metadata without captured audio",
);
expectNotIncludes(
  JSON.stringify({
    transcript: transcriptionTrigger.processingResult.transcript,
    transcriptionCleanup,
    retainedAudioRecords: approvedTranscriptionClipStore.list(),
  }),
  "audioBytes",
  "approved transcription serialization contains no captured audio",
);
expectThrows(
  () =>
    releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
      saveIntentPresent: true,
    }),
  "transcription no-save cleanup rejects save-intent retention without explicit save workflow",
  TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR,
);

const completedProcessingPersistentAudioRecords = new Map();
const completedProcessingPersistentAudioBlobs = new Map();
const completedProcessingClipStore = createDurableApprovedAudioClipStore({
  write(clip) {
    completedProcessingPersistentAudioRecords.set(clip.clipId, {
      clipId: clip.clipId,
      byteLength: clip.byteLength,
      saveActionKind: clip.saveActionKind,
      userVisiblePurpose: clip.userVisiblePurpose,
      retentionPurposeMetadata: clip.retentionPurposeMetadata,
    });
    completedProcessingPersistentAudioBlobs.set(
      clip.clipId,
      Uint8Array.from(clip.audioBytes),
    );
  },
});
const completedProcessingLogEntries = [];
const completedProcessingBuffer = createShortRollingAudioBuffer([
  80, 81, 82, 83,
]);
const completedProcessingFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "processing-complete-unsaved-memory-audio",
    timestampMs: 620,
    embedding: [0.8, 0.1, 0.1],
  },
  Uint8Array.from([84, 85, 86]),
);
const completedProcessingFrameAudioBytes =
  completedProcessingFrame.audioBytes;
const purgedUnsavedCapturedAudioCaches = [];
const completedProcessingCacheRelease = createApprovedSpeechAudioRelease({
  unsavedCapturedAudioCaches: [
    {
      cacheKey: "processing-complete-unsaved-audio-cache",
      clear(cacheKey) {
        purgedUnsavedCapturedAudioCaches.push(cacheKey);
      },
    },
  ],
  scheduleProcessingWindowExpiry: false,
});
expectEqual(
  completedProcessingCacheRelease.release("processing_complete"),
  true,
  "processing completion purges unsaved captured-audio caches",
);
expectArrayEqual(
  purgedUnsavedCapturedAudioCaches,
  ["processing-complete-unsaved-audio-cache"],
  "processing completion clears purgeable unsaved captured-audio caches",
);
const completedProcessingAudioRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: completedProcessingBuffer,
  capturedFrames: [completedProcessingFrame],
  onRelease(reason) {
    const logJson = createLogSafeJsonBody({
      level: "info",
      message: "Approved speech processing completed",
      event: "approved-speech-processing-complete",
      releaseReason: reason,
      retainedAudioRecordCount: completedProcessingClipStore.list().length,
      retainedAudioRecords: completedProcessingClipStore.list(),
      bufferLocation: BUFFER_LOCATION_ON_DEVICE,
      audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    });
    const logEntry = JSON.parse(logJson);
    assertLogPayloadExcludesCapturedAudio(logEntry);
    completedProcessingLogEntries.push(logEntry);
  },
});

expectEqual(
  completedProcessingAudioRelease.release("processing_complete"),
  true,
  "processing completion releases only in-memory unsaved captured audio",
);
expectArrayEqual(
  completedProcessingBuffer.read(),
  [],
  "processing completion clears in-memory rolling audio",
);
expectArrayEqual(
  completedProcessingFrameAudioBytes,
  [0, 0, 0],
  "processing completion zeroes in-memory captured audio bytes",
);
expectEqual(
  "audioBytes" in completedProcessingFrame,
  false,
  "processing completion removes in-memory captured audio metadata",
);
expectEqual(
  completedProcessingLogEntries.length,
  1,
  "processing completion emits one post-cleanup log entry",
);
expectEqual(
  completedProcessingLogEntries[0].releaseReason,
  "processing_complete",
  "processing completion log records the release reason without audio references",
);
expectEqual(
  completedProcessingLogEntries[0].retainedAudioRecordCount,
  0,
  "processing completion log records no retained unsaved audio records",
);
expectEqual(
  completedProcessingClipStore.list().length,
  0,
  "processing completion leaves no unsaved captured audio records in the durable clip store",
);
expectEqual(
  completedProcessingPersistentAudioRecords.size,
  0,
  "processing completion leaves no unsaved captured audio records in persistent storage",
);
expectEqual(
  completedProcessingPersistentAudioBlobs.size,
  0,
  "processing completion leaves no unsaved captured audio blobs in persistent storage",
);
const completedProcessingLogJson = JSON.stringify(
  completedProcessingLogEntries,
);
expectNotIncludes(
  completedProcessingLogJson,
  "audioBytes",
  "processing completion logs omit captured audio fields",
);
expectNotIncludes(
  completedProcessingLogJson,
  "rollingAudioBuffer",
  "processing completion logs omit rolling buffer references",
);
expectNotIncludes(
  completedProcessingLogJson,
  "temporaryCapturedAudioFiles",
  "processing completion logs omit temporary captured-audio file references",
);
expectNotIncludes(
  completedProcessingLogJson,
  "unsavedCapturedAudioCaches",
  "processing completion logs omit unsaved captured-audio cache references",
);
for (const rawAudioFragment of [
  "[80,81,82,83]",
  '"0":80,"1":81,"2":82,"3":83',
  "[84,85,86]",
  '"0":84,"1":85,"2":86',
]) {
  expectNotIncludes(
    completedProcessingLogJson,
    rawAudioFragment,
    "processing completion logs omit unsaved captured audio byte sequences",
  );
}
