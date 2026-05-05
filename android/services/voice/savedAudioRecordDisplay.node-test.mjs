import {
  SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS,
  listSavedAudioRecordDisplayMetadata,
} from "./savedAudioRecordDisplay.ts";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectIncludes(actual, expected, message) {
  if (!String(actual).includes(expected)) {
    throw new Error(`${message}: expected ${actual} to include ${expected}`);
  }
}

function findMetadataLine(displayRecord, label) {
  const line = displayRecord.metadataLines.find(
    (metadataLine) => metadataLine.label === label,
  );
  if (!line) {
    throw new Error(`missing saved-audio metadata line: ${label}`);
  }
  return line.value;
}

function createSavedAudioRecord(overrides) {
  return {
    recordSchemaVersion: 1,
    clipId: "clip-alpha",
    byteLength: 2048,
    savedAtMs: 1_700_000_000_000,
    retainedBecause: "Explicitly saved for later use: Note playback",
    retentionReason: "explicit-user-visible-later-use",
    capturedAudioSaveIntent: true,
    saveActionKind: "explicit-approved-audio-save",
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "voice-alice",
      matchedApprovedVoiceProfileId: "alice-profile",
      matchedApprovedVoiceLabel: "Alice voice",
      matchedApprovedVoiceProfileMetadata: {
        id: "voice-alice",
        identityId: "voice-alice",
        profileId: "alice-profile",
        displayName: "Alice",
        label: "Alice voice",
        approvalState: "approved",
        approved: true,
        enrolled: true,
      },
      confidence: 0.93,
      recognizedAtMs: 1_700_000_000_000,
      recognitionLatencyMs: 420,
    },
    approvedUserIdentity: {
      approvedVoiceId: "voice-alice",
      approvedUserId: "user-alice",
      displayName: "Alice",
    },
    ownerIdentity: {
      approvedVoiceId: "voice-alice",
      approvedUserId: "user-alice",
      displayName: "Alice",
    },
    userVisiblePurpose: "Note playback",
    userVisibleMetadata: {
      kind: "user-visible-later-use",
      userVisiblePurpose: "Note playback",
      laterUsePurpose: "Note playback",
      requestedAtMs: 1_700_000_000_000,
    },
    purposeMetadata: {
      kind: "user-visible-later-use",
      userVisiblePurpose: "Note playback",
      requestedAtMs: 1_700_000_000_000,
    },
    retentionPurposeMetadata: {
      kind: "user-visible-later-use",
      userVisiblePurpose: "Note playback",
      requestedAtMs: 1_700_000_000_000,
    },
    retentionTimestampMs: 1_700_000_000_000,
    retentionRequestedAtMs: 1_700_000_000_000,
    retentionDurationSeconds: 3600,
    retentionExpiresAtMs: 1_700_003_600_000,
    storageLocation: "on-device",
    retentionPolicy: "discard-unless-explicitly-saved",
    ...overrides,
  };
}

const displayRecords = listSavedAudioRecordDisplayMetadata(
  [
    createSavedAudioRecord({ clipId: "clip-alpha" }),
    createSavedAudioRecord({
      clipId: "clip-beta",
      byteLength: 512,
      savedAtMs: 1_700_000_060_000,
      approvedVoiceMatch: {
        accepted: true,
        matchedVoiceId: "voice-min",
        confidence: 0.88,
        recognizedAtMs: 1_700_000_060_000,
        recognitionLatencyMs: 510,
      },
      approvedUserIdentity: {
        approvedVoiceId: "voice-min",
        approvedUserId: "user-min",
      },
      ownerIdentity: {
        approvedVoiceId: "voice-min",
        approvedUserId: "user-min",
      },
      userVisiblePurpose: "Voice memo follow-up",
      userVisibleMetadata: {
        kind: "user-visible-later-use",
        userVisiblePurpose: "Voice memo follow-up",
        laterUsePurpose: "Voice memo follow-up",
        requestedAtMs: 1_700_000_060_000,
      },
      purposeMetadata: {
        kind: "user-visible-later-use",
        userVisiblePurpose: "Voice memo follow-up",
        requestedAtMs: 1_700_000_060_000,
      },
      retentionPurposeMetadata: {
        kind: "user-visible-later-use",
        userVisiblePurpose: "Voice memo follow-up",
        requestedAtMs: 1_700_000_060_000,
      },
      retentionTimestampMs: 1_700_000_060_000,
      retentionRequestedAtMs: 1_700_000_060_000,
      retentionExpiresAtMs: 1_700_003_660_000,
    }),
  ],
  { locale: "en-US", timeZone: "UTC" },
);

expectEqual(
  displayRecords.length,
  2,
  "saved-audio display metadata includes every retained recording",
);

for (const label of Object.values(
  SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS,
)) {
  findMetadataLine(displayRecords[0], label);
  findMetadataLine(displayRecords[1], label);
}

expectEqual(
  displayRecords[0].title,
  "Note playback",
  "saved-audio display titles the first recording with its later-use purpose",
);
expectEqual(
  displayRecords[1].title,
  "Voice memo follow-up",
  "saved-audio display titles the second recording with its later-use purpose",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.laterUsePurpose,
  ),
  "Note playback",
  "saved-audio metadata shows the first recording's stated later-use purpose",
);
expectEqual(
  findMetadataLine(
    displayRecords[1],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.laterUsePurpose,
  ),
  "Voice memo follow-up",
  "saved-audio metadata shows the second recording's stated later-use purpose",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.recordingId,
  ),
  "clip-alpha",
  "saved-audio metadata identifies the first recording by clip id",
);
expectEqual(
  findMetadataLine(
    displayRecords[1],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.recordingId,
  ),
  "clip-beta",
  "saved-audio metadata identifies the second recording by clip id",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.owner,
  ),
  "Alice",
  "saved-audio metadata shows the owner display name",
);
expectEqual(
  findMetadataLine(
    displayRecords[1],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.owner,
  ),
  "user-min",
  "saved-audio metadata falls back to approved user id",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.approvedVoice,
  ),
  "Alice voice (alice-profile) (93%)",
  "saved-audio metadata shows the approved voice profile match and confidence",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.storage,
  ),
  "on-device, local only",
  "saved-audio metadata exposes local-only storage",
);
expectEqual(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.byteLength,
  ),
  "2 KB",
  "saved-audio metadata exposes clip size",
);
expectIncludes(
  findMetadataLine(
    displayRecords[0],
    SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.savedAt,
  ),
  "2023",
  "saved-audio metadata exposes the saved timestamp",
);
expectIncludes(
  displayRecords[0].accessibilityLabel,
  "clip-alpha",
  "saved-audio accessibility label distinguishes the first recording",
);
expectIncludes(
  displayRecords[0].accessibilityLabel,
  "later-use purpose Note playback",
  "saved-audio accessibility label includes the first recording's later-use purpose",
);
expectIncludes(
  displayRecords[1].accessibilityLabel,
  "clip-beta",
  "saved-audio accessibility label distinguishes the second recording",
);
expectIncludes(
  displayRecords[1].accessibilityLabel,
  "later-use purpose Voice memo follow-up",
  "saved-audio accessibility label includes the second recording's later-use purpose",
);
