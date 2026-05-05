import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  appendCapturedFrameToCircularBuffer,
  assertApprovedVoiceVerifiedForBufferedAudioDownstream,
  assertLogPayloadExcludesCapturedAudio,
  assertNetworkPayloadExcludesBufferedAudio,
  attachNonPersistableAudioBytes,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createDurableApprovedAudioClipStore,
  createOnDeviceCircularAudioBuffer,
  discardRejectedSpeechBeforeDownstream,
  saveApprovedAudioClipFromExplicitSaveAction,
} from "../../constants/audioBuffer.ts";
import { triggerSpeechProcessingPipelineFromApprovedVoiceEvent } from "./approvedVoiceProcessingLatency.ts";
import { createApprovedVoiceGate } from "./voiceGate.js";

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

function createDefaultRollingAudioBuffer() {
  return createOnDeviceCircularAudioBuffer({
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  });
}

function createApprovedVoiceSaveRequest(approvedVoiceEvent) {
  const requestedAtMs = approvedVoiceEvent.recognizedAtMs;
  const userVisiblePurpose = "Save the approved voice command for playback";

  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
      confidence: approvedVoiceEvent.confidence,
      recognizedAtMs: approvedVoiceEvent.recognizedAtMs,
      recognitionLatencyMs: approvedVoiceEvent.latencyMs ?? 0,
      reason: approvedVoiceEvent.reason,
    },
    approvedUserIdentity: {
      approvedVoiceId: approvedVoiceEvent.matchedVoiceId,
      approvedUserId: `user-${approvedVoiceEvent.matchedVoiceId}`,
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

test("non-approved voices are rejected before downstream processing or audio retention", () => {
  const approvedVoice = {
    id: "case-owner",
    approved: true,
    enrolled: true,
    embeddings: [[1, 0, 0]],
  };
  const cases = [
    {
      name: "unknown non-approved visitor",
      utteranceId: "unknown-non-approved-visitor",
      approvedVoices: [approvedVoice],
      embedding: [0, 1, 0],
      audioBytes: [10, 11, 12, 13],
      expectedReason: "below_threshold",
      expectedRejectedVoiceId: null,
    },
    {
      name: "enrolled unapproved neighbor",
      utteranceId: "enrolled-unapproved-neighbor",
      approvedVoices: [
        approvedVoice,
        {
          id: "unapproved-neighbor",
          approved: false,
          enrolled: true,
          embeddings: [[0, 1, 0]],
        },
      ],
      embedding: [0, 1, 0],
      audioBytes: [20, 21, 22, 23],
      expectedReason: "below_threshold",
      expectedRejectedVoiceId: null,
    },
  ];

  for (const scenario of cases) {
    const rollingAudioBuffer = createShortRollingAudioBuffer();
    const emittedApprovedEvents = [];
    const downstreamProcessingCalls = [];
    const durableRetentionWrites = [];
    const retainedAudioStore = createDurableApprovedAudioClipStore({
      write(clip) {
        durableRetentionWrites.push(clip);
      },
    });
    const gate = createApprovedVoiceGate({
      approvedVoices: scenario.approvedVoices,
      nowMs: () => 1_700_000_000_000,
      onApprovedVoiceRecognized(approvedVoiceEvent) {
        emittedApprovedEvents.push(approvedVoiceEvent);
        triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
          approvedVoiceEvent,
          processingStartedAtMs: approvedVoiceEvent.recognizedAtMs,
          startSpeechProcessing: (event) => {
            downstreamProcessingCalls.push(event);
            const saveAction = createApprovedAudioSaveAction(
              createApprovedVoiceSaveRequest(event),
            );
            return saveApprovedAudioClipFromExplicitSaveAction(
              retainedAudioStore,
              {
                saveAction,
                saveAuthorization:
                  createApprovedAudioSaveAuthorization(saveAction),
                rollingAudioBuffer,
                clipId: `unexpected-retained-${scenario.utteranceId}`,
                savedAtMs: event.recognizedAtMs,
              },
            );
          },
        });
      },
    });
    const capturedFrame = attachNonPersistableAudioBytes(
      {
        utteranceId: scenario.utteranceId,
        timestampMs: 0,
        embedding: scenario.embedding,
      },
      Uint8Array.from(scenario.audioBytes),
    );
    const capturedAudioBytes = capturedFrame.audioBytes;
    const recognitionFrame = appendCapturedFrameToCircularBuffer(
      rollingAudioBuffer,
      capturedFrame,
    );
    const recognitionResult = gate.observeFrame(recognitionFrame);

    assert.equal(
      "audioBytes" in recognitionFrame,
      false,
      `${scenario.name} recognition frame excludes captured audio`,
    );
    assert.deepEqual(
      Array.from(capturedAudioBytes),
      scenario.audioBytes.map(() => 0),
      `${scenario.name} transient frame bytes are zeroed after buffering`,
    );
    assert.equal(
      recognitionResult.accepted,
      false,
      `${scenario.name} is rejected by the approved voice gate`,
    );
    assert.equal(recognitionResult.matchedVoiceId, null);
    assert.equal(recognitionResult.downstreamAuthorization, null);
    assert.equal(recognitionResult.reason, scenario.expectedReason);
    assert.equal(
      recognitionResult.rejectedVoiceId,
      scenario.expectedRejectedVoiceId,
    );
    assert.equal(
      emittedApprovedEvents.length,
      0,
      `${scenario.name} emits no approved recognition event`,
    );
    assert.equal(
      downstreamProcessingCalls.length,
      0,
      `${scenario.name} never reaches downstream speech processing`,
    );
    assert.equal(
      retainedAudioStore.list().length,
      0,
      `${scenario.name} creates no retained local audio records`,
    );
    assert.equal(
      durableRetentionWrites.length,
      0,
      `${scenario.name} performs no durable retention writes`,
    );

    assert.throws(
      () =>
        assertApprovedVoiceVerifiedForBufferedAudioDownstream({
          downstreamPath: "transcription",
          recognitionResult,
        }),
      new RegExp(BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR),
      `${scenario.name} cannot pass rejected speech into transcription`,
    );
    assert.throws(
      () =>
        triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
          approvedVoiceEvent: {
            accepted: recognitionResult.accepted,
            matchedVoiceId: recognitionResult.matchedVoiceId,
            recognizedAtMs: 1_700_000_000_000,
            downstreamAuthorization:
              recognitionResult.downstreamAuthorization,
          },
          processingStartedAtMs: 1_700_000_000_001,
          startSpeechProcessing: () => {
            downstreamProcessingCalls.push("unexpected rejected speech");
          },
        }),
      /speech processing requires an approved voice recognition event/,
      `${scenario.name} rejected recognition result cannot trigger processing`,
    );
    assert.equal(
      downstreamProcessingCalls.length,
      0,
      `${scenario.name} rejected processing guard does not call the callback`,
    );

    const rejectedDiscard = discardRejectedSpeechBeforeDownstream({
      recognitionResult,
      rollingAudioBuffer,
    });

    assert.equal(rejectedDiscard.discarded, true);
    assert.equal(rejectedDiscard.accepted, false);
    assert.equal(rejectedDiscard.matchedVoiceId, null);
    assert.equal(
      rejectedDiscard.rollingBufferSizeBytesAfterDiscard,
      0,
      `${scenario.name} clears the rolling buffer after rejection`,
    );
    assert.deepEqual(Array.from(rollingAudioBuffer.read()), []);
    assert.equal(retainedAudioStore.list().length, 0);
    assert.equal(durableRetentionWrites.length, 0);
    assert.doesNotThrow(() =>
      assertNetworkPayloadExcludesBufferedAudio({
        recognitionResult,
        rejectedDiscard,
        retainedAudioRecords: retainedAudioStore.list(),
      }),
    );
    assert.doesNotThrow(() =>
      assertLogPayloadExcludesCapturedAudio({
        recognitionResult,
        rejectedDiscard,
        retainedAudioRecords: retainedAudioStore.list(),
      }),
    );
    assert.equal(
      JSON.stringify({
        recognitionResult,
        rejectedDiscard,
        retainedAudioRecords: retainedAudioStore.list(),
      }).includes("audioBytes"),
      false,
      `${scenario.name} rejection payload serializes no captured audio`,
    );
  }
});

