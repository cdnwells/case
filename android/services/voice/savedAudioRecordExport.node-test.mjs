import assert from "node:assert/strict";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH,
  SAVED_APPROVED_AUDIO_EXPORT_PATHS,
  SAVED_APPROVED_AUDIO_USER_EXPORT_PATH,
  assertLogPayloadExcludesCapturedAudio,
  assertTelemetryPayloadExcludesCapturedAudio,
  attachNonPersistableAudioBytes,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createApprovedSpeechAudioRelease,
  createLocalApprovedAudioClipStore,
  createNetworkSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  createSavedApprovedAudioAdminExport,
  createSavedApprovedAudioUserExport,
  saveApprovedAudioClipFromExplicitSaveAction,
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

function createApprovedAudioSaveRequestInput({
  approvedVoiceId,
  approvedUserId,
  displayName,
  userVisiblePurpose,
  requestedAtMs,
}) {
  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: approvedVoiceId,
      confidence: 0.97,
      recognizedAtMs: requestedAtMs - 120,
      recognitionLatencyMs: 120,
      reason: "approved_voice_match",
    },
    approvedUserIdentity: {
      approvedVoiceId,
      approvedUserId,
      displayName,
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

function saveApprovedAudioClip({
  store,
  clipId,
  audioBytes,
  approvedVoiceId,
  approvedUserId,
  displayName,
  userVisiblePurpose,
  requestedAtMs,
}) {
  const rollingAudioBuffer = createShortRollingAudioBuffer(audioBytes);
  const saveAction = createApprovedAudioSaveAction(
    createApprovedAudioSaveRequestInput({
      approvedVoiceId,
      approvedUserId,
      displayName,
      userVisiblePurpose,
      requestedAtMs,
    }),
  );
  const saveAuthorization = createApprovedAudioSaveAuthorization(saveAction);

  return saveApprovedAudioClipFromExplicitSaveAction(store, {
    saveAction,
    saveAuthorization,
    rollingAudioBuffer,
    clipId,
    savedAtMs: requestedAtMs + 1000,
  });
}

function releaseUnsavedCapturedAudioFootprint() {
  const rollingAudioBuffer = createShortRollingAudioBuffer([
    231, 232, 233, 234,
  ]);
  const capturedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: "unsaved-export-utterance",
      timestampMs: 1700000200000,
      embedding: [0.7, 0.2, 0.1],
    },
    Uint8Array.from([241, 242, 243]),
  );
  const capturedAudioBytes = capturedFrame.audioBytes;
  const release = createApprovedSpeechAudioRelease({
    rollingAudioBuffer,
    capturedFrames: [capturedFrame],
    processingWindowStartedAtMs: 1700000200000,
    scheduleProcessingWindowExpiry: false,
  });

  assert.equal(
    release.release("processing_complete"),
    true,
    "unsaved captured audio is released before exports are created",
  );
  assert.deepEqual(
    Array.from(rollingAudioBuffer.read()),
    [],
    "unsaved rolling audio buffer is cleared before exports",
  );
  assert.deepEqual(
    Array.from(capturedAudioBytes),
    [0, 0, 0],
    "unsaved captured frame bytes are zeroed before exports",
  );
  assert.equal(
    "audioBytes" in capturedFrame,
    false,
    "unsaved captured frame audio metadata is removed before exports",
  );

  return {
    forbiddenFragments: [
      "[231,232,233,234]",
      '"0":231,"1":232,"2":233,"3":234',
      "231, 232, 233, 234",
      "[241,242,243]",
      '"0":241,"1":242,"2":243',
      "241, 242, 243",
      "temporaryCapturedAudioFiles",
      "unsavedCapturedAudioCaches",
      "rollingAudioBuffer",
      "bufferedAudio",
      "audioBytes",
    ],
  };
}

const store = createLocalApprovedAudioClipStore();
const aliceSavedClip = saveApprovedAudioClip({
  store,
  clipId: "alice-note-playback",
  audioBytes: [101, 102, 103],
  approvedVoiceId: "voice-alice",
  approvedUserId: "user-alice",
  displayName: "Alice",
  userVisiblePurpose: "Note playback",
  requestedAtMs: 1700000000000,
});
const bobSavedClip = saveApprovedAudioClip({
  store,
  clipId: "bob-follow-up",
  audioBytes: [111, 112, 113],
  approvedVoiceId: "voice-bob",
  approvedUserId: "user-bob",
  displayName: "Bob",
  userVisiblePurpose: "Voice memo follow-up",
  requestedAtMs: 1700000100000,
});
const unsavedCapturedAudioFootprint = releaseUnsavedCapturedAudioFootprint();

