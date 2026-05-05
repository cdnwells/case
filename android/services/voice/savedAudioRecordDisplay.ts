import type { SavedApprovedAudioRecordView } from "../../constants/audioBuffer";

export const SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS = Object.freeze({
  laterUsePurpose: "Later-use purpose",
  savedAt: "Saved",
  owner: "Owner",
  approvedVoice: "Approved voice",
  recordingId: "Recording ID",
  expiresAt: "Expires",
  storage: "Stored",
  byteLength: "Size",
} as const);

export interface SavedAudioRecordDisplayOptions {
  locale?: string;
  timeZone?: string;
}

export interface SavedAudioRecordMetadataLine {
  label: string;
  value: string;
}

export interface SavedAudioRecordDisplayItem {
  record: SavedApprovedAudioRecordView;
  title: string;
  subtitle: string;
  metadataLines: readonly SavedAudioRecordMetadataLine[];
  accessibilityLabel: string;
}

export function listSavedAudioRecordDisplayMetadata(
  records: readonly SavedApprovedAudioRecordView[],
  options: SavedAudioRecordDisplayOptions = {},
): SavedAudioRecordDisplayItem[] {
  return records.map((record) =>
    createSavedAudioRecordDisplayMetadata(record, options),
  );
}

export function createSavedAudioRecordDisplayMetadata(
  record: SavedApprovedAudioRecordView,
  options: SavedAudioRecordDisplayOptions = {},
): SavedAudioRecordDisplayItem {
  const owner = formatSavedAudioRecordOwner(record);
  const savedAt = formatSavedAudioRecordTimestamp(record.savedAtMs, options);
  const approvedVoice = formatApprovedVoiceMatch(record);
  const expiresAt = formatSavedAudioRecordTimestamp(
    record.retentionExpiresAtMs,
    options,
  );
  const size = formatSavedAudioRecordByteLength(record.byteLength);
  const storage = `${record.storageLocation}, local only`;
  const laterUsePurpose = getSavedAudioRecordLaterUsePurpose(record);
  const title = laterUsePurpose;
  const subtitle = `${owner} - ${savedAt}`;

  const metadataLines = Object.freeze([
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.laterUsePurpose,
      value: laterUsePurpose,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.savedAt,
      value: savedAt,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.owner,
      value: owner,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.approvedVoice,
      value: approvedVoice,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.recordingId,
      value: record.clipId,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.expiresAt,
      value: expiresAt,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.storage,
      value: storage,
    },
    {
      label: SAVED_AUDIO_RECORD_IDENTIFYING_METADATA_LABELS.byteLength,
      value: size,
    },
  ] satisfies SavedAudioRecordMetadataLine[]);

  return Object.freeze({
    record,
    title,
    subtitle,
    metadataLines,
    accessibilityLabel:
      `Saved recording ${record.clipId}, later-use purpose ${laterUsePurpose}, ` +
      `saved ${savedAt}, owner ${owner}, approved voice ${approvedVoice}, ` +
      `expires ${expiresAt}, ${storage}, ${size}`,
  } satisfies SavedAudioRecordDisplayItem);
}

export function getSavedAudioRecordLaterUsePurpose(
  record: Pick<SavedApprovedAudioRecordView, "userVisibleMetadata">,
): string {
  return record.userVisibleMetadata.laterUsePurpose;
}

export function formatSavedAudioRecordOwner(
  record: Pick<SavedApprovedAudioRecordView, "ownerIdentity">,
): string {
  return (
    record.ownerIdentity.displayName ||
    record.ownerIdentity.approvedUserId ||
    record.ownerIdentity.approvedVoiceId
  );
}

export function formatApprovedVoiceMatch(
  record: Pick<SavedApprovedAudioRecordView, "approvedVoiceMatch">,
): string {
  const confidencePercent = Math.round(
    record.approvedVoiceMatch.confidence * 100,
  );
  const matchedApprovedVoiceLabel =
    record.approvedVoiceMatch.matchedApprovedVoiceLabel ||
    record.approvedVoiceMatch.matchedApprovedVoiceProfileMetadata?.label ||
    record.approvedVoiceMatch.matchedApprovedVoiceProfileId ||
    record.approvedVoiceMatch.matchedVoiceId;
  const matchedApprovedVoiceProfileId =
    record.approvedVoiceMatch.matchedApprovedVoiceProfileId ||
    record.approvedVoiceMatch.matchedApprovedVoiceProfileMetadata?.profileId;
  const matchedApprovedVoiceProfile =
    matchedApprovedVoiceProfileId &&
    matchedApprovedVoiceProfileId !== matchedApprovedVoiceLabel
      ? `${matchedApprovedVoiceLabel} (${matchedApprovedVoiceProfileId})`
      : matchedApprovedVoiceLabel;

  return `${matchedApprovedVoiceProfile} (${confidencePercent}%)`;
}

export function formatSavedAudioRecordByteLength(byteLength: number): string {
  if (!Number.isFinite(byteLength) || byteLength < 0) {
    return "Unknown size";
  }

  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  const kibibytes = byteLength / 1024;
  if (kibibytes < 1024) {
    return `${formatSingleDecimal(kibibytes)} KB`;
  }

  return `${formatSingleDecimal(kibibytes / 1024)} MB`;
}

export function formatSavedAudioRecordTimestamp(
  timestampMs: number,
  { locale, timeZone }: SavedAudioRecordDisplayOptions = {},
): string {
  if (!Number.isFinite(timestampMs)) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(timestampMs));
}

function formatSingleDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