test("non-enrolled voice rejection uses the default rolling buffer window and discards before processing or retention", () => {
  const rollingAudioBuffer = createDefaultRollingAudioBuffer();
  const initialBufferState = rollingAudioBuffer.getState();
  const emittedApprovedEvents = [];
  const downstreamProcessingCalls = [];
  const durableRetentionWrites = [];
  const retainedAudioStore = createDurableApprovedAudioClipStore({
    write(clip) {
      durableRetentionWrites.push(clip);
    },
  });
  const gate = createApprovedVoiceGate({
    approvedVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0, 0]],
      },
      {
        id: "not-yet-enrolled-family-member",
        approved: true,
        enrolled: false,
        embeddings: [[0, 1, 0]],
      },
    ],
    nowMs: () => 1_700_000_100_000,
    onApprovedVoiceRecognized(approvedVoiceEvent) {
      emittedApprovedEvents.push(approvedVoiceEvent);
      triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
        approvedVoiceEvent,
        processingStartedAtMs: approvedVoiceEvent.recognizedAtMs,
        startSpeechProcessing(event) {
          downstreamProcessingCalls.push(event);
        },
      });
    },
  });
  const oversizedDefaultWindowAudioBytes = Uint8Array.from(
    Array.from(
      { length: initialBufferState.capacityBytes + 8 },
      (_, index) => index + 1,
    ),
  );
  const capturedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: "not-yet-enrolled-family-member",
      timestampMs: 17_000,
      embedding: [0, 1, 0],
    },
    oversizedDefaultWindowAudioBytes,
  );
  const capturedAudioBytes = capturedFrame.audioBytes;
  const recognitionFrame = appendCapturedFrameToCircularBuffer(
    rollingAudioBuffer,
    capturedFrame,
  );
  const boundedBufferState = rollingAudioBuffer.getState();
  const recognitionResult = gate.observeFrame(recognitionFrame);

  assert.equal(
    initialBufferState.rollingBufferDefaultDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  );
  assert.equal(
    initialBufferState.rollingBufferActiveDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  );
  assert.equal(
    initialBufferState.rollingBufferDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  );
  assert.equal(initialBufferState.bufferLocation, BUFFER_LOCATION_ON_DEVICE);
  assert.equal(
    boundedBufferState.rollingBufferDefaultDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  );
  assert.equal(
    boundedBufferState.rollingBufferActiveDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  );
  assert.equal(
    boundedBufferState.availableDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    "pre-decision audio is bounded to the immutable default rolling window",
  );
  assert.equal(
    boundedBufferState.sizeBytes,
    boundedBufferState.capacityBytes,
    "default rolling buffer keeps only the newest default-duration audio",
  );
  assert.equal(
    boundedBufferState.oldestRetainedAudioTimestampMs,
    2_000,
    "default rolling buffer evicts audio older than the 15-second window",
  );
  assert.deepEqual(
    Array.from(capturedAudioBytes),
    Array.from(oversizedDefaultWindowAudioBytes, () => 0),
    "captured frame bytes are zeroed after local buffer handoff",
  );
  assert.equal(
    "audioBytes" in recognitionFrame,
    false,
    "voice-gate recognition frame carries no retained raw audio",
  );

  assert.equal(recognitionResult.accepted, false);
  assert.equal(recognitionResult.reason, "below_threshold");
  assert.equal(recognitionResult.matchedVoiceId, null);
  assert.equal(recognitionResult.rejectedVoiceId, null);
  assert.equal(recognitionResult.downstreamAuthorization, null);
  assert.equal(emittedApprovedEvents.length, 0);
  assert.equal(downstreamProcessingCalls.length, 0);
  assert.equal(retainedAudioStore.list().length, 0);
  assert.equal(durableRetentionWrites.length, 0);

  assert.throws(
    () =>
      assertApprovedVoiceVerifiedForBufferedAudioDownstream({
        downstreamPath: "transcription",
        recognitionResult,
      }),
    new RegExp(BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR),
  );

  const rejectedDiscard = discardRejectedSpeechBeforeDownstream({
    recognitionResult,
    rollingAudioBuffer,
  });

  assert.equal(rejectedDiscard.discarded, true);
  assert.equal(
    rejectedDiscard.rollingBufferSizeBytesAfterDiscard,
    0,
    "non-enrolled speech is discarded after rejection instead of retained past the default buffer",
  );
  assert.deepEqual(Array.from(rollingAudioBuffer.read()), []);
  assert.equal(retainedAudioStore.list().length, 0);
  assert.equal(durableRetentionWrites.length, 0);
  assert.doesNotThrow(() =>
    assertNetworkPayloadExcludesBufferedAudio({
      recognitionResult,
      rejectedDiscard,
      retainedAudioRecords: retainedAudioStore.list(),
    }),
  );
  assert.doesNotThrow(() =>
    assertLogPayloadExcludesCapturedAudio({
      recognitionResult,
      rejectedDiscard,
      retainedAudioRecords: retainedAudioStore.list(),
    }),
  );
});
