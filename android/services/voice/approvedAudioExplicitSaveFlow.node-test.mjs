import {
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EVENT_CONTRACT_ERROR,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL,
  DEFAULT_APPROVED_AUDIO_LATER_USE_RETENTION_DURATION_SECONDS,
  createUserVisibleApprovedAudioSaveRequest,
  saveApprovedAudioForUserVisibleLaterUse,
} from "./approvedAudioExplicitSaveFlow.ts";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createLocalApprovedAudioClipStore,
  createOnDeviceCircularAudioBuffer,
  saveApprovedAudioClipFromExplicitSaveAction,
} from "../../constants/audioBuffer.ts";

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

const approvedUserIdentity = {
  approvedVoiceId: "voice-owner",
  approvedUserId: "case-owner",
  displayName: "Case Owner",
};
const requestedAtMs = 1_700_000_000_000;
const request = createUserVisibleApprovedAudioSaveRequest({
  approvedUserIdentity,
  userVisiblePurpose: "  Follow up on the meeting note  ",
  requestedAtMs,
});

expectEqual(
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL,
  "Later-use purpose",
  "explicit save flow presents a later-use purpose field before persistence",
);
expectEqual(
  request.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "explicit save flow creates the required captured-audio save intent",
);
expectEqual(
  request.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "explicit save flow creates the required user save action kind",
);
expectEqual(
  request.userVisiblePurpose,
  "Follow up on the meeting note",
  "explicit save flow normalizes the user-visible later-use purpose",
);
expectEqual(
  request.purposeMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "explicit save flow records later-use purpose metadata kind",
);
expectEqual(
  request.purposeMetadata.userVisiblePurpose,
  request.userVisiblePurpose,
  "explicit save flow binds purpose metadata to the visible purpose",
);
expectEqual(
  request.purposeMetadata.requestedAtMs,
  requestedAtMs,
  "explicit save flow timestamps the purpose before persistence",
);
expectEqual(
  request.retentionMetadata.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "explicit save flow keeps retained captured audio on-device",
);
expectEqual(
  request.retentionMetadata.retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "explicit save flow keeps discard-unless-saved retention policy",
);
expectEqual(
  request.retentionMetadata.expiresAtMs,
  requestedAtMs +
    DEFAULT_APPROVED_AUDIO_LATER_USE_RETENTION_DURATION_SECONDS * 1000,
  "explicit save flow derives a bounded local retention window",
);

let persistedRequest = null;
const fakeSavedClip = Object.freeze({ clipId: "saved-flow-clip" });
const fakeApprovedVoiceEvent = {
  matchedVoiceId: "voice-owner",
  approvedUserIdentity,
  saveCapturedAudio(saveRequest) {
    persistedRequest = saveRequest;
    return fakeSavedClip;
  },
};
const savedClip = saveApprovedAudioForUserVisibleLaterUse(
  fakeApprovedVoiceEvent,
  {
    userVisiblePurpose: "Voice memo playback",
    requestedAtMs,
  },
);

expectEqual(
  savedClip,
  fakeSavedClip,
  "explicit save flow returns the saved local clip",
);
expectEqual(
  persistedRequest.userVisiblePurpose,
  "Voice memo playback",
  "explicit save flow passes the later-use purpose into persistence",
);
expectEqual(
  persistedRequest.purposeMetadata.userVisiblePurpose,
  "Voice memo playback",
  "explicit save flow presents purpose metadata before captured audio is persisted",
);

const localClipStore = createLocalApprovedAudioClipStore();
const rollingAudioBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
rollingAudioBuffer.append(Uint8Array.from([41, 42, 43]));
const retainedClip = saveApprovedAudioForUserVisibleLaterUse(
  {
    matchedVoiceId: "voice-owner",
    approvedUserIdentity,
    saveCapturedAudio(saveRequest, saveOptions = {}) {
      const saveAction = createApprovedAudioSaveAction({
        ...saveRequest,
        approvedVoiceMatch: {
          accepted: true,
          matchedVoiceId: "voice-owner",
          confidence: 0.97,
          recognizedAtMs: requestedAtMs - 200,
          recognitionLatencyMs: 200,
          reason: "approved_voice_match",
        },
      });

      return saveApprovedAudioClipFromExplicitSaveAction(
        saveOptions.clipStore ?? localClipStore,
        {
          saveAction,
          saveAuthorization: createApprovedAudioSaveAuthorization(saveAction),
          rollingAudioBuffer,
          clipId: "visible-purpose-flow-save",
          savedAtMs: requestedAtMs + 10,
        },
      );
    },
  },
  {
    userVisiblePurpose: "Playback in tomorrow's note",
    requestedAtMs,
    saveOptions: {
      clipStore: localClipStore,
    },
  },
);

expectEqual(
  retainedClip.userVisiblePurpose,
  "Playback in tomorrow's note",
  "explicit save flow persists the clip with the visible later-use purpose",
);
expectEqual(
  localClipStore.list().length,
  1,
  "explicit save flow writes exactly one local retained clip",
);
expectEqual(
  rollingAudioBuffer.read().byteLength,
  0,
  "explicit save flow clears the rolling buffer after local persistence",
);

let rejectedPersistenceCalled = false;
try {
  saveApprovedAudioForUserVisibleLaterUse(
    {
      ...fakeApprovedVoiceEvent,
      saveCapturedAudio() {
        rejectedPersistenceCalled = true;
        return fakeSavedClip;
      },
    },
    {
      userVisiblePurpose: " ",
      requestedAtMs,
    },
  );
  throw new Error("empty later-use purpose guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR,
    "explicit save flow rejects persistence without a later-use purpose",
  );
}

expectEqual(
  rejectedPersistenceCalled,
  false,
  "explicit save flow does not persist captured audio before purpose validation",
);

let mismatchedEventPersistenceCalled = false;
try {
  saveApprovedAudioForUserVisibleLaterUse(
    {
      ...fakeApprovedVoiceEvent,
      approvedUserIdentity: {
        ...approvedUserIdentity,
        approvedVoiceId: "different-approved-voice",
      },
      saveCapturedAudio() {
        mismatchedEventPersistenceCalled = true;
        return fakeSavedClip;
      },
    },
    {
      userVisiblePurpose: "Voice memo playback",
      requestedAtMs,
    },
  );
  throw new Error("mismatched approved event guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EVENT_CONTRACT_ERROR,
    "explicit save flow rejects persistence when the approved event identity is not the recognized voice",
  );
}

expectEqual(
  mismatchedEventPersistenceCalled,
  false,
  "explicit save flow does not persist captured audio for mismatched approved event identity",
);
