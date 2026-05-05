import {
  APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createDurableApprovedAudioClipStore,
  createOnDeviceCircularAudioBuffer,
  getSavedApprovedAudioRecordView,
  listSavedApprovedAudioRecordViews,
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  assertSavedApprovedAudioRecordMetadataContract,
  saveApprovedAudioClipFromExplicitSaveAction,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
} from "../../constants/audioBuffer.ts";

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

function expectIncludes(actual, expected, message) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${message}: expected ${actual} to include ${expected}`);
  }
}

function expectSavedAudioRequiredPurposeMetadata(
  record,
  expectedLaterUsePurpose,
  expectedRequestedAtMs,
  messagePrefix,
) {
  expectEqual(
    record.userVisiblePurpose,
    expectedLaterUsePurpose,
    `${messagePrefix} records the explicit user-visible later-use purpose`,
  );
  expectEqual(
    record.purposeMetadata.kind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    `${messagePrefix} keeps the required purpose metadata kind`,
  );
  expectEqual(
    record.purposeMetadata.userVisiblePurpose,
    expectedLaterUsePurpose,
    `${messagePrefix} keeps the required purpose metadata purpose`,
  );
  expectEqual(
    record.purposeMetadata.requestedAtMs,
    expectedRequestedAtMs,
    `${messagePrefix} keeps the required purpose metadata request timestamp`,
  );
  expectEqual(
    record.userVisibleMetadata.kind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    `${messagePrefix} exposes user-visible purpose metadata kind`,
  );
  expectEqual(
    record.userVisibleMetadata.userVisiblePurpose,
    expectedLaterUsePurpose,
    `${messagePrefix} exposes user-visible purpose metadata purpose`,
  );
  expectEqual(
    record.userVisibleMetadata.laterUsePurpose,
    expectedLaterUsePurpose,
    `${messagePrefix} exposes the later-use purpose metadata`,
  );
  expectEqual(
    record.userVisibleMetadata.requestedAtMs,
    expectedRequestedAtMs,
    `${messagePrefix} exposes user-visible purpose metadata request timestamp`,
  );
  expectEqual(
    record.retentionPurposeMetadata.kind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    `${messagePrefix} stores retention purpose metadata kind`,
  );
  expectEqual(
    record.retentionPurposeMetadata.userVisiblePurpose,
    expectedLaterUsePurpose,
    `${messagePrefix} stores retention purpose metadata purpose`,
  );
  expectEqual(
    record.retentionPurposeMetadata.requestedAtMs,
    expectedRequestedAtMs,
    `${messagePrefix} stores retention purpose metadata request timestamp`,
  );
}

function createApprovedSaveRequestInput(overrides = {}) {
  const userVisiblePurpose = "Save this approved clip for note playback";
  const requestedAtMs = 1_700_000_000_000;

  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "voice-owner",
      confidence: 0.96,
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
    ...overrides,
  };
}

function createShortRollingAudioBuffer(initialAudioBytes) {
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
  buffer.append(Uint8Array.from(initialAudioBytes));
  return buffer;
}

function createObservedRollingAudioBuffer(initialAudioBytes) {
  const buffer = createShortRollingAudioBuffer(initialAudioBytes);
  let readCalled = false;

  return {
    rollingAudioBuffer: {
      read(...args) {
        readCalled = true;
        return buffer.read(...args);
      },
      clear() {
        buffer.clear();
      },
    },
    getReadCalled() {
      return readCalled;
    },
    readRemainingAudio() {
      return buffer.read();
    },
  };
}

const durableWrites = [];
const durableClipStore = createDurableApprovedAudioClipStore({
  write(clip) {
    durableWrites.push({
      clipId: clip.clipId,
      audioBytes: Array.from(clip.audioBytes),
      capturedAudioSaveIntent: clip.capturedAudioSaveIntent,
      saveActionKind: clip.saveActionKind,
      userVisiblePurpose: clip.userVisiblePurpose,
      purposeKind: clip.purposeMetadata.kind,
      purposeUserVisiblePurpose: clip.purposeMetadata.userVisiblePurpose,
      purposeRequestedAtMs: clip.purposeMetadata.requestedAtMs,
      userVisibleMetadataUserVisiblePurpose:
        clip.userVisibleMetadata.userVisiblePurpose,
      userVisibleMetadataLaterUsePurpose:
        clip.userVisibleMetadata.laterUsePurpose,
      userVisibleMetadataRequestedAtMs:
        clip.userVisibleMetadata.requestedAtMs,
      retentionPurposeUserVisiblePurpose:
        clip.retentionPurposeMetadata.userVisiblePurpose,
      retentionPurposeRequestedAtMs:
        clip.retentionPurposeMetadata.requestedAtMs,
      storageLocation: clip.storageLocation,
      retentionPolicy: clip.retentionPolicy,
    });
  },
});

const validSaveAction = createApprovedAudioSaveAction(
  createApprovedSaveRequestInput(),
);
const validLaterUsePurpose = validSaveAction.request.userVisiblePurpose;
const validPurposeRequestedAtMs =
  validSaveAction.request.purposeMetadata.requestedAtMs;
const validSaveAuthorization =
  createApprovedAudioSaveAuthorization(validSaveAction);
const acceptedSaveBuffer = createShortRollingAudioBuffer([21, 22, 23]);
const acceptedSavedClip = saveApprovedAudioClipFromExplicitSaveAction(
  durableClipStore,
  {
    saveAction: validSaveAction,
    saveAuthorization: validSaveAuthorization,
    rollingAudioBuffer: acceptedSaveBuffer,
    clipId: "accepted-explicit-purpose-save",
    savedAtMs: 1_700_000_001_000,
  },
);

expectArrayEqual(
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT.requiredPurposeMetadataFields,
  ["kind", "userVisiblePurpose", "requestedAtMs"],
  "saved-audio metadata contract requires purpose metadata fields",
);
expectArrayEqual(
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT.requiredUserVisibleMetadataFields,
  ["kind", "userVisiblePurpose", "laterUsePurpose", "requestedAtMs"],
  "saved-audio metadata contract requires user-visible later-use fields",
);
expectArrayEqual(
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT.requiredRetentionPurposeMetadataFields,
  ["kind", "userVisiblePurpose", "requestedAtMs"],
  "saved-audio metadata contract requires retention purpose metadata fields",
);
expectArrayEqual(
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT.requiredLaterUsePurposeFields,
  [
    "userVisiblePurpose",
    "purposeMetadata.userVisiblePurpose",
    "userVisibleMetadata.laterUsePurpose",
    "retentionPurposeMetadata.userVisiblePurpose",
  ],
  "saved-audio metadata contract names every later-use purpose field",
);
expectEqual(
  SAVED_APPROVED_AUDIO_METADATA_CONTRACT.purposeKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "saved-audio metadata contract pins the user-visible later-use purpose kind",
);

expectEqual(
  durableWrites.length,
  1,
  "accepted explicit save writes one durable captured-audio record",
);
expectArrayEqual(
  durableWrites[0].audioBytes,
  [21, 22, 23],
  "accepted explicit save writes approved captured audio bytes locally",
);
expectArrayEqual(
  acceptedSavedClip.audioBytes,
  [21, 22, 23],
  "accepted explicit save returns the local retained clip for the visible purpose",
);
expectEqual(
  acceptedSavedClip.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "accepted explicit save records the captured-audio save intent",
);
expectEqual(
  acceptedSavedClip.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "accepted explicit save records the explicit save action",
);
expectEqual(
  acceptedSavedClip.userVisiblePurpose,
  validLaterUsePurpose,
  "accepted explicit save records the user-visible later-use purpose",
);
expectSavedAudioRequiredPurposeMetadata(
  acceptedSavedClip,
  validLaterUsePurpose,
  validPurposeRequestedAtMs,
  "accepted explicit saved-audio clip",
);
expectEqual(
  acceptedSavedClip.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "accepted explicit save keeps captured audio local",
);
expectEqual(
  acceptedSavedClip.retentionMetadata.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "accepted explicit save records local-only retention metadata",
);
expectEqual(
  acceptedSavedClip.retentionMetadata.retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "accepted explicit save records discard-unless-saved retention metadata",
);
expectEqual(
  durableWrites[0].capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "durable saved-audio write records explicit captured-audio save intent",
);
expectEqual(
  durableWrites[0].saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "durable saved-audio write records the explicit approved-audio save action",
);
expectEqual(
  durableWrites[0].purposeKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "durable saved-audio write includes required purpose metadata kind",
);
expectEqual(
  durableWrites[0].purposeUserVisiblePurpose,
  validLaterUsePurpose,
  "durable saved-audio write includes required purpose metadata purpose",
);
expectEqual(
  durableWrites[0].purposeRequestedAtMs,
  validPurposeRequestedAtMs,
  "durable saved-audio write includes required purpose metadata request timestamp",
);
expectEqual(
  durableWrites[0].userVisibleMetadataUserVisiblePurpose,
  validLaterUsePurpose,
  "durable saved-audio write includes required user-visible metadata purpose",
);
expectEqual(
  durableWrites[0].userVisibleMetadataLaterUsePurpose,
  validLaterUsePurpose,
  "durable saved-audio write includes required later-use purpose metadata",
);
expectEqual(
  durableWrites[0].userVisibleMetadataRequestedAtMs,
  validPurposeRequestedAtMs,
  "durable saved-audio write includes required user-visible metadata timestamp",
);
expectEqual(
  durableWrites[0].retentionPurposeUserVisiblePurpose,
  validLaterUsePurpose,
  "durable saved-audio write includes required retention purpose metadata",
);
expectEqual(
  durableWrites[0].retentionPurposeRequestedAtMs,
  validPurposeRequestedAtMs,
  "durable saved-audio write includes required retention purpose timestamp",
);
expectEqual(
  durableWrites[0].storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "durable saved-audio write keeps retained audio on-device",
);
expectEqual(
  durableWrites[0].retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "durable saved-audio write keeps discard-unless-saved policy metadata",
);

const acceptedStoredClip = durableClipStore.get(
  "accepted-explicit-purpose-save",
);
if (!acceptedStoredClip) {
  throw new Error("accepted explicit saved-audio clip was not retained");
}
expectArrayEqual(
  acceptedStoredClip.audioBytes,
  [21, 22, 23],
  "accepted explicit saved audio remains retained in the local clip store",
);
expectSavedAudioRequiredPurposeMetadata(
  acceptedStoredClip,
  validLaterUsePurpose,
  validPurposeRequestedAtMs,
  "retained explicit saved-audio clip",
);
assertSavedApprovedAudioRecordMetadataContract(acceptedStoredClip);

const acceptedSavedAudioRecords =
  listSavedApprovedAudioRecordViews(durableClipStore);
expectEqual(
  acceptedSavedAudioRecords.length,
  1,
  "saved-audio record list exposes the retained explicit save",
);
const acceptedSavedAudioRecord = getSavedApprovedAudioRecordView(
  durableClipStore,
  "accepted-explicit-purpose-save",
);
if (!acceptedSavedAudioRecord) {
  throw new Error(
    "accepted explicit saved-audio metadata record was not retained",
  );
}
expectEqual(
  acceptedSavedAudioRecord.recordSchemaVersion,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  "saved-audio metadata record uses the approved record schema",
);
expectEqual(
  acceptedSavedAudioRecord.retainedBecause,
  `Explicitly saved for later use: ${validLaterUsePurpose}`,
  "saved-audio metadata record explains the explicit later-use retention purpose",
);
expectEqual(
  acceptedSavedAudioRecord.retentionReason,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
  "saved-audio metadata record marks explicit user-visible later-use retention",
);
expectEqual(
  "audioBytes" in acceptedSavedAudioRecord,
  false,
  "saved-audio metadata record proves retention without exposing raw audio bytes",
);
expectSavedAudioRequiredPurposeMetadata(
  acceptedSavedAudioRecord,
  validLaterUsePurpose,
  validPurposeRequestedAtMs,
  "retained saved-audio metadata record",
);
expectArrayEqual(
  acceptedSaveBuffer.read(),
  [],
  "accepted explicit save clears the rolling buffer after persistence",
);

const segmentOnlyDurableWrites = [];
const segmentOnlyDurableClipStore = createDurableApprovedAudioClipStore({
  write(clip) {
    segmentOnlyDurableWrites.push({
      clipId: clip.clipId,
      audioBytes: Array.from(clip.audioBytes),
      userVisiblePurpose: clip.userVisiblePurpose,
    });
  },
});
const segmentOnlyBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 2,
  },
);
const segmentRecognitionTimestampMs =
  validSaveAction.request.approvedVoiceMatch.recognizedAtMs;
segmentOnlyBuffer.append(Uint8Array.from([7, 8, 9, 10]), {
  timestampMs: segmentRecognitionTimestampMs - 800,
});
segmentOnlyBuffer.append(Uint8Array.from([91, 92]), {
  timestampMs: segmentRecognitionTimestampMs,
});
const approvedSpeechAudioSegment =
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: segmentOnlyBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "voice-owner",
      recognizedAtMs: segmentRecognitionTimestampMs,
      latencyMs: 500,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "voice-owner",
        score: 0.97,
        threshold: 0.9,
      },
    },
    selectedAtMs: segmentRecognitionTimestampMs,
  });
if (!approvedSpeechAudioSegment) {
  throw new Error(
    "approved speech segment was not selected for explicit save",
  );
}
expectArrayEqual(
  approvedSpeechAudioSegment.audioBytes,
  [91, 92],
  "approved speech segment excludes older rolling-buffer audio before save",
);
const segmentOnlySavedClip = saveApprovedAudioClipFromExplicitSaveAction(
  segmentOnlyDurableClipStore,
  {
    saveAction: validSaveAction,
    saveAuthorization: validSaveAuthorization,
    rollingAudioBuffer: segmentOnlyBuffer,
    approvedSpeechAudioSegment,
    clipId: "segment-only-explicit-purpose-save",
    savedAtMs: 1_700_000_001_500,
  },
);

expectEqual(
  segmentOnlyDurableWrites.length,
  1,
  "explicit-purpose segment save writes one durable clip",
);
expectArrayEqual(
  segmentOnlyDurableWrites[0].audioBytes,
  [91, 92],
  "explicit-purpose segment save durably persists only the intended approved audio segment",
);
expectArrayEqual(
  segmentOnlySavedClip.audioBytes,
  [91, 92],
  "explicit-purpose segment save returns only the intended approved audio segment",
);
expectEqual(
  segmentOnlyDurableWrites[0].userVisiblePurpose,
  validLaterUsePurpose,
  "explicit-purpose segment save keeps the user-visible later-use purpose on the retained segment",
);
expectArrayEqual(
  segmentOnlyBuffer.read(),
  [],
  "explicit-purpose segment save clears surrounding rolling-buffer audio after retaining the intended segment",
);

const rejectedPersistenceAttempts = [
  {
    name: "missing explicit user save action",
    saveActionOverrides: {
      kind: undefined,
    },
    expectedContract: APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
    expectedMessage: `saveAction.kind must be ${APPROVED_AUDIO_SAVE_ACTION_KIND}`,
    audioBytes: [29, 30],
  },
  {
    name: "missing explicit save action marker",
    requestOverrides: {
      saveActionKind: undefined,
    },
    expectedContract: APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    expectedMessage: `saveActionKind must be ${APPROVED_AUDIO_SAVE_ACTION_KIND}`,
    audioBytes: [30, 31],
  },
  {
    name: "missing captured-audio save intent",
    requestOverrides: {
      capturedAudioSaveIntent: undefined,
    },
    expectedMessage: "capturedAudioSaveIntent must be true",
    audioBytes: [31, 32],
  },
  {
    name: "missing user-visible later-use purpose",
    requestOverrides: {
      userVisiblePurpose: " ",
    },
    expectedMessage:
      "userVisiblePurpose must be a non-empty user-visible later-use purpose",
    audioBytes: [33, 34],
  },
  {
    name: "missing purpose metadata",
    requestOverrides: {
      purposeMetadata: undefined,
    },
    expectedMessage: "purposeMetadata must be an object",
    audioBytes: [35, 36],
  },
  {
    name: "missing purpose metadata kind",
    requestOverrides: {
      purposeMetadata: {
        userVisiblePurpose: validLaterUsePurpose,
        requestedAtMs: validPurposeRequestedAtMs,
      },
    },
    expectedMessage: `purposeMetadata.kind must be ${APPROVED_AUDIO_SAVE_PURPOSE_KIND}`,
    audioBytes: [36, 37],
  },
  {
    name: "empty purpose metadata later-use purpose",
    requestOverrides: {
      purposeMetadata: {
        kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
        userVisiblePurpose: " ",
        requestedAtMs: validPurposeRequestedAtMs,
      },
    },
    expectedMessage:
      "purposeMetadata.userVisiblePurpose must be a non-empty user-visible later-use purpose",
    audioBytes: [37, 38],
  },
  {
    name: "missing purpose metadata later-use purpose",
    requestOverrides: {
      purposeMetadata: {
        kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
        requestedAtMs: validPurposeRequestedAtMs,
      },
    },
    expectedMessage:
      "purposeMetadata.userVisiblePurpose must be a non-empty user-visible later-use purpose",
    audioBytes: [39, 40],
  },
  {
    name: "missing purpose metadata request timestamp",
    requestOverrides: {
      purposeMetadata: {
        kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
        userVisiblePurpose: validLaterUsePurpose,
      },
    },
    expectedMessage:
      "purposeMetadata.requestedAtMs must be a non-negative millisecond timestamp",
    audioBytes: [40, 41],
  },
];

for (const rejectedAttempt of rejectedPersistenceAttempts) {
  const observedBuffer = createObservedRollingAudioBuffer(
    rejectedAttempt.audioBytes,
  );

  try {
    saveApprovedAudioClipFromExplicitSaveAction(durableClipStore, {
      saveAction: {
        kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
        request: createApprovedSaveRequestInput(
          rejectedAttempt.requestOverrides,
        ),
        ...rejectedAttempt.saveActionOverrides,
      },
      saveAuthorization: validSaveAuthorization,
      rollingAudioBuffer: observedBuffer.rollingAudioBuffer,
      clipId: `rejected-${rejectedAttempt.name.replaceAll(" ", "-")}`,
    });
    throw new Error(`${rejectedAttempt.name} guard was not thrown`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expectIncludes(
      message,
      rejectedAttempt.expectedContract ??
        APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
      `${rejectedAttempt.name} rejects captured-audio persistence through the explicit save contract`,
    );
    expectIncludes(
      message,
      rejectedAttempt.expectedMessage,
      `${rejectedAttempt.name} explains the missing intent or purpose`,
    );
  }

  expectEqual(
    observedBuffer.getReadCalled(),
    false,
    `${rejectedAttempt.name} is rejected before reading captured audio`,
  );
  expectArrayEqual(
    observedBuffer.readRemainingAudio(),
    [],
    `${rejectedAttempt.name} clears buffered audio after rejected persistence`,
  );
  expectEqual(
    durableWrites.length,
    1,
    `${rejectedAttempt.name} does not write captured audio durably`,
  );
  expectEqual(
    durableClipStore.list().length,
    1,
    `${rejectedAttempt.name} does not add a retained audio record`,
  );
}
