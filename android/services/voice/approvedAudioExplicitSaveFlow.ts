import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  type ApprovedAudioClipStore,
  type ApprovedAudioSaveRequestInput,
  type ApprovedAudioSaveUserIdentity,
  type SavedApprovedAudioClip,
} from "../../constants/audioBuffer.ts";

export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL =
  "Later-use purpose";
export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_SAVE_BUTTON_LABEL =
  "Save audio";
export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_DISMISS_BUTTON_LABEL =
  "Discard";
export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR =
  "Enter a later-use purpose before saving captured audio.";
export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EVENT_CONTRACT_ERROR =
  "Approved audio can only be saved from an approved voice event with matching identity metadata.";
export const APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_STORAGE_NOTICE =
  "Saved audio remains on this device.";
export const DEFAULT_APPROVED_AUDIO_LATER_USE_RETENTION_DURATION_SECONDS =
  3600;

export type UserVisibleApprovedAudioSaveRequestInput = Omit<
  ApprovedAudioSaveRequestInput,
  "approvedVoiceMatch"
>;

export interface ApprovedAudioExplicitSaveCapableEvent {
  matchedVoiceId: string;
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  saveCapturedAudio: (
    request: UserVisibleApprovedAudioSaveRequestInput,
    options?: ApprovedAudioExplicitSaveOptions,
  ) => SavedApprovedAudioClip;
}

export interface ApprovedAudioExplicitSaveOptions {
  clipId?: string;
  savedAtMs?: number;
  clipStore?: ApprovedAudioClipStore;
}

export interface CreateUserVisibleApprovedAudioSaveRequestOptions {
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  userVisiblePurpose: string;
  requestedAtMs?: number;
  retentionDurationSeconds?: number;
}

export interface SaveApprovedAudioForUserVisibleLaterUseOptions
  extends Omit<
    CreateUserVisibleApprovedAudioSaveRequestOptions,
    "approvedUserIdentity"
  > {
  saveOptions?: ApprovedAudioExplicitSaveOptions;
}

export function normalizeUserVisibleApprovedAudioLaterUsePurpose(
  userVisiblePurpose: string,
): string {
  const normalizedPurpose = userVisiblePurpose.trim();
  if (!normalizedPurpose) {
    throw new Error(APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR);
  }

  return normalizedPurpose;
}

export function createUserVisibleApprovedAudioSaveRequest({
  approvedUserIdentity,
  userVisiblePurpose,
  requestedAtMs = Date.now(),
  retentionDurationSeconds =
    DEFAULT_APPROVED_AUDIO_LATER_USE_RETENTION_DURATION_SECONDS,
}: CreateUserVisibleApprovedAudioSaveRequestOptions): UserVisibleApprovedAudioSaveRequestInput {
  const normalizedPurpose =
    normalizeUserVisibleApprovedAudioLaterUsePurpose(userVisiblePurpose);
  const expiresAtMs = requestedAtMs + retentionDurationSeconds * 1000;

  return Object.freeze({
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedUserIdentity,
    userVisiblePurpose: normalizedPurpose,
    purposeMetadata: {
      kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
      userVisiblePurpose: normalizedPurpose,
      requestedAtMs,
    },
    retentionMetadata: {
      requestedAtMs,
      retentionDurationSeconds,
      expiresAtMs,
      storageLocation: BUFFER_LOCATION_ON_DEVICE,
      retentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    },
  }) as UserVisibleApprovedAudioSaveRequestInput;
}

export function saveApprovedAudioForUserVisibleLaterUse(
  approvedVoiceEvent: ApprovedAudioExplicitSaveCapableEvent,
  {
    userVisiblePurpose,
    requestedAtMs,
    retentionDurationSeconds,
    saveOptions,
  }: SaveApprovedAudioForUserVisibleLaterUseOptions,
): SavedApprovedAudioClip {
  assertApprovedAudioExplicitSaveCapableEvent(approvedVoiceEvent);
  const request = createUserVisibleApprovedAudioSaveRequest({
    approvedUserIdentity: approvedVoiceEvent.approvedUserIdentity,
    userVisiblePurpose,
    requestedAtMs,
    retentionDurationSeconds,
  });

  return approvedVoiceEvent.saveCapturedAudio(request, saveOptions);
}

function assertApprovedAudioExplicitSaveCapableEvent(
  event: ApprovedAudioExplicitSaveCapableEvent,
): void {
  if (
    !event ||
    typeof event.matchedVoiceId !== "string" ||
    event.matchedVoiceId.trim().length === 0 ||
    typeof event.approvedUserIdentity !== "object" ||
    event.approvedUserIdentity === null ||
    event.approvedUserIdentity.approvedVoiceId !== event.matchedVoiceId ||
    typeof event.saveCapturedAudio !== "function"
  ) {
    throw new Error(APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EVENT_CONTRACT_ERROR);
  }
}