assert.deepEqual(
  Array.from(store.get("alice-note-playback").audioBytes),
  [101, 102, 103],
  "saved audio remains available locally for Alice's explicit later-use purpose",
);
assert.deepEqual(
  Array.from(store.get("bob-follow-up").audioBytes),
  [111, 112, 113],
  "saved audio remains available locally for Bob's explicit later-use purpose",
);
assert.deepEqual(
  Array.from(aliceSavedClip.audioBytes),
  [101, 102, 103],
  "Alice saved clip returns local raw audio outside export paths",
);
assert.deepEqual(
  Array.from(bobSavedClip.audioBytes),
  [111, 112, 113],
  "Bob saved clip returns local raw audio outside export paths",
);

const userExport = createSavedApprovedAudioUserExport(store, {
  approvedUserId: " user-alice ",
  exportedAtMs: 1700000300000,
});
const adminExport = createSavedApprovedAudioAdminExport(store, {
  exportedAtMs: 1700000305000,
});
const exportPayloads = [
  {
    name: "user export",
    payload: userExport,
  },
  {
    name: "admin export",
    payload: adminExport,
  },
];

assert.deepEqual(
  Array.from(SAVED_APPROVED_AUDIO_EXPORT_PATHS),
  [
    SAVED_APPROVED_AUDIO_USER_EXPORT_PATH,
    SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH,
  ],
  "saved approved audio declares exactly the user and admin export paths",
);
assert.deepEqual(
  exportPayloads.map(({ payload }) => payload.exportPath).sort(),
  Array.from(SAVED_APPROVED_AUDIO_EXPORT_PATHS).sort(),
  "test covers every saved approved audio export path",
);
assert.equal(
  userExport.approvedUserId,
  "user-alice",
  "user export normalizes the selected approved user id",
);
assert.equal(
  userExport.savedAudioRecordCount,
  1,
  "user export includes only the selected user's saved audio metadata",
);
assert.deepEqual(
  userExport.savedAudioRecordViews.map((record) => record.clipId),
  ["alice-note-playback"],
  "user export omits other users' saved audio metadata",
);
assert.equal(
  adminExport.savedAudioRecordCount,
  2,
  "admin export includes all saved audio metadata",
);
assert.deepEqual(
  Array.from(adminExport.retainedOwnerUserIds),
  ["user-alice", "user-bob"],
  "admin export identifies retained saved-audio owners without raw audio",
);

for (const { name, payload } of exportPayloads) {
  assert.equal(
    payload.rawAudioIncluded,
    false,
    `${name} explicitly excludes raw audio bytes`,
  );
  assert.equal(
    payload.bufferLocation,
    BUFFER_LOCATION_ON_DEVICE,
    `${name} preserves local-only buffer metadata`,
  );
  assert.equal(
    payload.audioRetentionPolicy,
    AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    `${name} preserves discard-unless-saved retention metadata`,
  );
  assert.doesNotThrow(
    () => createNetworkSafeJsonBody(payload),
    `${name} is safe for user/admin export delivery without captured audio`,
  );
  assert.doesNotThrow(
    () => assertLogPayloadExcludesCapturedAudio(payload),
    `${name} is safe for export audit logs without captured audio`,
  );
  assert.doesNotThrow(
    () => assertTelemetryPayloadExcludesCapturedAudio(payload),
    `${name} is safe for export telemetry without captured audio`,
  );

  const serializedExport = JSON.stringify(payload);
  assert.equal(
    serializedExport.includes("byteLength"),
    true,
    `${name} keeps metadata proving retained clips exist`,
  );
  for (const forbiddenFragment of [
    "[101,102,103]",
    '"0":101,"1":102,"2":103',
    "101, 102, 103",
    "[111,112,113]",
    '"0":111,"1":112,"2":113',
    "111, 112, 113",
    ...unsavedCapturedAudioFootprint.forbiddenFragments,
  ]) {
    assert.equal(
      serializedExport.includes(forbiddenFragment),
      false,
      `${name} omits captured audio export fragment ${forbiddenFragment}`,
    );
  }
}
