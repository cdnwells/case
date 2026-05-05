export const ROLLING_BUFFER_DEFAULT_DURATION_SECONDS = 15;
export const ROLLING_BUFFER_DEFAULT_CONFIG_NAME =
  "ROLLING_BUFFER_DEFAULT_DURATION_SECONDS";
export const ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME =
  "ROLLING_BUFFER_DURATION_SECONDS";
export const ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY =
  "rollingBufferActiveDurationSeconds";
export const ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD =
  "rolling_buffer_default_duration_seconds";
export const ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD =
  "rolling_buffer_active_duration_seconds";
export const ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD =
  "rolling_buffer_duration_seconds";
export const ROLLING_BUFFER_CUSTOMIZATION_SOURCE =
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME;
export const ROLLING_BUFFER_DURATION_UNIT_SECONDS = "seconds";
export const ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS = 1;
export const ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS = 60;
export const ROLLING_BUFFER_MIN_DURATION_SECONDS =
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS;
export const ROLLING_BUFFER_MAX_DURATION_SECONDS =
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS;
export const ROLLING_BUFFER_DURATION_UNIT =
  ROLLING_BUFFER_DURATION_UNIT_SECONDS;
export const DEFAULT_ROLLING_BUFFER_DURATION_SECONDS =
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
// App-level manual customization point; keep DEFAULT_* pinned to the baseline.
export const ROLLING_BUFFER_DURATION_SECONDS: number =
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
export const ROLLING_BUFFER_DURATION_CONFIG_SOURCE = Object.freeze({
  name: ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  binding: ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  defaultValueSeconds: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  valueSeconds: ROLLING_BUFFER_DURATION_SECONDS,
  defaultValueSource: ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
  mapsOnlyTo: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  targetSchemaField: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  unit: ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  customizationAllowed: true,
} as const);
export const ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION = Object.freeze({
  key: ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
  source: ROLLING_BUFFER_DURATION_CONFIG_SOURCE,
  unit: ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  defaultValueSeconds: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  sourceDefaultValueSeconds: ROLLING_BUFFER_DURATION_SECONDS,
  mapsOnlyTo: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  minValueSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  maxValueSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  customizationSource: ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
  customizationAllowed: true,
} as const);
export const ROLLING_BUFFER_DURATION_CONFIG_OPTION =
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION;
export const ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA_VERSION = 1;
export const ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA = Object.freeze({
  schemaVersion: ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA_VERSION,
  durationUnit: ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  fields: Object.freeze({
    [ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD]: Object.freeze({
      name: ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
      configBinding: ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
      defaultValueSeconds: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
      fixedValueSeconds: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
      immutable: true,
      customizationAllowed: false,
    } as const),
    [ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD]: Object.freeze({
      name: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
      configKey: ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
      defaultValueSeconds: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
      resolvesDefaultFrom: ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
      customizationSource: ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
      customizationBinding: ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
      customizationDefaultValueSeconds: ROLLING_BUFFER_DURATION_SECONDS,
      mapsOnlyTo: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
      customizationAllowed: true,
      minValueSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
      maxValueSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
    } as const),
    [ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD]: Object.freeze({
      name: ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD,
      deprecated: true,
      aliasFor: ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
      customizationAllowed: false,
    } as const),
  } as const),
} as const);
export const ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION = 1;
export const ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY =
  "case.voiceGate.rollingBufferUserSettings.v1";
export const CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS = 0.1;
export const CAPTURE_ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS =
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
export const RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT = false;
export const PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS =
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS;
export const ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS =
  CAPTURE_ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS;
export const RAW_AUDIO_PERSISTENCE_DEFAULT_ENABLED =
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT;
export const BUFFER_LOCATION_ON_DEVICE = "on-device";
export const AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY =
  "ephemeral-in-memory";
export const AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED =
  "discard-unless-explicitly-saved";
export const AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY =
  "local-memory-only";
export const BUFFERED_AUDIO_REDACTION_LABEL =
  "[buffered audio redacted: local memory only]";
export const BUFFERED_AUDIO_NETWORK_GUARD_ERROR =
  "buffered audio must never be uploaded or passed to network processing before approved voice gating";
export const BUFFERED_AUDIO_DIAGNOSTICS_GUARD_ERROR =
  "raw or encoded captured audio must never be written to application logs, debug traces, crash reports, telemetry, or analytics payloads";
export const BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR =
  "buffered audio downstream path requires approved voice verification";
export const BUFFERED_AUDIO_DIAGNOSTICS_CIRCULAR_REFERENCE_LABEL =
  "[circular diagnostic payload redacted]";
export const AUDIO_BUFFER_CONFIG_HOOK_GUARD_ERROR =
  "automatic audio buffer persistence or retention hooks are not supported";
export const ROLLING_BUFFER_DEFAULT_DURATION_IMMUTABLE_ERROR =
  "rollingBufferDefaultDurationSeconds is immutable; set rollingBufferActiveDurationSeconds to customize the active rolling buffer duration";
export const ROLLING_BUFFER_DEPRECATED_DURATION_OVERRIDE_ERROR =
  "rollingBufferDurationSeconds is deprecated; set rollingBufferActiveDurationSeconds to customize the active rolling buffer duration";
export const APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR =
  "approved audio save request requires an explicit captured-audio save intent, explicit save action, approved voice match, approved user identity, validated purpose metadata, explicit user-visible later-use purpose, and retention metadata";
export const CAPTURED_AUDIO_SAVE_INTENT_PRESENT = true;
export const APPROVED_AUDIO_SAVE_PURPOSE_KIND =
  "user-visible-later-use";
export const APPROVED_AUDIO_SAVE_ACTION_KIND =
  "explicit-approved-audio-save";
export const APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR =
  "approved audio clip persistence requires an explicit user save action";
export const APPROVED_AUDIO_SAVE_AUTHORIZATION_KIND =
  "approved-audio-save-authorization";
export const APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR =
  "raw captured audio persistence requires explicit local save authorization";
export const CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR =
  "captured audio capture and processing paths must keep raw audio in memory unless writing through the explicit approved-audio save path";
export const APPROVED_AUDIO_CLIP_STORE_CONTRACT_ERROR =
  "approved audio clip store keeps clips local and requires explicit save metadata";
export const APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR =
  "durable approved audio storage requires a validated explicit save request and user-visible later-use purpose before writing captured audio";
export const SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION = 1;
export const SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA = Object.freeze({
  schemaVersion: SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  ownerIdentityField: "ownerIdentity",
  userVisibleMetadataField: "userVisibleMetadata",
  retentionTimestampMsField: "retentionTimestampMs",
  retentionPurposeMetadataField: "retentionPurposeMetadata",
} as const);
export const SAVED_APPROVED_AUDIO_METADATA_CONTRACT = Object.freeze({
  schemaVersion: SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  purposeKind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  requiredPurposeMetadataFields: Object.freeze([
    "kind",
    "userVisiblePurpose",
    "requestedAtMs",
  ] as const),
  requiredUserVisibleMetadataFields: Object.freeze([
    "kind",
    "userVisiblePurpose",
    "laterUsePurpose",
    "requestedAtMs",
  ] as const),
  requiredRetentionPurposeMetadataFields: Object.freeze([
    "kind",
    "userVisiblePurpose",
    "requestedAtMs",
  ] as const),
  requiredLaterUsePurposeFields: Object.freeze([
    "userVisiblePurpose",
    "purposeMetadata.userVisiblePurpose",
    "userVisibleMetadata.laterUsePurpose",
    "retentionPurposeMetadata.userVisiblePurpose",
  ] as const),
} as const);
export const SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE =
  "explicit-user-visible-later-use";
export const SAVED_APPROVED_AUDIO_USER_EXPORT_PATH =
  "user-approved-audio-record-export";
export const SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH =
  "admin-approved-audio-record-export";
export const SAVED_APPROVED_AUDIO_EXPORT_PATHS = Object.freeze([
  SAVED_APPROVED_AUDIO_USER_EXPORT_PATH,
  SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH,
] as const);
export const APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_SECONDS = 1;
export const APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_MS =
  APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_SECONDS * 1000;
export const PROHIBITED_PRE_APPROVAL_AUDIO_PERSISTENCE_WRITE_TARGETS =
  Object.freeze(["filesystem", "database", "cache"] as const);
export const PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS =
  Object.freeze(["transcription", "analytics", "sync", "upload"] as const);
export const CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES = Object.freeze([
  "background-worker",
  "queue",
  "offline-storage",
  "session-persistence",
] as const);
export const CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR =
  "background workers, queues, offline storage, and session persistence must not retain captured audio outside the explicit approved-audio save path";
export const PROHIBITED_BUFFERED_AUDIO_SINKS = Object.freeze([
  ...PROHIBITED_PRE_APPROVAL_AUDIO_PERSISTENCE_WRITE_TARGETS,
  "disk",
  "logs",
  "debug-traces",
  "crash-reports",
  "telemetry",
  "persistent-storage",
  "network-request",
  "network-processing",
  ...CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES,
  ...PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS,
] as const);
export const PROHIBITED_AUDIO_BUFFER_CONFIG_HOOKS = Object.freeze([
  "audioRetentionDurationSeconds",
  "backgroundQueue",
  "backgroundWorker",
  "backgroundWorkerQueue",
  "offlineStorage",
  "offlineStorageAdapter",
  "offlineStorageKey",
  "queue",
  "queueAdapter",
  "queueSink",
  "retentionAdapter",
  "retentionSink",
  "sessionPersistence",
  "sessionPersistenceAdapter",
  "sessionSnapshot",
  "sessionStorage",
  "sessionStorageKey",
  "persistenceAdapter",
  "persistenceSink",
  "onRetainAudio",
  "onPersistAudio",
] as const);
export const REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS = Object.freeze([
  "processing",
  "storage",
  "logging",
  "retention",
  ...PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS,
] as const);
export const REJECTED_SPEECH_BLOCK_POLICY =
  "rejected-speech-blocked-before-downstream-transcription-analytics-sync-upload";
export const DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT = false;
export const TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON =
  "transcription_complete_no_save_intent";
export const TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR =
  "transcription audio cleanup requires an explicit approved save workflow before retaining captured audio";
export const PROCESSING_WINDOW_EXPIRED_RELEASE_REASON =
  "processing_window_expired";
export const UNSAVED_RAW_AUDIO_PROCESSING_WINDOW_DISCARD_POLICY =
  "discard-unsaved-raw-audio-when-processing-window-expires";
export const UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY =
  "purge-unsaved-captured-audio-cache-and-temp-files-outside-explicit-save-path";
export const UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_CONTRACT_ERROR =
  "unsaved captured audio cache and temporary file cleanup targets must be purge-only resources outside the explicit save path";
export const APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND =
  "approved-speech-rolling-buffer-audio-segment";
export const APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE =
  "on-device-rolling-buffer";

const MILLISECONDS_PER_SECOND = 1000;

const NODE_INSPECT_CUSTOM = Symbol.for("nodejs.util.inspect.custom");
const NON_PERSISTABLE_BUFFERED_AUDIO = Symbol.for(
  "case.bufferedAudio.nonPersistable",
);
const APPROVED_AUDIO_SAVE_AUTHORIZATION_BRAND = Symbol(
  "case.approvedAudioSaveAuthorization",
);
const AUDIO_PAYLOAD_KEY_PATTERN =
  /^(audioBytes|capturedAudioBytes|rawAudioBytes|encodedAudioBytes|bufferedAudio|rollingAudioBuffer|audioBuffer|capturedAudio|rawAudio|encodedAudio|audioBase64|base64Audio|encodedAudioBase64|capturedAudioBase64|rawAudioBase64|recordedAudio|recordedAudioBase64|voiceAudio|voiceAudioBase64|microphoneAudio|microphoneAudioBase64|pcmAudio|pcmAudioBase64|wavAudio|wavAudioBase64|m4aAudio|m4aAudioBase64|audioData|audioPayload|audioBlob|temporaryCapturedAudioFile|temporaryCapturedAudioFiles|unsavedCapturedAudioCache|unsavedCapturedAudioCaches|capturedAudioCache|capturedAudioCaches)$/i;

export interface ActiveAudioFormat {
  sampleRateHz: number;
  channelCount: number;
  bytesPerSample: number;
}

export interface RollingAudioBufferConfig {
  rolling_buffer_default_duration_seconds: typeof ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
  rolling_buffer_active_duration_seconds: number;
  /**
   * @deprecated Alias for rolling_buffer_active_duration_seconds. Do not use
   * this field as the authoritative default duration or an override source.
   */
  rolling_buffer_duration_seconds: number;
  rollingBufferDefaultDurationSeconds: typeof ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
  rollingBufferActiveDurationSeconds: number;
  /**
   * @deprecated Alias for rollingBufferActiveDurationSeconds. Do not use this
   * field as the authoritative default duration.
   */
  rollingBufferDurationSeconds: number;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  bufferStorageKind: typeof AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export type RollingAudioBufferConfigOverrides = Partial<
  Pick<RollingAudioBufferConfig, "rollingBufferActiveDurationSeconds">
> & {
  ROLLING_BUFFER_DURATION_SECONDS?: number | null;
};

export interface RollingBufferUserSettings {
  schemaVersion: typeof ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION;
  rollingBufferActiveDurationSeconds: number;
  rollingBufferCustomizationSource: typeof ROLLING_BUFFER_CUSTOMIZATION_SOURCE;
  rollingBufferDefaultConfigName: typeof ROLLING_BUFFER_DEFAULT_CONFIG_NAME;
  updatedAtMs: number;
}

export type RollingBufferUserSettingsInput =
  Partial<
    Pick<
      RollingBufferUserSettings,
      | "schemaVersion"
      | "rollingBufferActiveDurationSeconds"
      | "rollingBufferCustomizationSource"
      | "rollingBufferDefaultConfigName"
      | "updatedAtMs"
    >
  > & {
    /**
     * Ignored when present in persisted settings. The default is immutable and
     * always resolved from ROLLING_BUFFER_DEFAULT_DURATION_SECONDS.
     */
    rollingBufferDefaultDurationSeconds?: unknown;
  };

export interface RollingBufferUserSettingsPersistenceReadAdapter {
  getItem: (
    storageKey: string,
  ) =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
}

export interface RollingBufferUserSettingsPersistenceAdapter
  extends RollingBufferUserSettingsPersistenceReadAdapter {
  setItem: (
    storageKey: string,
    serializedSettings: string,
  ) => void | Promise<void>;
}

export interface CaptureBufferingDefaults {
  processingWindowDurationSeconds: typeof CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS;
  rollingBufferWindowDurationSeconds: typeof ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS;
  rawAudioPersistenceEnabled: typeof RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  bufferStorageKind: typeof AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface CircularAudioBufferCapacity {
  capacityFrames: number;
  capacityBytes: number;
  frameSizeBytes: number;
  bytesPerSecond: number;
}

export interface CircularAudioBufferConfig extends RollingAudioBufferConfig {
  activeAudioFormat: ActiveAudioFormat;
  circularBufferCapacity: CircularAudioBufferCapacity;
}

export type CircularAudioBufferInput =
  | ArrayBuffer
  | ArrayBufferView
  | ReadonlyArray<number>;

export type ProhibitedBufferedAudioSink =
  (typeof PROHIBITED_BUFFERED_AUDIO_SINKS)[number];
export type ProhibitedAudioBufferConfigHook =
  (typeof PROHIBITED_AUDIO_BUFFER_CONFIG_HOOKS)[number];
export type PreApprovalBufferedAudioBlockedDownstreamPath =
  (typeof PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS)[number];
export type CapturedAudioNonSaveRetentionSurface =
  (typeof CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES)[number];

export type BufferedAudioSink =
  | "local-memory"
  | "local-processing"
  | ProhibitedBufferedAudioSink;
export type RejectedSpeechBlockedDownstreamSink =
  (typeof REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS)[number];

export type CapturedAudioFrame<
  TFrame extends object,
  TAudioBytes extends CircularAudioBufferInput = CircularAudioBufferInput,
> = TFrame & {
  audioBytes: TAudioBytes;
};

export type ApprovedSpeechAudioReleaseReason =
  | "voice_approval_complete"
  | "transcription_complete_no_save_intent"
  | "processing_window_expired"
  | "processing_complete"
  | "processing_error"
  | "processing_cancelled"
  | "processing_start_failed"
  | "processing_replaced"
  | "processing_unmounted";

export type ProcessingWindowExpiryTimerHandle = unknown;
export type SetProcessingWindowExpiryTimer = (
  callback: () => void,
  delayMs: number,
) => ProcessingWindowExpiryTimerHandle;
export type ClearProcessingWindowExpiryTimer = (
  handle: ProcessingWindowExpiryTimerHandle,
) => void;

export interface BufferedAudioPersistenceSafeguards {
  persistencePolicy: typeof AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY;
  bufferStorageKind: typeof AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  automaticPersistenceEnabled: false;
  automaticRetentionEnabled: false;
  prohibitedSinks: readonly ProhibitedBufferedAudioSink[];
  serializedAudioBytes: typeof BUFFERED_AUDIO_REDACTION_LABEL;
}

export interface BufferedAudioReadOptions {
  sink?: BufferedAudioSink;
}

export interface NetworkSafeJsonOptions {
  path?: string;
}

export type AudioDiagnosticsSink =
  | "logs"
  | "debug-traces"
  | "crash-reports"
  | "telemetry"
  | "analytics";

export interface AudioDiagnosticsPayloadOptions {
  path?: string;
  sink?: AudioDiagnosticsSink;
}

export interface CapturedAudioNonSaveRetentionPayloadOptions {
  path?: string;
  surface: CapturedAudioNonSaveRetentionSurface;
}

export interface UnsavedCapturedAudioTemporaryFilePurgeTarget {
  filePath: string;
  deleteFile: (filePath: string) => void;
}

export interface UnsavedCapturedAudioCachePurgeTarget {
  cacheKey: string;
  clear: (cacheKey: string) => void;
}

export interface UnsavedCapturedAudioExternalResources {
  temporaryCapturedAudioFiles?:
    | readonly UnsavedCapturedAudioTemporaryFilePurgeTarget[]
    | null;
  unsavedCapturedAudioCaches?:
    | readonly UnsavedCapturedAudioCachePurgeTarget[]
    | null;
}

export interface UnsavedCapturedAudioExternalResourcePurgeResult {
  purged: true;
  policy: typeof UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY;
  temporaryCapturedAudioFileCount: number;
  unsavedCapturedAudioCacheCount: number;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ApprovedSpeechAudioReleaseResources {
  rollingAudioBuffer?: Pick<OnDeviceCircularAudioBuffer, "clear"> | null;
  capturedFrames?: Array<Partial<CapturedAudioFrame<object>>>;
  rollingBufferAudioSegments?: Array<
    Partial<CapturedAudioFrame<ApprovedSpeechRollingBufferAudioSegment>>
  >;
  temporaryCapturedAudioFiles?:
    | UnsavedCapturedAudioTemporaryFilePurgeTarget[]
    | null;
  unsavedCapturedAudioCaches?: UnsavedCapturedAudioCachePurgeTarget[] | null;
  processingWindowDurationSeconds?: number;
  processingWindowStartedAtMs?: number;
  scheduleProcessingWindowExpiry?: boolean;
  nowMs?: () => number;
  setProcessingWindowExpiryTimer?: SetProcessingWindowExpiryTimer;
  clearProcessingWindowExpiryTimer?: ClearProcessingWindowExpiryTimer;
  onRelease?: (reason: ApprovedSpeechAudioReleaseReason) => void;
}

export interface TranscriptionAudioCompletionCleanupInput {
  releaseCapturedAudio?:
    | ((reason?: ApprovedSpeechAudioReleaseReason) => boolean)
    | null;
  saveIntentPresent?: typeof DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT;
}

export interface TranscriptionAudioCompletionCleanup {
  transcriptionCompleted: true;
  saveIntentPresent: typeof DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT;
  released: boolean;
  releaseReason: typeof TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ApprovedVoiceDownstreamAuthorizationMetadata {
  authorized: true;
  matchedVoiceId: string;
  score: number;
  threshold: number;
  decisionRule?: string;
  supportingFrameCount?: number;
  requiredFrameCount?: number;
}

export interface RejectedSpeechRecognitionMetadata {
  accepted?: boolean;
  matchedVoiceId?: string | null;
  rejectedVoiceId?: string | null;
  confidence?: number;
  latencyMs?: number | null;
  reason?: string;
  downstreamAuthorization?: ApprovedVoiceDownstreamAuthorizationMetadata | null;
}

export interface RejectedSpeechBlockResources {
  recognitionResult: RejectedSpeechRecognitionMetadata;
  rollingAudioBuffer?:
    | (Pick<OnDeviceCircularAudioBuffer, "clear"> &
        Partial<Pick<OnDeviceCircularAudioBuffer, "getState">>)
    | null;
  capturedFrames?: Array<Partial<CapturedAudioFrame<object>>>;
  temporaryCapturedAudioFiles?:
    | UnsavedCapturedAudioTemporaryFilePurgeTarget[]
    | null;
  unsavedCapturedAudioCaches?: UnsavedCapturedAudioCachePurgeTarget[] | null;
}

export interface BufferedAudioDownstreamVoiceVerificationInput {
  downstreamPath: PreApprovalBufferedAudioBlockedDownstreamPath;
  recognitionResult: Pick<
    RejectedSpeechRecognitionMetadata,
    "accepted" | "matchedVoiceId" | "downstreamAuthorization"
  >;
}

export interface ApprovedSpeechRollingBufferAudioSegment {
  kind: typeof APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND;
  source: typeof APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE;
  matchedVoiceId: string;
  recognizedAtMs: number;
  selectedAtMs: number;
  startedAtMs: number;
  endedAtMs: number;
  byteLength: number;
  chunkCount: number;
  audioBytes: Uint8Array;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ApprovedSpeechRollingBufferAudioSegmentSelectionInput {
  rollingAudioBuffer: Pick<OnDeviceCircularAudioBuffer, "read" | "readChunks">;
  recognitionResult: Pick<
    RejectedSpeechRecognitionMetadata,
    | "accepted"
    | "matchedVoiceId"
    | "downstreamAuthorization"
    | "latencyMs"
  > & {
    recognizedAtMs?: number | null;
  };
  downstreamPath?: PreApprovalBufferedAudioBlockedDownstreamPath;
  selectedAtMs?: number;
}

export interface RejectedSpeechBlockResult {
  accepted: false;
  discarded: true;
  policy: typeof REJECTED_SPEECH_BLOCK_POLICY;
  reason: string | null;
  matchedVoiceId: null;
  rejectedVoiceId: string | null;
  blockedDownstreamSinks: readonly RejectedSpeechBlockedDownstreamSink[];
  rollingBufferSizeBytesAfterDiscard: number | null;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ApprovedAudioSaveUserIdentity {
  approvedVoiceId: string;
  approvedUserId?: string;
  displayName?: string;
}

export type ApprovedAudioOwnerIdentity = ApprovedAudioSaveUserIdentity;

export interface ApprovedAudioSaveVoiceMatchProfileMetadata {
  id: string;
  identityId: string;
  profileId: string;
  displayName: string | null;
  label: string;
  approvalState: "approved" | string;
  approved: true;
  enrolled: true;
}

export interface ApprovedAudioSaveVoiceMatch {
  accepted: true;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId?: string;
  matchedApprovedVoiceLabel?: string;
  matchedApprovedVoiceProfileMetadata?: ApprovedAudioSaveVoiceMatchProfileMetadata;
  confidence: number;
  recognizedAtMs: number;
  recognitionLatencyMs: number;
  reason?: string;
}

export interface ApprovedAudioRetentionMetadata {
  requestedAtMs: number;
  retentionDurationSeconds: number;
  expiresAtMs: number;
  storageLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  retentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface ApprovedAudioSavePurposeMetadata {
  kind: typeof APPROVED_AUDIO_SAVE_PURPOSE_KIND;
  userVisiblePurpose: string;
  requestedAtMs: number;
}

export interface SavedApprovedAudioUserVisibleMetadata {
  kind: typeof APPROVED_AUDIO_SAVE_PURPOSE_KIND;
  userVisiblePurpose: string;
  laterUsePurpose: string;
  requestedAtMs: number;
}

export interface ApprovedAudioSaveRequest {
  capturedAudioSaveIntent: typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT;
  saveActionKind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  approvedVoiceMatch: ApprovedAudioSaveVoiceMatch;
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  userVisiblePurpose: string;
  purposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionMetadata: ApprovedAudioRetentionMetadata;
}

export interface ApprovedAudioSaveRequestInput {
  capturedAudioSaveIntent: typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT;
  saveActionKind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  approvedVoiceMatch: ApprovedAudioSaveVoiceMatch;
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  userVisiblePurpose: string;
  purposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionMetadata: ApprovedAudioRetentionMetadata;
}

export interface ApprovedAudioSaveAction {
  kind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  request: ApprovedAudioSaveRequest;
}

export interface ApprovedAudioSaveAuthorization {
  kind: typeof APPROVED_AUDIO_SAVE_AUTHORIZATION_KIND;
  authorized: true;
  capturedAudioSaveIntent: typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT;
  saveActionKind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  approvedVoiceId: string;
  matchedVoiceId: string;
  userVisiblePurpose: string;
  purposeKind: typeof APPROVED_AUDIO_SAVE_PURPOSE_KIND;
  purposeRequestedAtMs: number;
  storageLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  retentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
  requestedAtMs: number;
  expiresAtMs: number;
  authorizedAtMs: number;
}

export interface ApprovedAudioSaveAuthorizationOptions {
  authorizedAtMs?: number;
}

export interface ApprovedAudioClipSaveInput {
  saveAction: ApprovedAudioSaveAction;
  saveAuthorization: ApprovedAudioSaveAuthorization;
  rollingAudioBuffer: Pick<OnDeviceCircularAudioBuffer, "read" | "clear">;
  approvedSpeechAudioSegment?:
    | ApprovedSpeechRollingBufferAudioSegment
    | null;
  clipId?: string;
  savedAtMs?: number;
}

export interface SavedApprovedAudioClip {
  recordSchemaVersion: typeof SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION;
  clipId: string;
  audioBytes: Uint8Array;
  byteLength: number;
  savedAtMs: number;
  capturedAudioSaveIntent: typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT;
  saveActionKind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  approvedVoiceMatch: ApprovedAudioSaveVoiceMatch;
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  ownerIdentity: ApprovedAudioOwnerIdentity;
  userVisiblePurpose: string;
  userVisibleMetadata: SavedApprovedAudioUserVisibleMetadata;
  purposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionPurposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionMetadata: ApprovedAudioRetentionMetadata;
  retentionTimestampMs: number;
  storageLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  retentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export type SavedApprovedAudioRecordMetadata = Omit<
  SavedApprovedAudioClip,
  "audioBytes"
>;

export interface SavedApprovedAudioRecordView {
  recordSchemaVersion: typeof SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION;
  clipId: string;
  byteLength: number;
  savedAtMs: number;
  retainedBecause: string;
  retentionReason: typeof SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE;
  capturedAudioSaveIntent: typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT;
  saveActionKind: typeof APPROVED_AUDIO_SAVE_ACTION_KIND;
  approvedVoiceMatch: ApprovedAudioSaveVoiceMatch;
  approvedUserIdentity: ApprovedAudioSaveUserIdentity;
  ownerIdentity: ApprovedAudioOwnerIdentity;
  userVisiblePurpose: string;
  userVisibleMetadata: SavedApprovedAudioUserVisibleMetadata;
  purposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionPurposeMetadata: ApprovedAudioSavePurposeMetadata;
  retentionTimestampMs: number;
  retentionRequestedAtMs: number;
  retentionDurationSeconds: number;
  retentionExpiresAtMs: number;
  storageLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  retentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

type SavedApprovedAudioExportPath =
  (typeof SAVED_APPROVED_AUDIO_EXPORT_PATHS)[number];

interface SavedApprovedAudioExportBase {
  exportPath: SavedApprovedAudioExportPath;
  exportedAtMs: number;
  savedAudioRecordViews: readonly SavedApprovedAudioRecordView[];
  savedAudioRecordCount: number;
  rawAudioIncluded: false;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface SavedApprovedAudioUserExport
  extends SavedApprovedAudioExportBase {
  exportPath: typeof SAVED_APPROVED_AUDIO_USER_EXPORT_PATH;
  exportScope: "user";
  approvedUserId: string;
}

export interface SavedApprovedAudioAdminExport
  extends SavedApprovedAudioExportBase {
  exportPath: typeof SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH;
  exportScope: "admin";
  retainedOwnerUserIds: readonly string[];
}

export interface ApprovedAudioClipStore {
  save(input: ApprovedAudioClipSaveInput): SavedApprovedAudioClip;
  get(clipId: string): SavedApprovedAudioClip | null;
  list(): SavedApprovedAudioClip[];
  delete(clipId: string): boolean;
  clear(): void;
  pruneExpired(nowMs?: number): number;
  subscribe?(listener: ApprovedAudioClipStoreChangeListener): () => void;
}

export interface DurableApprovedAudioClipStorageAdapter {
  write(clip: SavedApprovedAudioClip): void;
  delete?(clipId: string): void;
  clear?(): void;
}

export type ApprovedAudioClipStoreChangeListener = () => void;

export interface ApprovedSpeechAudioRelease {
  release: (reason?: ApprovedSpeechAudioReleaseReason) => boolean;
  expireProcessingWindow: (nowMs?: number) => boolean;
  isReleased: () => boolean;
  getReleaseReason: () => ApprovedSpeechAudioReleaseReason | null;
  getProcessingWindowState: (
    nowMs?: number,
  ) => ApprovedSpeechAudioProcessingWindowState;
}

export interface ApprovedSpeechAudioProcessingWindowState {
  policy: typeof UNSAVED_RAW_AUDIO_PROCESSING_WINDOW_DISCARD_POLICY;
  processingWindowDurationSeconds: number;
  processingWindowStartedAtMs: number;
  processingWindowExpiresAtMs: number;
  processingWindowExpired: boolean;
  unsavedRawAudioDiscarded: boolean;
  releaseReason: ApprovedSpeechAudioReleaseReason | null;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  audioRetentionPolicy: typeof AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED;
}

export interface CircularAudioBufferState {
  capacityBytes: number;
  sizeBytes: number;
  rolling_buffer_default_duration_seconds: typeof ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
  rolling_buffer_active_duration_seconds: number;
  /**
   * @deprecated Alias for rolling_buffer_active_duration_seconds. Do not use
   * this field as the authoritative default duration or an override source.
   */
  rolling_buffer_duration_seconds: number;
  rollingBufferDefaultDurationSeconds: typeof ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
  rollingBufferActiveDurationSeconds: number;
  /**
   * @deprecated Alias for rollingBufferActiveDurationSeconds. Do not use this
   * field as the authoritative default duration.
   */
  rollingBufferDurationSeconds: number;
  availableDurationSeconds: number;
  chunkCount: number;
  oldestChunkTimestampMs: number | null;
  newestChunkTimestampMs: number | null;
  oldestRetainedAudioTimestampMs: number | null;
  newestRetainedAudioTimestampMs: number | null;
  bufferLocation: typeof BUFFER_LOCATION_ON_DEVICE;
  bufferStorageKind: typeof AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY;
  persistenceSafeguards: BufferedAudioPersistenceSafeguards;
}

export interface CircularAudioBufferAppendOptions {
  timestampMs?: number;
}

export interface TimestampedAudioChunkSnapshot {
  timestampMs: number;
  startedAtMs: number;
  endedAtMs: number;
  byteLength: number;
  audioBytes: Uint8Array;
}

export const ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS =
  resolveRollingBufferNoOverrideActiveDurationSeconds();

export const DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG: RollingAudioBufferConfig =
  Object.freeze({
    rolling_buffer_default_duration_seconds:
      ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    rolling_buffer_active_duration_seconds:
      ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    rolling_buffer_duration_seconds:
      ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    rollingBufferDefaultDurationSeconds:
      ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    rollingBufferActiveDurationSeconds:
      ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    rollingBufferDurationSeconds:
      ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    bufferStorageKind: AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  } as const);

export const DEFAULT_CAPTURE_BUFFERING_CONFIG: CaptureBufferingDefaults =
  Object.freeze({
    processingWindowDurationSeconds:
      CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
    rollingBufferWindowDurationSeconds:
      ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    rawAudioPersistenceEnabled: RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    bufferStorageKind: AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  } as const);

export function getDefaultCaptureBufferingConfig(): CaptureBufferingDefaults {
  return { ...DEFAULT_CAPTURE_BUFFERING_CONFIG };
}

export function createRollingAudioBufferConfig(
  overrides: RollingAudioBufferConfigOverrides = {},
): RollingAudioBufferConfig {
  assertNoAutomaticAudioBufferConfigHooks(overrides);
  assertRollingBufferDefaultDurationNotOverridden(overrides);
  assertRollingBufferDeprecatedDurationNotOverridden(overrides);

  const rollingBufferDurationCustomization =
    resolveRollingBufferDurationCustomizationSource(overrides);
  const rollingBufferActiveDurationSeconds =
    resolveRollingBufferActiveDurationSeconds(
      rollingBufferDurationCustomization.valueSeconds,
      rollingBufferDurationCustomization.sourceName,
    );

  return {
    rolling_buffer_default_duration_seconds:
      ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    rolling_buffer_active_duration_seconds:
      rollingBufferActiveDurationSeconds,
    rolling_buffer_duration_seconds: rollingBufferActiveDurationSeconds,
    rollingBufferDefaultDurationSeconds:
      ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    rollingBufferActiveDurationSeconds,
    rollingBufferDurationSeconds: rollingBufferActiveDurationSeconds,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    bufferStorageKind: AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  };
}

export function resolveRollingBufferActiveDurationSeconds(
  rollingBufferCustomizationValueSeconds:
    | number
    | null
    | undefined = undefined,
  name: string = ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
): number {
  if (
    rollingBufferCustomizationValueSeconds === null ||
    rollingBufferCustomizationValueSeconds === undefined
  ) {
    return resolveRollingBufferNoOverrideActiveDurationSeconds();
  }

  if (
    name === ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME &&
    !isValidRollingBufferActiveDurationSeconds(
      rollingBufferCustomizationValueSeconds,
    )
  ) {
    return resolveRollingBufferNoOverrideActiveDurationSeconds();
  }

  return normalizeRollingBufferActiveDurationSeconds(
    rollingBufferCustomizationValueSeconds,
    name,
  );
}

export function resolveRollingBufferNoOverrideActiveDurationSeconds(): typeof ROLLING_BUFFER_DEFAULT_DURATION_SECONDS {
  return ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;
}

function resolveRollingBufferDurationCustomizationSource(
  overrides: RollingAudioBufferConfigOverrides,
): {
  sourceName:
    | typeof ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME
    | typeof ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY;
  valueSeconds: number | null | undefined;
} {
  const configRecord = overrides as Record<string, unknown>;

  if (
    Object.prototype.hasOwnProperty.call(
      configRecord,
      ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
    )
  ) {
    return {
      sourceName: ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
      valueSeconds: configRecord[
        ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME
      ] as number | null | undefined,
    };
  }

  if (overrides.rollingBufferActiveDurationSeconds !== undefined) {
    return {
      sourceName: ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
      valueSeconds: overrides.rollingBufferActiveDurationSeconds,
    };
  }

  if (
    ROLLING_BUFFER_DURATION_SECONDS !== ROLLING_BUFFER_DEFAULT_DURATION_SECONDS
  ) {
    return {
      sourceName: ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
      valueSeconds: ROLLING_BUFFER_DURATION_SECONDS,
    };
  }

  return {
    sourceName: ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
    valueSeconds: undefined,
  };
}

export function createRollingAudioBufferConfigFromUserSettings(
  settings: RollingBufferUserSettingsInput | null | undefined = {},
): RollingAudioBufferConfig {
  const rollingBufferActiveDurationSeconds =
    resolveRollingBufferActiveDurationSecondsFromUserSettings(settings);

  return createRollingAudioBufferConfig(
    rollingBufferActiveDurationSeconds === undefined
      ? {}
      : { rollingBufferActiveDurationSeconds },
  );
}

export function createRollingBufferUserSettings(
  settings: RollingBufferUserSettingsInput | null | undefined = {},
  { updatedAtMs = Date.now() }: { updatedAtMs?: number } = {},
): RollingBufferUserSettings {
  const rollingConfig = createRollingAudioBufferConfigFromUserSettings(settings);
  const normalizedUpdatedAtMs = normalizeRollingBufferUserSettingsTimestampMs(
    settings?.updatedAtMs ?? updatedAtMs,
    "updatedAtMs",
  );

  return Object.freeze({
    schemaVersion: ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
    rollingBufferActiveDurationSeconds:
      rollingConfig.rollingBufferActiveDurationSeconds,
    rollingBufferCustomizationSource: ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
    rollingBufferDefaultConfigName: ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
    updatedAtMs: normalizedUpdatedAtMs,
  } as const);
}

export function serializeRollingBufferUserSettings(
  settings: RollingBufferUserSettingsInput = {},
): string {
  return JSON.stringify(createRollingBufferUserSettings(settings));
}

export function parseRollingBufferUserSettings(
  serializedSettings: string,
): RollingBufferUserSettings {
  try {
    return createRollingBufferUserSettings(
      JSON.parse(serializedSettings) as RollingBufferUserSettingsInput,
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("rolling buffer user settings must be valid JSON");
    }

    throw error;
  }
}

export async function saveRollingBufferUserSettings(
  storage: RollingBufferUserSettingsPersistenceAdapter,
  settings: RollingBufferUserSettingsInput,
  {
    storageKey = ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY,
    updatedAtMs = Date.now(),
  }: { storageKey?: string; updatedAtMs?: number } = {},
): Promise<RollingBufferUserSettings> {
  assertRollingBufferUserSettingsStorage(storage);

  const normalizedStorageKey = normalizeRollingBufferUserSettingsStorageKey(
    storageKey,
    "storageKey",
  );
  const nextSettings = createRollingBufferUserSettings(settings, {
    updatedAtMs,
  });

  await storage.setItem(normalizedStorageKey, JSON.stringify(nextSettings));
  return nextSettings;
}

export async function persistRollingBufferUserSettings(
  storage: RollingBufferUserSettingsPersistenceAdapter,
  settings: RollingBufferUserSettingsInput,
  options?: { storageKey?: string; updatedAtMs?: number },
): Promise<RollingBufferUserSettings> {
  return saveRollingBufferUserSettings(storage, settings, options);
}

export async function loadRollingBufferUserSettings(
  storage: RollingBufferUserSettingsPersistenceReadAdapter,
  {
    storageKey = ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY,
  }: { storageKey?: string } = {},
): Promise<RollingBufferUserSettings> {
  assertRollingBufferUserSettingsReadableStorage(storage);

  const normalizedStorageKey = normalizeRollingBufferUserSettingsStorageKey(
    storageKey,
    "storageKey",
  );
  const serializedSettings = await storage.getItem(normalizedStorageKey);
  if (serializedSettings === null || serializedSettings === undefined) {
    return createRollingBufferUserSettings();
  }

  return parseRollingBufferUserSettings(serializedSettings);
}

export async function loadRollingAudioBufferConfigFromUserSettings(
  storage: RollingBufferUserSettingsPersistenceReadAdapter,
  options?: { storageKey?: string },
): Promise<RollingAudioBufferConfig> {
  return createRollingAudioBufferConfigFromUserSettings(
    await loadRollingBufferUserSettings(storage, options),
  );
}

export function getBufferedAudioPersistenceSafeguards(): BufferedAudioPersistenceSafeguards {
  return {
    persistencePolicy: AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
    bufferStorageKind: AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
    automaticPersistenceEnabled: false,
    automaticRetentionEnabled: false,
    prohibitedSinks: PROHIBITED_BUFFERED_AUDIO_SINKS,
    serializedAudioBytes: BUFFERED_AUDIO_REDACTION_LABEL,
  };
}

export function assertBufferedAudioSinkAllowed(
  sink: BufferedAudioSink,
): void {
  if (
    (PROHIBITED_BUFFERED_AUDIO_SINKS as readonly string[]).includes(sink)
  ) {
    throw new Error(`buffered audio must never be written to ${sink}`);
  }
}

export function assertApprovedVoiceVerifiedForBufferedAudioDownstream({
  downstreamPath,
  recognitionResult,
}: BufferedAudioDownstreamVoiceVerificationInput): void {
  if (
    !(
      PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS as readonly string[]
    ).includes(downstreamPath)
  ) {
    throw new Error(`unknown buffered audio downstream path: ${downstreamPath}`);
  }

  const matchedVoiceId =
    typeof recognitionResult.matchedVoiceId === "string"
      ? recognitionResult.matchedVoiceId.trim()
      : "";

  if (
    recognitionResult.accepted !== true ||
    matchedVoiceId.length === 0 ||
    !isApprovedVoiceDownstreamAuthorizationForMatch(
      recognitionResult.downstreamAuthorization,
      matchedVoiceId,
    )
  ) {
    throw new Error(
      `${BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR}: ${downstreamPath}`,
    );
  }
}

export function selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
  rollingAudioBuffer,
  recognitionResult,
  downstreamPath = "transcription",
  selectedAtMs = Date.now(),
}: ApprovedSpeechRollingBufferAudioSegmentSelectionInput): ApprovedSpeechRollingBufferAudioSegment | null {
  assertApprovedVoiceVerifiedForBufferedAudioDownstream({
    downstreamPath,
    recognitionResult,
  });

  const selectedTimestampMs = normalizeAudioChunkTimestampMs(
    selectedAtMs,
    "selectedAtMs",
  );
  const recognizedAtMs = normalizeAudioChunkTimestampMs(
    recognitionResult.recognizedAtMs ?? selectedTimestampMs,
    "recognizedAtMs",
  );
  const chunkSnapshots = rollingAudioBuffer.readChunks({
    sink: "local-processing",
  });

  try {
    const eligibleChunks =
      selectEligibleRollingBufferChunksForSpeechProcessing(
        chunkSnapshots,
        recognitionResult,
      );
    if (eligibleChunks.length === 0) return null;

    const audioBytes =
      createConcatenatedRollingBufferAudioSegmentBytes(eligibleChunks);
    if (audioBytes.byteLength === 0) return null;

    const firstChunk = eligibleChunks[0];
    const lastChunk = eligibleChunks[eligibleChunks.length - 1];
    const matchedVoiceId =
      typeof recognitionResult.matchedVoiceId === "string"
        ? recognitionResult.matchedVoiceId.trim()
        : "";

    return attachNonPersistableAudioBytes(
      {
        kind: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
        source: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
        matchedVoiceId,
        recognizedAtMs,
        selectedAtMs: selectedTimestampMs,
        startedAtMs: firstChunk.startedAtMs,
        endedAtMs: lastChunk.endedAtMs,
        byteLength: audioBytes.byteLength,
        chunkCount: eligibleChunks.length,
        bufferLocation: BUFFER_LOCATION_ON_DEVICE,
        audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
      } as const,
      audioBytes,
    );
  } finally {
    for (const chunkSnapshot of chunkSnapshots) {
      releaseCapturedAudioFrame(chunkSnapshot);
    }
  }
}

function selectEligibleRollingBufferChunksForSpeechProcessing(
  chunks: TimestampedAudioChunkSnapshot[],
  recognitionResult: Pick<RejectedSpeechRecognitionMetadata, "latencyMs">,
): TimestampedAudioChunkSnapshot[] {
  const nonEmptyChunks = chunks.filter((chunk) => chunk.byteLength > 0);
  const newestChunk = nonEmptyChunks[nonEmptyChunks.length - 1] ?? null;
  if (!newestChunk) return [];

  const latencyMs = Number(recognitionResult.latencyMs);
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) {
    return [newestChunk];
  }

  const eligibleWindowStartMs = Math.max(0, newestChunk.endedAtMs - latencyMs);
  return nonEmptyChunks.filter(
    (chunk) => chunk.endedAtMs > eligibleWindowStartMs,
  );
}

function createConcatenatedRollingBufferAudioSegmentBytes(
  chunks: TimestampedAudioChunkSnapshot[],
): Uint8Array {
  const byteLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  assertReadableByteCount(byteLength, "approvedSpeechAudioSegment.byteLength");

  const audioBytes = new Uint8Array(byteLength);
  let writeOffset = 0;

  for (const chunk of chunks) {
    audioBytes.set(chunk.audioBytes, writeOffset);
    writeOffset += chunk.byteLength;
  }

  return audioBytes;
}

function isApprovedVoiceDownstreamAuthorizationForMatch(
  authorization:
    | ApprovedVoiceDownstreamAuthorizationMetadata
    | null
    | undefined,
  matchedVoiceId: string,
): boolean {
  if (!authorization || authorization.authorized !== true) return false;
  if (
    typeof authorization.matchedVoiceId !== "string" ||
    authorization.matchedVoiceId.trim() !== matchedVoiceId
  ) {
    return false;
  }
  if (
    !Number.isFinite(authorization.score) ||
    !Number.isFinite(authorization.threshold)
  ) {
    return false;
  }

  return authorization.score >= authorization.threshold;
}

export function assertNoAutomaticAudioBufferConfigHooks(
  config: object,
): void {
  for (const key of PROHIBITED_AUDIO_BUFFER_CONFIG_HOOKS) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      throw new Error(`${AUDIO_BUFFER_CONFIG_HOOK_GUARD_ERROR}: ${key}`);
    }
  }
}

export function assertRollingBufferDefaultDurationNotOverridden(
  config: object,
): void {
  if (
    Object.prototype.hasOwnProperty.call(
      config,
      "rollingBufferDefaultDurationSeconds",
    ) ||
    Object.prototype.hasOwnProperty.call(
      config,
      ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
    )
  ) {
    throw new Error(ROLLING_BUFFER_DEFAULT_DURATION_IMMUTABLE_ERROR);
  }
}

export function assertRollingBufferDeprecatedDurationNotOverridden(
  config: object,
): void {
  const configRecord = config as Record<string, unknown>;
  if (
    (Object.prototype.hasOwnProperty.call(
      config,
      "rollingBufferDurationSeconds",
    ) &&
      configRecord.rollingBufferDurationSeconds !== undefined) ||
    (Object.prototype.hasOwnProperty.call(
      config,
      ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD,
    ) &&
      configRecord[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD] !==
        undefined)
  ) {
    throw new Error(ROLLING_BUFFER_DEPRECATED_DURATION_OVERRIDE_ERROR);
  }
}

export function markAudioBytesAsNonPersistable<
  TAudioBytes extends CircularAudioBufferInput,
>(audioBytes: TAudioBytes): TAudioBytes {
  if (typeof audioBytes !== "object" || audioBytes === null) {
    return audioBytes;
  }

  defineRedactionMethod(audioBytes, "toJSON");
  defineRedactionMethod(audioBytes, "toString");
  defineRedactionMethod(audioBytes, NODE_INSPECT_CUSTOM);
  defineBufferedAudioBrand(audioBytes);
  return audioBytes;
}

export function createNonPersistableAudioBytes(
  audioBytes: CircularAudioBufferInput,
): Uint8Array {
  return markAudioBytesAsNonPersistable(copyAudioBytes(audioBytes));
}

export function attachNonPersistableAudioBytes<TFrame extends object>(
  frameWithoutAudio: TFrame,
  audioBytes: CircularAudioBufferInput,
): CapturedAudioFrame<TFrame, Uint8Array> {
  const frame = { ...frameWithoutAudio };
  Object.defineProperty(frame, "audioBytes", {
    value: createNonPersistableAudioBytes(audioBytes),
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return frame as CapturedAudioFrame<TFrame, Uint8Array>;
}

export function stripCapturedAudioBytes<TFrame extends object>(
  frame: CapturedAudioFrame<TFrame>,
): TFrame {
  const recognitionFrame = { ...frame } as TFrame & {
    audioBytes?: CircularAudioBufferInput;
  };
  delete recognitionFrame.audioBytes;
  return recognitionFrame as TFrame;
}

export function releaseCapturedAudioFrame<TFrame extends object>(
  frame: Partial<CapturedAudioFrame<TFrame>>,
): void {
  const frameWithAudio = frame as {
    audioBytes?: CircularAudioBufferInput;
  };

  if (!Object.prototype.hasOwnProperty.call(frameWithAudio, "audioBytes")) {
    return;
  }

  releaseAudioBytes(frameWithAudio.audioBytes);

  try {
    delete frameWithAudio.audioBytes;
  } catch {
    // Non-configurable platform frames are still scrubbed in-place above.
  }

  if (!Object.prototype.hasOwnProperty.call(frameWithAudio, "audioBytes")) {
    return;
  }

  try {
    Object.defineProperty(frameWithAudio, "audioBytes", {
      value: createNonPersistableAudioBytes([]),
      enumerable: false,
      writable: false,
      configurable: true,
    });
  } catch {
    // If the property cannot be replaced, the original byte storage was zeroed.
  }
}

export function createApprovedSpeechAudioRelease(
  resources: ApprovedSpeechAudioReleaseResources = {},
): ApprovedSpeechAudioRelease {
  const {
    rollingAudioBuffer = null,
    capturedFrames = [],
    rollingBufferAudioSegments = [],
    temporaryCapturedAudioFiles = [],
    unsavedCapturedAudioCaches = [],
    processingWindowDurationSeconds =
      CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
    processingWindowStartedAtMs,
    scheduleProcessingWindowExpiry = true,
    nowMs = Date.now,
    setProcessingWindowExpiryTimer = (callback, delayMs) =>
      setTimeout(callback, delayMs),
    clearProcessingWindowExpiryTimer = (handle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>),
    onRelease,
  } = resources;
  let releaseReason: ApprovedSpeechAudioReleaseReason | null = null;
  let processingWindowExpiryTimer: ProcessingWindowExpiryTimerHandle | null =
    null;
  let temporaryCapturedAudioFilePurgeTargets: UnsavedCapturedAudioTemporaryFilePurgeTarget[] =
    [];
  let unsavedCapturedAudioCachePurgeTargets: UnsavedCapturedAudioCachePurgeTarget[] =
    [];

  try {
    temporaryCapturedAudioFilePurgeTargets =
      normalizeUnsavedCapturedAudioTemporaryFilePurgeTargets(
        temporaryCapturedAudioFiles,
        "approvedSpeechAudioRelease.temporaryCapturedAudioFiles",
      );
    unsavedCapturedAudioCachePurgeTargets =
      normalizeUnsavedCapturedAudioCachePurgeTargets(
        unsavedCapturedAudioCaches,
        "approvedSpeechAudioRelease.unsavedCapturedAudioCaches",
      );
    assertApprovedSpeechAudioReleaseResourcesStayInMemory(
      resources,
      rollingAudioBuffer,
      capturedFrames,
      rollingBufferAudioSegments,
    );
  } catch (error) {
    releaseApprovedSpeechInMemoryResources(
      rollingAudioBuffer,
      capturedFrames,
      rollingBufferAudioSegments,
      temporaryCapturedAudioFilePurgeTargets,
      unsavedCapturedAudioCachePurgeTargets,
    );
    throw error;
  }

  assertDurationSeconds(
    processingWindowDurationSeconds,
    "processingWindowDurationSeconds",
    { allowZero: false },
  );

  const normalizedProcessingWindowStartedAtMs =
    normalizeAudioChunkTimestampMs(
      processingWindowStartedAtMs ?? nowMs(),
      "processingWindowStartedAtMs",
    );
  const processingWindowExpiresAtMs = normalizeAudioChunkTimestampMs(
    normalizedProcessingWindowStartedAtMs +
      processingWindowDurationSeconds * MILLISECONDS_PER_SECOND,
    "processingWindowExpiresAtMs",
  );

  const clearScheduledProcessingWindowExpiry = () => {
    if (processingWindowExpiryTimer === null) return;

    const timer = processingWindowExpiryTimer;
    processingWindowExpiryTimer = null;
    try {
      clearProcessingWindowExpiryTimer(timer);
    } catch {
      // Audio release must still proceed if a host timer handle cannot be cleared.
    }
  };

  const release = (
    reason: ApprovedSpeechAudioReleaseReason = "processing_complete",
  ) => {
    if (releaseReason !== null) {
      return false;
    }

    clearScheduledProcessingWindowExpiry();

    releaseApprovedSpeechInMemoryResources(
      rollingAudioBuffer,
      capturedFrames,
      rollingBufferAudioSegments,
      temporaryCapturedAudioFilePurgeTargets,
      unsavedCapturedAudioCachePurgeTargets,
    );

    releaseReason = reason;
    onRelease?.(reason);
    return true;
  };

  const getProcessingWindowState = (
    currentTimeMs = nowMs(),
  ): ApprovedSpeechAudioProcessingWindowState => {
    const normalizedCurrentTimeMs = normalizeAudioChunkTimestampMs(
      currentTimeMs,
      "nowMs",
    );

    return Object.freeze({
      policy: UNSAVED_RAW_AUDIO_PROCESSING_WINDOW_DISCARD_POLICY,
      processingWindowDurationSeconds,
      processingWindowStartedAtMs: normalizedProcessingWindowStartedAtMs,
      processingWindowExpiresAtMs,
      processingWindowExpired:
        normalizedCurrentTimeMs >= processingWindowExpiresAtMs,
      unsavedRawAudioDiscarded: releaseReason !== null,
      releaseReason,
      bufferLocation: BUFFER_LOCATION_ON_DEVICE,
      audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    }) as ApprovedSpeechAudioProcessingWindowState;
  };

  const expireProcessingWindow = (currentTimeMs = nowMs()) => {
    if (!getProcessingWindowState(currentTimeMs).processingWindowExpired) {
      return false;
    }

    return release(PROCESSING_WINDOW_EXPIRED_RELEASE_REASON);
  };

  if (scheduleProcessingWindowExpiry) {
    const delayMs = Math.max(
      0,
      Math.ceil(
        processingWindowExpiresAtMs -
          normalizeAudioChunkTimestampMs(nowMs(), "nowMs"),
      ),
    );
    processingWindowExpiryTimer = setProcessingWindowExpiryTimer(
      () => {
        expireProcessingWindow(processingWindowExpiresAtMs);
      },
      delayMs,
    );
  }

  return {
    release,
    expireProcessingWindow,
    isReleased() {
      return releaseReason !== null;
    },
    getReleaseReason() {
      return releaseReason;
    },
    getProcessingWindowState,
  };
}

const PROHIBITED_UNSAVED_CAPTURED_AUDIO_RESOURCE_KEYS = Object.freeze([
  "backgroundQueue",
  "backgroundWorker",
  "backgroundWorkerQueue",
  "temporaryCapturedAudioFile",
  "temporaryCapturedAudioFiles",
  "unsavedCapturedAudioCache",
  "unsavedCapturedAudioCaches",
  "filePath",
  "audioFilePath",
  "fileUri",
  "audioFileUri",
  "persistedAudioUri",
  "storageAdapter",
  "storageKey",
  "cacheKey",
  "deleteFile",
  "writeFile",
  "offlineStorage",
  "offlineStorageAdapter",
  "offlineStorageKey",
  "queue",
  "queueAdapter",
  "queueSink",
  "sessionPersistence",
  "sessionPersistenceAdapter",
  "sessionSnapshot",
  "sessionStorage",
  "sessionStorageKey",
  "persistenceAdapter",
  "persistenceSink",
  "retentionAdapter",
  "retentionSink",
] as const);

function assertApprovedSpeechAudioReleaseResourcesStayInMemory(
  resources: ApprovedSpeechAudioReleaseResources,
  rollingAudioBuffer:
    | Pick<OnDeviceCircularAudioBuffer, "clear">
    | null
    | undefined,
  capturedFrames: Array<Partial<CapturedAudioFrame<object>>>,
  rollingBufferAudioSegments: Array<
    Partial<CapturedAudioFrame<ApprovedSpeechRollingBufferAudioSegment>>
  >,
): void {
  assertCapturedAudioObjectHasNoExternalResourceKeys(
    resources,
    "approvedSpeechAudioRelease",
    ["temporaryCapturedAudioFiles", "unsavedCapturedAudioCaches"],
  );

  assertCapturedAudioObjectHasNoExternalResourceKeys(
    rollingAudioBuffer,
    "approvedSpeechAudioRelease.rollingAudioBuffer",
  );

  capturedFrames.forEach((frame, index) => {
    assertCapturedAudioObjectHasNoExternalResourceKeys(
      frame,
      `approvedSpeechAudioRelease.capturedFrames[${index}]`,
    );
  });

  rollingBufferAudioSegments.forEach((segment, index) => {
    assertCapturedAudioObjectHasNoExternalResourceKeys(
      segment,
      `approvedSpeechAudioRelease.rollingBufferAudioSegments[${index}]`,
    );
  });
}

function assertCapturedAudioObjectHasNoExternalResourceKeys(
  value: unknown,
  path: string,
  allowedKeys: readonly string[] = [],
): void {
  if (typeof value !== "object" || value === null) return;

  for (const key of Reflect.ownKeys(value)) {
    if (
      typeof key === "string" &&
      !allowedKeys.includes(key) &&
      (PROHIBITED_UNSAVED_CAPTURED_AUDIO_RESOURCE_KEYS as readonly string[])
        .includes(key)
    ) {
      throwCapturedAudioMemoryOnlyUnlessExplicitSaveError(`${path}.${key}`);
    }
  }
}

function normalizeUnsavedCapturedAudioTemporaryFilePurgeTargets(
  value: unknown,
  path: string,
): UnsavedCapturedAudioTemporaryFilePurgeTarget[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path} must be an array`,
    );
  }

  return value.map((target, index) =>
    normalizeUnsavedCapturedAudioTemporaryFilePurgeTarget(
      target,
      `${path}[${index}]`,
    ),
  );
}

function normalizeUnsavedCapturedAudioTemporaryFilePurgeTarget(
  value: unknown,
  path: string,
): UnsavedCapturedAudioTemporaryFilePurgeTarget {
  const target = requireUnsavedCapturedAudioExternalResourceRecord(
    value,
    path,
  );
  assertUnsavedCapturedAudioExternalResourceHasOnlyPurgeKeys(
    target,
    path,
    ["filePath", "deleteFile"],
  );
  const filePath = normalizeUnsavedCapturedAudioPurgeTargetString(
    target.filePath,
    `${path}.filePath`,
  );

  if (typeof target.deleteFile !== "function") {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path}.deleteFile must be a purge function`,
    );
  }

  const deleteFile = target.deleteFile as (filePath: string) => void;
  return Object.freeze({
    filePath,
    deleteFile: (nextFilePath: string) =>
      deleteFile.call(target, nextFilePath),
  }) as UnsavedCapturedAudioTemporaryFilePurgeTarget;
}

function normalizeUnsavedCapturedAudioCachePurgeTargets(
  value: unknown,
  path: string,
): UnsavedCapturedAudioCachePurgeTarget[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path} must be an array`,
    );
  }

  return value.map((target, index) =>
    normalizeUnsavedCapturedAudioCachePurgeTarget(
      target,
      `${path}[${index}]`,
    ),
  );
}

function normalizeUnsavedCapturedAudioCachePurgeTarget(
  value: unknown,
  path: string,
): UnsavedCapturedAudioCachePurgeTarget {
  const target = requireUnsavedCapturedAudioExternalResourceRecord(
    value,
    path,
  );
  assertUnsavedCapturedAudioExternalResourceHasOnlyPurgeKeys(
    target,
    path,
    ["cacheKey", "clear"],
  );
  const cacheKey = normalizeUnsavedCapturedAudioPurgeTargetString(
    target.cacheKey,
    `${path}.cacheKey`,
  );

  if (typeof target.clear !== "function") {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path}.clear must be a purge function`,
    );
  }

  const clear = target.clear as (cacheKey: string) => void;
  return Object.freeze({
    cacheKey,
    clear: (nextCacheKey: string) => clear.call(target, nextCacheKey),
  }) as UnsavedCapturedAudioCachePurgeTarget;
}

function requireUnsavedCapturedAudioExternalResourceRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path} must be an object`,
    );
  }

  return value as Record<string, unknown>;
}

function assertUnsavedCapturedAudioExternalResourceHasOnlyPurgeKeys(
  value: Record<string, unknown>,
  path: string,
  allowedKeys: readonly string[],
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") continue;
    if (!allowedKeys.includes(key)) {
      throwUnsavedCapturedAudioExternalResourceContractError(
        `${path}.${key} is not a purge-only cleanup field`,
      );
    }
  }
}

function normalizeUnsavedCapturedAudioPurgeTargetString(
  value: unknown,
  path: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `${path} must be a non-empty string`,
    );
  }

  return value.trim();
}

function releaseApprovedSpeechInMemoryResources(
  rollingAudioBuffer:
    | Pick<OnDeviceCircularAudioBuffer, "clear">
    | null
    | undefined,
  capturedFrames: Array<Partial<CapturedAudioFrame<object>>>,
  rollingBufferAudioSegments: Array<
    Partial<CapturedAudioFrame<ApprovedSpeechRollingBufferAudioSegment>>
  >,
  temporaryCapturedAudioFiles: readonly UnsavedCapturedAudioTemporaryFilePurgeTarget[] = [],
  unsavedCapturedAudioCaches: readonly UnsavedCapturedAudioCachePurgeTarget[] = [],
): void {
  rollingAudioBuffer?.clear();

  for (const frame of capturedFrames) {
    releaseCapturedAudioFrame(frame);
  }

  for (const segment of rollingBufferAudioSegments) {
    releaseCapturedAudioFrame(segment);
  }

  purgeUnsavedCapturedAudioExternalResources({
    temporaryCapturedAudioFiles,
    unsavedCapturedAudioCaches,
  });
}

export function purgeUnsavedCapturedAudioExternalResources(
  resources: UnsavedCapturedAudioExternalResources = {},
): UnsavedCapturedAudioExternalResourcePurgeResult {
  const temporaryCapturedAudioFiles =
    normalizeUnsavedCapturedAudioTemporaryFilePurgeTargets(
      resources.temporaryCapturedAudioFiles,
      "unsavedCapturedAudioExternalResources.temporaryCapturedAudioFiles",
    );
  const unsavedCapturedAudioCaches =
    normalizeUnsavedCapturedAudioCachePurgeTargets(
      resources.unsavedCapturedAudioCaches,
      "unsavedCapturedAudioExternalResources.unsavedCapturedAudioCaches",
    );
  const purgeErrors: string[] = [];

  for (const temporaryFile of temporaryCapturedAudioFiles) {
    try {
      temporaryFile.deleteFile(temporaryFile.filePath);
    } catch (error) {
      purgeErrors.push(
        `${temporaryFile.filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (const cache of unsavedCapturedAudioCaches) {
    try {
      cache.clear(cache.cacheKey);
    } catch (error) {
      purgeErrors.push(
        `${cache.cacheKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (purgeErrors.length > 0) {
    throwUnsavedCapturedAudioExternalResourceContractError(
      `purge failed for ${purgeErrors.join("; ")}`,
    );
  }

  return Object.freeze({
    purged: true,
    policy: UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY,
    temporaryCapturedAudioFileCount: temporaryCapturedAudioFiles.length,
    unsavedCapturedAudioCacheCount: unsavedCapturedAudioCaches.length,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  }) as UnsavedCapturedAudioExternalResourcePurgeResult;
}

export function releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
  releaseCapturedAudio,
  saveIntentPresent = DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
}: TranscriptionAudioCompletionCleanupInput): TranscriptionAudioCompletionCleanup {
  if (saveIntentPresent !== DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT) {
    throw new Error(TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR);
  }

  return {
    transcriptionCompleted: true,
    saveIntentPresent: DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
    released:
      releaseCapturedAudio?.(
        TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
      ) ?? false,
    releaseReason: TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  };
}

export function discardRejectedSpeechBeforeDownstream({
  recognitionResult,
  rollingAudioBuffer = null,
  capturedFrames = [],
  temporaryCapturedAudioFiles = [],
  unsavedCapturedAudioCaches = [],
}: RejectedSpeechBlockResources): RejectedSpeechBlockResult {
  if (recognitionResult.accepted === true) {
    throw new Error(
      "accepted speech must not use the rejected speech discard boundary",
    );
  }

  const temporaryCapturedAudioFilePurgeTargets =
    normalizeUnsavedCapturedAudioTemporaryFilePurgeTargets(
      temporaryCapturedAudioFiles,
      "rejectedSpeechBlock.temporaryCapturedAudioFiles",
    );
  const unsavedCapturedAudioCachePurgeTargets =
    normalizeUnsavedCapturedAudioCachePurgeTargets(
      unsavedCapturedAudioCaches,
      "rejectedSpeechBlock.unsavedCapturedAudioCaches",
    );

  for (const frame of capturedFrames) {
    releaseCapturedAudioFrame(frame);
  }

  rollingAudioBuffer?.clear();
  purgeUnsavedCapturedAudioExternalResources({
    temporaryCapturedAudioFiles: temporaryCapturedAudioFilePurgeTargets,
    unsavedCapturedAudioCaches: unsavedCapturedAudioCachePurgeTargets,
  });

  return Object.freeze({
    accepted: false,
    discarded: true,
    policy: REJECTED_SPEECH_BLOCK_POLICY,
    reason: recognitionResult.reason ?? null,
    matchedVoiceId: null,
    rejectedVoiceId: recognitionResult.rejectedVoiceId ?? null,
    blockedDownstreamSinks: REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS,
    rollingBufferSizeBytesAfterDiscard:
      rollingAudioBuffer?.getState?.().sizeBytes ?? null,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  }) as RejectedSpeechBlockResult;
}

export function createApprovedAudioSaveRequest(
  input: ApprovedAudioSaveRequestInput,
): ApprovedAudioSaveRequest {
  const inputRecord = requireAudioSaveRequestRecord(input, "audioSaveRequest");
  const capturedAudioSaveIntent = normalizeRequiredAudioSaveLiteral(
    inputRecord.capturedAudioSaveIntent,
    CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    "capturedAudioSaveIntent",
  );
  const saveActionKind = normalizeRequiredAudioSaveLiteral(
    inputRecord.saveActionKind,
    APPROVED_AUDIO_SAVE_ACTION_KIND,
    "saveActionKind",
  );
  const approvedUserIdentity = normalizeApprovedAudioSaveUserIdentity(
    inputRecord.approvedUserIdentity,
  );
  const approvedVoiceMatch = normalizeApprovedAudioSaveVoiceMatch(
    inputRecord.approvedVoiceMatch,
    approvedUserIdentity.approvedVoiceId,
  );
  const userVisiblePurpose = normalizeUserVisibleLaterUsePurpose(
    inputRecord.userVisiblePurpose,
    "userVisiblePurpose",
  );
  const retentionMetadata = normalizeApprovedAudioRetentionMetadata(
    inputRecord.retentionMetadata,
  );
  const purposeMetadata = normalizeApprovedAudioSavePurposeMetadata(
    inputRecord.purposeMetadata,
    userVisiblePurpose,
    retentionMetadata.requestedAtMs,
  );

  return Object.freeze({
    capturedAudioSaveIntent,
    saveActionKind,
    approvedVoiceMatch,
    approvedUserIdentity,
    userVisiblePurpose,
    purposeMetadata,
    retentionMetadata,
  }) as ApprovedAudioSaveRequest;
}

export function assertApprovedAudioSaveRequest(
  request: unknown,
): asserts request is ApprovedAudioSaveRequest {
  createApprovedAudioSaveRequest(request as ApprovedAudioSaveRequestInput);
}

export function createApprovedAudioSaveAction(
  input: ApprovedAudioSaveRequestInput,
): ApprovedAudioSaveAction {
  return Object.freeze({
    kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    request: createApprovedAudioSaveRequest(input),
  }) as ApprovedAudioSaveAction;
}

export function assertApprovedAudioSaveAction(
  action: unknown,
): asserts action is ApprovedAudioSaveAction {
  normalizeApprovedAudioSaveAction(action);
}

export function createApprovedAudioSaveAuthorization(
  saveAction: ApprovedAudioSaveAction,
  {
    authorizedAtMs,
  }: ApprovedAudioSaveAuthorizationOptions = {},
): ApprovedAudioSaveAuthorization {
  const normalizedSaveAction = normalizeApprovedAudioSaveAction(saveAction);
  return createBrandedApprovedAudioSaveAuthorization(
    normalizedSaveAction.request,
    authorizedAtMs,
  );
}

export function assertApprovedAudioSaveAuthorization(
  authorization: unknown,
  saveAction: ApprovedAudioSaveAction,
): asserts authorization is ApprovedAudioSaveAuthorization {
  const normalizedSaveAction = normalizeApprovedAudioSaveAction(saveAction);
  normalizeApprovedAudioSaveAuthorization(
    authorization,
    normalizedSaveAction.request,
  );
}

export function assertApprovedAudioClipSaveAuthorized(
  input: Pick<ApprovedAudioClipSaveInput, "saveAction" | "saveAuthorization">,
): void {
  normalizeApprovedAudioClipSaveAuthorization(input);
}

export function assertDurableApprovedAudioClipWriteAllowed(
  clip: unknown,
): asserts clip is SavedApprovedAudioClip {
  normalizeDurableApprovedAudioClipWrite(clip);
}

export class LocalApprovedAudioClipStore implements ApprovedAudioClipStore {
  private readonly clips = new Map<string, SavedApprovedAudioClip>();
  private readonly changeListeners =
    new Set<ApprovedAudioClipStoreChangeListener>();

  save(input: ApprovedAudioClipSaveInput): SavedApprovedAudioClip {
    let clip: SavedApprovedAudioClip | null = null;

    try {
      clip = createSavedApprovedAudioClipFromExplicitSaveAction(input);
      if (this.clips.has(clip.clipId)) {
        throwApprovedAudioClipStoreContractError(
          `clipId ${clip.clipId} already exists`,
        );
      }

      const storedClip = cloneSavedApprovedAudioClip(clip);
      const returnedClip = cloneSavedApprovedAudioClip(clip);
      this.clips.set(clip.clipId, storedClip);
      releaseAudioBytes(clip.audioBytes);
      input.rollingAudioBuffer.clear();
      this.notifyChangeListeners();
      return returnedClip;
    } catch (error) {
      releaseAudioBytes(clip?.audioBytes);
      clearRollingAudioBufferAfterRejectedSave(input);
      throw error;
    }
  }

  get(clipId: string): SavedApprovedAudioClip | null {
    const normalizedClipId = normalizeApprovedAudioClipId(clipId, "clipId");
    const clip = this.clips.get(normalizedClipId);
    return clip ? cloneSavedApprovedAudioClip(clip) : null;
  }

  list(): SavedApprovedAudioClip[] {
    return Array.from(this.clips.values(), cloneSavedApprovedAudioClip);
  }

  delete(clipId: string): boolean {
    const normalizedClipId = normalizeApprovedAudioClipId(clipId, "clipId");
    const clip = this.clips.get(normalizedClipId);
    if (!clip) return false;

    releaseAudioBytes(clip.audioBytes);
    const deleted = this.clips.delete(normalizedClipId);
    if (deleted) {
      this.notifyChangeListeners();
    }
    return deleted;
  }

  clear(): void {
    const hadClips = this.clips.size > 0;
    for (const clip of this.clips.values()) {
      releaseAudioBytes(clip.audioBytes);
    }
    this.clips.clear();
    if (hadClips) {
      this.notifyChangeListeners();
    }
  }

  pruneExpired(nowMs = Date.now()): number {
    const normalizedNowMs = normalizeAudioSaveTimestampMs(
      nowMs,
      "nowMs",
    );
    let removedCount = 0;

    for (const clip of this.clips.values()) {
      if (clip.retentionMetadata.expiresAtMs <= normalizedNowMs) {
        if (this.delete(clip.clipId)) {
          removedCount += 1;
        }
      }
    }

    return removedCount;
  }

  subscribe(listener: ApprovedAudioClipStoreChangeListener): () => void {
    if (typeof listener !== "function") {
      throwApprovedAudioClipStoreContractError(
        "clip store change listener must be a function",
      );
    }

    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private notifyChangeListeners(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}

export function createLocalApprovedAudioClipStore(): ApprovedAudioClipStore {
  return new LocalApprovedAudioClipStore();
}

export class DurableApprovedAudioClipStore implements ApprovedAudioClipStore {
  private readonly clips = new Map<string, SavedApprovedAudioClip>();
  private readonly storageAdapter: DurableApprovedAudioClipStorageAdapter;
  private readonly changeListeners =
    new Set<ApprovedAudioClipStoreChangeListener>();

  constructor(storageAdapter: DurableApprovedAudioClipStorageAdapter) {
    if (
      typeof storageAdapter !== "object" ||
      storageAdapter === null ||
      typeof storageAdapter.write !== "function"
    ) {
      throwDurableApprovedAudioStorageContractError(
        "storageAdapter.write must be a function",
      );
    }

    this.storageAdapter = storageAdapter;
  }

  save(input: ApprovedAudioClipSaveInput): SavedApprovedAudioClip {
    let clip: SavedApprovedAudioClip | null = null;

    try {
      clip = createSavedApprovedAudioClipFromExplicitSaveAction(input);
      if (this.clips.has(clip.clipId)) {
        throwApprovedAudioClipStoreContractError(
          `clipId ${clip.clipId} already exists`,
        );
      }

      assertDurableApprovedAudioClipWriteAllowed(clip);
      this.storageAdapter.write(cloneSavedApprovedAudioClip(clip));

      const storedClip = cloneSavedApprovedAudioClip(clip);
      const returnedClip = cloneSavedApprovedAudioClip(clip);
      this.clips.set(clip.clipId, storedClip);
      releaseAudioBytes(clip.audioBytes);
      input.rollingAudioBuffer.clear();
      this.notifyChangeListeners();
      return returnedClip;
    } catch (error) {
      releaseAudioBytes(clip?.audioBytes);
      clearRollingAudioBufferAfterRejectedSave(input);
      throw error;
    }
  }

  get(clipId: string): SavedApprovedAudioClip | null {
    const normalizedClipId = normalizeApprovedAudioClipId(clipId, "clipId");
    const clip = this.clips.get(normalizedClipId);
    return clip ? cloneSavedApprovedAudioClip(clip) : null;
  }

  list(): SavedApprovedAudioClip[] {
    return Array.from(this.clips.values(), cloneSavedApprovedAudioClip);
  }

  delete(clipId: string): boolean {
    const normalizedClipId = normalizeApprovedAudioClipId(clipId, "clipId");
    const clip = this.clips.get(normalizedClipId);
    if (!clip) return false;

    this.storageAdapter.delete?.(normalizedClipId);
    releaseAudioBytes(clip.audioBytes);
    const deleted = this.clips.delete(normalizedClipId);
    if (deleted) {
      this.notifyChangeListeners();
    }
    return deleted;
  }

  clear(): void {
    const hadClips = this.clips.size > 0;
    this.storageAdapter.clear?.();
    for (const clip of this.clips.values()) {
      releaseAudioBytes(clip.audioBytes);
    }
    this.clips.clear();
    if (hadClips) {
      this.notifyChangeListeners();
    }
  }

  pruneExpired(nowMs = Date.now()): number {
    const normalizedNowMs = normalizeAudioSaveTimestampMs(
      nowMs,
      "nowMs",
    );
    let removedCount = 0;

    for (const clip of this.clips.values()) {
      if (clip.retentionMetadata.expiresAtMs <= normalizedNowMs) {
        if (this.delete(clip.clipId)) {
          removedCount += 1;
        }
      }
    }

    return removedCount;
  }

  subscribe(listener: ApprovedAudioClipStoreChangeListener): () => void {
    if (typeof listener !== "function") {
      throwApprovedAudioClipStoreContractError(
        "clip store change listener must be a function",
      );
    }

    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private notifyChangeListeners(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}

export function createDurableApprovedAudioClipStore(
  storageAdapter: DurableApprovedAudioClipStorageAdapter,
): ApprovedAudioClipStore {
  return new DurableApprovedAudioClipStore(storageAdapter);
}

export function createSavedApprovedAudioClipFromExplicitSaveAction({
  saveAction,
  saveAuthorization,
  rollingAudioBuffer,
  approvedSpeechAudioSegment = null,
  clipId,
  savedAtMs,
}: ApprovedAudioClipSaveInput): SavedApprovedAudioClip {
  let pendingAudioBytes: Uint8Array | undefined;

  try {
    const { saveAction: normalizedSaveAction } =
      normalizeApprovedAudioClipSaveAuthorization({
        saveAction,
        saveAuthorization,
      });
    const requestedAtMs =
      normalizedSaveAction.request.retentionMetadata.requestedAtMs;
    const normalizedSavedAtMs = normalizeAudioSaveTimestampMs(
      savedAtMs ?? requestedAtMs,
      "savedAtMs",
    );

    if (
      normalizedSavedAtMs >
      normalizedSaveAction.request.retentionMetadata.expiresAtMs
    ) {
      throwApprovedAudioClipStoreContractError(
        "savedAtMs must be before retentionMetadata.expiresAtMs",
      );
    }

    pendingAudioBytes = readApprovedAudioBytesForExplicitSave({
      approvedSpeechAudioSegment,
      rollingAudioBuffer,
      saveAction: normalizedSaveAction,
    });
    if (pendingAudioBytes.byteLength === 0) {
      throwApprovedAudioClipStoreContractError(
        "rollingAudioBuffer must contain approved speech audio",
      );
    }

    const savedClip = createSavedApprovedAudioClip({
      clipId:
        clipId ??
        createDefaultApprovedAudioClipId(
          normalizedSaveAction.request.approvedUserIdentity.approvedVoiceId,
          normalizedSavedAtMs,
        ),
      audioBytes: pendingAudioBytes,
      savedAtMs: normalizedSavedAtMs,
      request: normalizedSaveAction.request,
    });
    releaseAudioBytes(pendingAudioBytes);
    pendingAudioBytes = undefined;
    releaseApprovedSpeechAudioSegmentSource(approvedSpeechAudioSegment);
    return savedClip;
  } catch (error) {
    releaseAudioBytes(pendingAudioBytes);
    releaseApprovedSpeechAudioSegmentSource(approvedSpeechAudioSegment);
    clearRollingAudioBufferAfterRejectedSave({ rollingAudioBuffer });
    throw error;
  }
}

function releaseApprovedSpeechAudioSegmentSource(
  approvedSpeechAudioSegment:
    | ApprovedSpeechRollingBufferAudioSegment
    | null
    | undefined,
): void {
  if (!approvedSpeechAudioSegment) return;

  releaseCapturedAudioFrame(approvedSpeechAudioSegment);
}

function readApprovedAudioBytesForExplicitSave({
  approvedSpeechAudioSegment,
  rollingAudioBuffer,
  saveAction,
}: {
  approvedSpeechAudioSegment: ApprovedSpeechRollingBufferAudioSegment | null;
  rollingAudioBuffer: Pick<OnDeviceCircularAudioBuffer, "read" | "clear">;
  saveAction: ApprovedAudioSaveAction;
}): Uint8Array {
  if (approvedSpeechAudioSegment) {
    return readApprovedSpeechAudioSegmentForExplicitSave(
      approvedSpeechAudioSegment,
      saveAction,
    );
  }

  return rollingAudioBuffer.read(undefined, {
    sink: "local-memory",
  });
}

function readApprovedSpeechAudioSegmentForExplicitSave(
  segment: ApprovedSpeechRollingBufferAudioSegment,
  saveAction: ApprovedAudioSaveAction,
): Uint8Array {
  if (segment.kind !== APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND) {
    throwApprovedAudioClipStoreContractError(
      `approvedSpeechAudioSegment.kind must be ${APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND}`,
    );
  }

  if (
    segment.source !== APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE
  ) {
    throwApprovedAudioClipStoreContractError(
      `approvedSpeechAudioSegment.source must be ${APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE}`,
    );
  }

  const matchedVoiceId =
    typeof segment.matchedVoiceId === "string"
      ? segment.matchedVoiceId.trim()
      : "";
  if (
    matchedVoiceId !== saveAction.request.approvedVoiceMatch.matchedVoiceId
  ) {
    throwApprovedAudioClipStoreContractError(
      "approvedSpeechAudioSegment.matchedVoiceId must match the approved save action",
    );
  }

  if (segment.bufferLocation !== BUFFER_LOCATION_ON_DEVICE) {
    throwApprovedAudioClipStoreContractError(
      `approvedSpeechAudioSegment.bufferLocation must be ${BUFFER_LOCATION_ON_DEVICE}`,
    );
  }

  if (
    segment.audioRetentionPolicy !== AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED
  ) {
    throwApprovedAudioClipStoreContractError(
      `approvedSpeechAudioSegment.audioRetentionPolicy must be ${AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED}`,
    );
  }

  let audioBytes: Uint8Array;
  try {
    audioBytes = normalizeAudioBytes(segment.audioBytes);
  } catch {
    throwApprovedAudioClipStoreContractError(
      "approvedSpeechAudioSegment.audioBytes must be approved speech audio bytes",
    );
  }

  if (segment.byteLength !== audioBytes.byteLength) {
    throwApprovedAudioClipStoreContractError(
      "approvedSpeechAudioSegment.byteLength must match audioBytes.byteLength",
    );
  }

  return audioBytes;
}

function clearRollingAudioBufferAfterRejectedSave(
  input:
    | Partial<
        Pick<
          ApprovedAudioClipSaveInput,
          "rollingAudioBuffer" | "approvedSpeechAudioSegment"
        >
      >
    | undefined,
): void {
  try {
    input?.rollingAudioBuffer?.clear();
  } catch {
    // Rejected persistence attempts must not retain audio if cleanup is possible.
  }

  releaseApprovedSpeechAudioSegmentSource(input?.approvedSpeechAudioSegment);
}

export function saveApprovedAudioClipFromExplicitSaveAction(
  store: ApprovedAudioClipStore,
  input: ApprovedAudioClipSaveInput,
): SavedApprovedAudioClip {
  try {
    assertApprovedAudioClipSaveAuthorized(input);
    return store.save(input);
  } catch (error) {
    clearRollingAudioBufferAfterRejectedSave(input);
    throw error;
  }
}

export function createSavedApprovedAudioRecordView(
  clip: SavedApprovedAudioRecordMetadata,
): SavedApprovedAudioRecordView {
  const clipRecord = requireAudioSaveRequestRecord(
    clip,
    "savedAudioRecord",
  );
  normalizeRequiredAudioSaveLiteral(
    clipRecord.recordSchemaVersion,
    SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
    "savedAudioRecord.recordSchemaVersion",
  );
  const clipId = normalizeApprovedAudioClipId(
    clipRecord.clipId,
    "savedAudioRecord.clipId",
  );
  const byteLength = normalizeSavedAudioRecordByteLength(
    clipRecord.byteLength,
    "savedAudioRecord.byteLength",
  );
  const savedAtMs = normalizeAudioSaveTimestampMs(
    clipRecord.savedAtMs,
    "savedAudioRecord.savedAtMs",
  );
  const request = createApprovedAudioSaveRequest({
    capturedAudioSaveIntent:
      clipRecord.capturedAudioSaveIntent as typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind:
      clipRecord.saveActionKind as typeof APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: clipRecord.approvedVoiceMatch as ApprovedAudioSaveVoiceMatch,
    approvedUserIdentity:
      clipRecord.approvedUserIdentity as ApprovedAudioSaveUserIdentity,
    userVisiblePurpose: clipRecord.userVisiblePurpose as string,
    purposeMetadata:
      clipRecord.purposeMetadata as ApprovedAudioSavePurposeMetadata,
    retentionMetadata:
      clipRecord.retentionMetadata as ApprovedAudioRetentionMetadata,
  });
  const ownerIdentity = normalizeApprovedAudioSaveUserIdentity(
    clipRecord.ownerIdentity,
    "savedAudioRecord.ownerIdentity",
  );
  const retentionTimestampMs = normalizeAudioSaveTimestampMs(
    clipRecord.retentionTimestampMs,
    "savedAudioRecord.retentionTimestampMs",
  );
  const retentionPurposeMetadata = normalizeApprovedAudioSavePurposeMetadata(
    clipRecord.retentionPurposeMetadata,
    request.userVisiblePurpose,
    request.retentionMetadata.requestedAtMs,
  );
  const userVisibleMetadata = normalizeSavedApprovedAudioUserVisibleMetadata(
    clipRecord.userVisibleMetadata,
    "savedAudioRecord.userVisibleMetadata",
  );
  const storageLocation = normalizeRequiredAudioSaveLiteral(
    clipRecord.storageLocation,
    BUFFER_LOCATION_ON_DEVICE,
    "savedAudioRecord.storageLocation",
  );
  const retentionPolicy = normalizeRequiredAudioSaveLiteral(
    clipRecord.retentionPolicy,
    AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    "savedAudioRecord.retentionPolicy",
  );

  assertSavedAudioRecordOwnerIdentityMatchesSaveIdentity(
    ownerIdentity,
    request.approvedUserIdentity,
    "savedAudioRecord.ownerIdentity",
  );

  if (retentionTimestampMs !== request.retentionMetadata.requestedAtMs) {
    throwApprovedAudioClipStoreContractError(
      "savedAudioRecord.retentionTimestampMs must match retentionMetadata.requestedAtMs",
    );
  }

  assertSavedAudioRecordRetentionPurposeMetadataMatchesPurposeMetadata(
    retentionPurposeMetadata,
    request.purposeMetadata,
    "savedAudioRecord.retentionPurposeMetadata",
  );
  assertSavedAudioRecordUserVisibleMetadataMatchesPurposeMetadata(
    userVisibleMetadata,
    request.purposeMetadata,
    "savedAudioRecord.userVisibleMetadata",
  );

  if (
    savedAtMs < request.retentionMetadata.requestedAtMs ||
    savedAtMs > request.retentionMetadata.expiresAtMs
  ) {
    throwApprovedAudioClipStoreContractError(
      "savedAudioRecord.savedAtMs must be inside the declared retention window",
    );
  }

  return Object.freeze({
    recordSchemaVersion: SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
    clipId,
    byteLength,
    savedAtMs,
    retainedBecause: `Explicitly saved for later use: ${request.userVisiblePurpose}`,
    retentionReason:
      SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
    capturedAudioSaveIntent: request.capturedAudioSaveIntent,
    saveActionKind: request.saveActionKind,
    approvedVoiceMatch: request.approvedVoiceMatch,
    approvedUserIdentity: request.approvedUserIdentity,
    ownerIdentity,
    userVisiblePurpose: request.userVisiblePurpose,
    userVisibleMetadata,
    purposeMetadata: request.purposeMetadata,
    retentionPurposeMetadata,
    retentionTimestampMs,
    retentionRequestedAtMs: request.retentionMetadata.requestedAtMs,
    retentionDurationSeconds:
      request.retentionMetadata.retentionDurationSeconds,
    retentionExpiresAtMs: request.retentionMetadata.expiresAtMs,
    storageLocation,
    retentionPolicy,
  }) as SavedApprovedAudioRecordView;
}

export function assertSavedApprovedAudioRecordMetadataContract(
  record: unknown,
): asserts record is SavedApprovedAudioRecordMetadata {
  createSavedApprovedAudioRecordView(record as SavedApprovedAudioRecordMetadata);
}

export function listSavedApprovedAudioRecordViews(
  store: Pick<ApprovedAudioClipStore, "list">,
): SavedApprovedAudioRecordView[] {
  return store.list().map(createSavedApprovedAudioRecordView);
}

export function getSavedApprovedAudioRecordView(
  store: Pick<ApprovedAudioClipStore, "get">,
  clipId: string,
): SavedApprovedAudioRecordView | null {
  const clip = store.get(clipId);
  return clip ? createSavedApprovedAudioRecordView(clip) : null;
}

export function createSavedApprovedAudioUserExport(
  store: Pick<ApprovedAudioClipStore, "list">,
  {
    approvedUserId,
    exportedAtMs = Date.now(),
  }: {
    approvedUserId: string;
    exportedAtMs?: number;
  },
): SavedApprovedAudioUserExport {
  const normalizedApprovedUserId = normalizeApprovedAudioExportUserId(
    approvedUserId,
  );
  const savedAudioRecordViews = freezeSavedAudioRecordViews(
    listSavedApprovedAudioRecordViews(store).filter(
      (record) =>
        record.ownerIdentity.approvedUserId === normalizedApprovedUserId,
    ),
  );

  return Object.freeze({
    exportPath: SAVED_APPROVED_AUDIO_USER_EXPORT_PATH,
    exportScope: "user",
    approvedUserId: normalizedApprovedUserId,
    exportedAtMs: normalizeApprovedAudioExportTimestamp(exportedAtMs),
    savedAudioRecordViews,
    savedAudioRecordCount: savedAudioRecordViews.length,
    rawAudioIncluded: false,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  }) as SavedApprovedAudioUserExport;
}

export function createSavedApprovedAudioAdminExport(
  store: Pick<ApprovedAudioClipStore, "list">,
  {
    exportedAtMs = Date.now(),
  }: {
    exportedAtMs?: number;
  } = {},
): SavedApprovedAudioAdminExport {
  const savedAudioRecordViews = freezeSavedAudioRecordViews(
    listSavedApprovedAudioRecordViews(store),
  );
  const retainedOwnerUserIds = Object.freeze(
    Array.from(
      new Set(
        savedAudioRecordViews.map(
          (record) => record.ownerIdentity.approvedUserId,
        ),
      ),
    ),
  );

  return Object.freeze({
    exportPath: SAVED_APPROVED_AUDIO_ADMIN_EXPORT_PATH,
    exportScope: "admin",
    exportedAtMs: normalizeApprovedAudioExportTimestamp(exportedAtMs),
    savedAudioRecordViews,
    savedAudioRecordCount: savedAudioRecordViews.length,
    retainedOwnerUserIds,
    rawAudioIncluded: false,
    bufferLocation: BUFFER_LOCATION_ON_DEVICE,
    audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  }) as SavedApprovedAudioAdminExport;
}

export function assertNetworkPayloadExcludesBufferedAudio(
  payload: unknown,
  { path = "$" }: NetworkSafeJsonOptions = {},
): void {
  const visited = new WeakSet<object>();

  function assertSafe(value: unknown, currentPath: string): void {
    if (value === null || value === undefined) return;

    if (typeof value === "string") {
      if (
        isAudioPayloadPath(currentPath) ||
        value.includes(BUFFERED_AUDIO_REDACTION_LABEL)
      ) {
        throwBufferedAudioNetworkGuardError(currentPath);
      }
      return;
    }

    if (typeof value !== "object") return;

    if (visited.has(value)) return;
    visited.add(value);

    if (
      isBrandedBufferedAudio(value) ||
      value instanceof OnDeviceCircularAudioBuffer
    ) {
      throwBufferedAudioNetworkGuardError(currentPath);
    }

    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      if (isAudioPayloadPath(currentPath)) {
        throwBufferedAudioNetworkGuardError(currentPath);
      }
      return;
    }

    for (const key of Reflect.ownKeys(value)) {
      const nextPath = formatPayloadPath(currentPath, key);
      if (isAudioPayloadKey(key)) {
        throwBufferedAudioNetworkGuardError(nextPath);
      }
      assertSafe((value as Record<PropertyKey, unknown>)[key], nextPath);
    }
  }

  assertSafe(payload, path);
}

export function createNetworkSafeJsonBody(
  payload: unknown,
  options?: NetworkSafeJsonOptions,
): string {
  assertNetworkPayloadExcludesBufferedAudio(payload, options);
  return JSON.stringify(payload);
}

export function assertNonSaveRetentionPayloadExcludesCapturedAudio(
  payload: unknown,
  { surface, path = "$" }: CapturedAudioNonSaveRetentionPayloadOptions,
): void {
  const normalizedSurface =
    normalizeCapturedAudioNonSaveRetentionSurface(surface);
  const visited = new WeakSet<object>();

  function assertSafe(value: unknown, currentPath: string): void {
    if (value === null || value === undefined) return;

    if (typeof value === "string") {
      if (
        isAudioPayloadPath(currentPath) ||
        value.includes(BUFFERED_AUDIO_REDACTION_LABEL)
      ) {
        throwCapturedAudioNonSaveRetentionGuardError(
          normalizedSurface,
          currentPath,
        );
      }
      return;
    }

    if (typeof value !== "object") return;

    if (visited.has(value)) return;
    visited.add(value);

    if (
      isBrandedBufferedAudio(value) ||
      value instanceof OnDeviceCircularAudioBuffer ||
      ArrayBuffer.isView(value) ||
      value instanceof ArrayBuffer ||
      isLikelyDirectByteArray(value, currentPath)
    ) {
      throwCapturedAudioNonSaveRetentionGuardError(
        normalizedSurface,
        currentPath,
      );
    }

    for (const key of Reflect.ownKeys(value)) {
      const nextPath = formatPayloadPath(currentPath, key);
      if (isAudioPayloadKey(key)) {
        throwCapturedAudioNonSaveRetentionGuardError(
          normalizedSurface,
          nextPath,
        );
      }
      assertSafe((value as Record<PropertyKey, unknown>)[key], nextPath);
    }
  }

  assertSafe(payload, path);
}

export function createNonSaveRetentionSafeJsonBody(
  payload: unknown,
  options: CapturedAudioNonSaveRetentionPayloadOptions,
): string {
  assertNonSaveRetentionPayloadExcludesCapturedAudio(payload, options);
  return JSON.stringify(payload);
}

export function assertBackgroundWorkerPayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): void {
  assertNonSaveRetentionPayloadExcludesCapturedAudio(payload, {
    ...options,
    surface: "background-worker",
  });
}

export function assertQueuePayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): void {
  assertNonSaveRetentionPayloadExcludesCapturedAudio(payload, {
    ...options,
    surface: "queue",
  });
}

export function assertOfflineStoragePayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): void {
  assertNonSaveRetentionPayloadExcludesCapturedAudio(payload, {
    ...options,
    surface: "offline-storage",
  });
}

export function assertSessionPersistencePayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): void {
  assertNonSaveRetentionPayloadExcludesCapturedAudio(payload, {
    ...options,
    surface: "session-persistence",
  });
}

export function createBackgroundWorkerSafeJsonBody(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): string {
  return createNonSaveRetentionSafeJsonBody(payload, {
    ...options,
    surface: "background-worker",
  });
}

export function createQueueSafeJsonBody(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): string {
  return createNonSaveRetentionSafeJsonBody(payload, {
    ...options,
    surface: "queue",
  });
}

export function createOfflineStorageSafeJsonBody(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): string {
  return createNonSaveRetentionSafeJsonBody(payload, {
    ...options,
    surface: "offline-storage",
  });
}

export function createSessionPersistenceSafeJsonBody(
  payload: unknown,
  options: Omit<
    CapturedAudioNonSaveRetentionPayloadOptions,
    "surface"
  > = {},
): string {
  return createNonSaveRetentionSafeJsonBody(payload, {
    ...options,
    surface: "session-persistence",
  });
}

export function assertDiagnosticsPayloadExcludesCapturedAudio(
  payload: unknown,
  { sink = "logs", path = "$" }: AudioDiagnosticsPayloadOptions = {},
): void {
  const visited = new WeakSet<object>();

  function assertSafe(value: unknown, currentPath: string): void {
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      if (isAudioPayloadPath(currentPath)) {
        throwBufferedAudioDiagnosticsGuardError(sink, currentPath);
      }
      return;
    }
    if (typeof value !== "object") return;

    if (visited.has(value)) return;
    visited.add(value);

    if (
      isBrandedBufferedAudio(value) ||
      value instanceof OnDeviceCircularAudioBuffer ||
      ArrayBuffer.isView(value) ||
      value instanceof ArrayBuffer ||
      isLikelyDirectByteArray(value, currentPath)
    ) {
      throwBufferedAudioDiagnosticsGuardError(sink, currentPath);
    }

    for (const key of Reflect.ownKeys(value)) {
      const nextPath = formatPayloadPath(currentPath, key);
      if (isAudioPayloadKey(key)) {
        throwBufferedAudioDiagnosticsGuardError(sink, nextPath);
      }
      assertSafe((value as Record<PropertyKey, unknown>)[key], nextPath);
    }
  }

  assertSafe(payload, path);
}

export function assertLogPayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): void {
  assertDiagnosticsPayloadExcludesCapturedAudio(payload, {
    ...options,
    sink: "logs",
  });
}

export function assertDebugTracePayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): void {
  assertDiagnosticsPayloadExcludesCapturedAudio(payload, {
    ...options,
    sink: "debug-traces",
  });
}

export function assertCrashReportPayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): void {
  assertDiagnosticsPayloadExcludesCapturedAudio(payload, {
    ...options,
    sink: "crash-reports",
  });
}

export function assertTelemetryPayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): void {
  assertDiagnosticsPayloadExcludesCapturedAudio(payload, {
    ...options,
    sink: "telemetry",
  });
}

export function assertAnalyticsPayloadExcludesCapturedAudio(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): void {
  assertDiagnosticsPayloadExcludesCapturedAudio(payload, {
    ...options,
    sink: "analytics",
  });
}

export const assertLogPayloadExcludesBufferedAudio =
  assertLogPayloadExcludesCapturedAudio;
export const assertDebugTracePayloadExcludesBufferedAudio =
  assertDebugTracePayloadExcludesCapturedAudio;
export const assertCrashReportPayloadExcludesBufferedAudio =
  assertCrashReportPayloadExcludesCapturedAudio;
export const assertTelemetryPayloadExcludesBufferedAudio =
  assertTelemetryPayloadExcludesCapturedAudio;
export const assertAnalyticsPayloadExcludesBufferedAudio =
  assertAnalyticsPayloadExcludesCapturedAudio;

export function createDiagnosticsSafePayload(
  payload: unknown,
  { path = "$" }: AudioDiagnosticsPayloadOptions = {},
): unknown {
  const visited = new WeakMap<object, unknown>();

  function sanitize(value: unknown, currentPath: string): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "string" && isAudioPayloadPath(currentPath)) {
      return BUFFERED_AUDIO_REDACTION_LABEL;
    }
    if (typeof value !== "object") return value;

    if (
      isBrandedBufferedAudio(value) ||
      value instanceof OnDeviceCircularAudioBuffer ||
      ArrayBuffer.isView(value) ||
      value instanceof ArrayBuffer ||
      isLikelyDirectByteArray(value, currentPath)
    ) {
      return BUFFERED_AUDIO_REDACTION_LABEL;
    }

    const existing = visited.get(value);
    if (existing !== undefined) {
      return BUFFERED_AUDIO_DIAGNOSTICS_CIRCULAR_REFERENCE_LABEL;
    }

    if (Array.isArray(value)) {
      const sanitizedArray: unknown[] = [];
      visited.set(value, sanitizedArray);
      value.forEach((item, index) => {
        sanitizedArray[index] = sanitize(item, `${currentPath}[${index}]`);
      });
      return sanitizedArray;
    }

    const sanitizedRecord: Record<PropertyKey, unknown> =
      value instanceof Error
        ? {
            name: value.name,
            message: value.message,
          }
        : {};
    if (value instanceof Error && value.stack) {
      sanitizedRecord.stack = value.stack;
    }
    visited.set(value, sanitizedRecord);

    for (const key of Reflect.ownKeys(value)) {
      const nextPath = formatPayloadPath(currentPath, key);
      if (isAudioPayloadKey(key)) {
        sanitizedRecord[key] = BUFFERED_AUDIO_REDACTION_LABEL;
        continue;
      }

      try {
        sanitizedRecord[key] = sanitize(
          (value as Record<PropertyKey, unknown>)[key],
          nextPath,
        );
      } catch {
        sanitizedRecord[key] = BUFFERED_AUDIO_DIAGNOSTICS_CIRCULAR_REFERENCE_LABEL;
      }
    }

    return sanitizedRecord;
  }

  return sanitize(payload, path);
}

export function createLogSafePayload(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): unknown {
  return createDiagnosticsSafePayload(payload, {
    ...options,
    sink: "logs",
  });
}

export function createDebugTraceSafePayload(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): unknown {
  return createDiagnosticsSafePayload(payload, {
    ...options,
    sink: "debug-traces",
  });
}

export function createCrashReportSafePayload(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): unknown {
  return createDiagnosticsSafePayload(payload, {
    ...options,
    sink: "crash-reports",
  });
}

export function createTelemetrySafePayload(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): unknown {
  return createDiagnosticsSafePayload(payload, {
    ...options,
    sink: "telemetry",
  });
}

export function createAnalyticsSafePayload(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): unknown {
  return createDiagnosticsSafePayload(payload, {
    ...options,
    sink: "analytics",
  });
}

export function createAudioSafeLogArgs(...args: unknown[]): unknown[] {
  return args.map((arg, index) =>
    createLogSafePayload(arg, { path: `$[${index}]` }),
  );
}

export function createAudioSafeDebugTraceArgs(...args: unknown[]): unknown[] {
  return args.map((arg, index) =>
    createDebugTraceSafePayload(arg, { path: `$[${index}]` }),
  );
}

export function createLogSafeJsonBody(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): string {
  return JSON.stringify(createLogSafePayload(payload, options));
}

export function createDebugTraceSafeJsonBody(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): string {
  return JSON.stringify(createDebugTraceSafePayload(payload, options));
}

export function createCrashReportSafeJsonBody(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): string {
  return JSON.stringify(createCrashReportSafePayload(payload, options));
}

export function createTelemetrySafeJsonBody(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): string {
  return JSON.stringify(createTelemetrySafePayload(payload, options));
}

export function createAnalyticsSafeJsonBody(
  payload: unknown,
  options: Omit<AudioDiagnosticsPayloadOptions, "sink"> = {},
): string {
  return JSON.stringify(createAnalyticsSafePayload(payload, options));
}

export function deriveCircularAudioBufferCapacity(
  activeAudioFormat: ActiveAudioFormat,
  durationSeconds: number,
): CircularAudioBufferCapacity {
  assertDurationSeconds(durationSeconds, "durationSeconds", {
    allowZero: false,
  });

  const normalizedFormat = normalizeActiveAudioFormat(activeAudioFormat);
  const frameSizeBytes =
    normalizedFormat.channelCount * normalizedFormat.bytesPerSample;
  assertSafeInteger(frameSizeBytes, "frameSizeBytes");

  const capacityFrames = Math.ceil(
    durationSeconds * normalizedFormat.sampleRateHz,
  );
  assertSafeInteger(capacityFrames, "capacityFrames");

  const capacityBytes = capacityFrames * frameSizeBytes;
  assertSafeInteger(capacityBytes, "capacityBytes");

  const bytesPerSecond = normalizedFormat.sampleRateHz * frameSizeBytes;
  assertSafeInteger(bytesPerSecond, "bytesPerSecond");

  return {
    capacityFrames,
    capacityBytes,
    frameSizeBytes,
    bytesPerSecond,
  };
}

export function createCircularAudioBufferConfig(
  activeAudioFormat: ActiveAudioFormat,
  overrides: Parameters<typeof createRollingAudioBufferConfig>[0] = {},
): CircularAudioBufferConfig {
  const rollingConfig = createRollingAudioBufferConfig(overrides);
  const normalizedFormat = normalizeActiveAudioFormat(activeAudioFormat);

  return {
    ...rollingConfig,
    activeAudioFormat: normalizedFormat,
    circularBufferCapacity: deriveCircularAudioBufferCapacity(
      normalizedFormat,
      rollingConfig.rollingBufferActiveDurationSeconds,
    ),
  };
}

interface TimestampedAudioChunk {
  timestampMs: number;
  startedAtMs: number;
  endedAtMs: number;
  audioBytes: Uint8Array;
}

export class OnDeviceCircularAudioBuffer {
  private config: CircularAudioBufferConfig;
  private readonly chunks!: TimestampedAudioChunk[];
  private sizeBytes = 0;

  constructor(config: CircularAudioBufferConfig) {
    const normalizedConfig = createCircularAudioBufferConfig(
      config.activeAudioFormat,
      {
        rollingBufferActiveDurationSeconds:
          config.rollingBufferActiveDurationSeconds,
      },
    );

    this.config = normalizedConfig;
    Object.defineProperty(this, "chunks", {
      value: [],
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }

  get capacityBytes(): number {
    return this.config.circularBufferCapacity.capacityBytes;
  }

  get byteLength(): number {
    return this.sizeBytes;
  }

  get bufferLocation(): typeof BUFFER_LOCATION_ON_DEVICE {
    return BUFFER_LOCATION_ON_DEVICE;
  }

  append(
    audioBytes: CircularAudioBufferInput,
    { timestampMs = Date.now() }: CircularAudioBufferAppendOptions = {},
  ): number {
    markAudioBytesAsNonPersistable(audioBytes);
    const bytes = markAudioBytesAsNonPersistable(copyAudioBytes(audioBytes));
    if (bytes.length === 0) return 0;

    const endedAtMs = normalizeAudioChunkTimestampMs(
      timestampMs,
      "timestampMs",
    );
    const startedAtMs = Math.max(
      0,
      endedAtMs - this.durationMsForByteLength(bytes.byteLength),
    );
    const chunk: TimestampedAudioChunk = {
      timestampMs: endedAtMs,
      startedAtMs,
      endedAtMs,
      audioBytes: bytes,
    };

    const insertAt = this.chunks.findIndex(
      (existingChunk) => existingChunk.endedAtMs > endedAtMs,
    );
    if (insertAt === -1) {
      this.chunks.push(chunk);
    } else {
      this.chunks.splice(insertAt, 0, chunk);
    }

    this.sizeBytes += bytes.byteLength;
    this.pruneChunksOutsideActiveRollingWindow();
    this.pruneChunksOverCapacity();

    return bytes.byteLength;
  }

  read(
    byteCount = this.sizeBytes,
    { sink = "local-memory" }: BufferedAudioReadOptions = {},
  ): Uint8Array {
    assertBufferedAudioSinkAllowed(sink);
    assertReadableByteCount(byteCount, "byteCount");

    const readableBytes = Math.min(byteCount, this.sizeBytes);
    const output = markAudioBytesAsNonPersistable(
      new Uint8Array(readableBytes),
    );
    if (readableBytes === 0) return output;

    const skipBytes = this.sizeBytes - readableBytes;
    let skippedBytes = 0;
    let writeOffset = 0;

    for (const chunk of this.chunks) {
      const chunkByteLength = chunk.audioBytes.byteLength;
      if (skippedBytes + chunkByteLength <= skipBytes) {
        skippedBytes += chunkByteLength;
        continue;
      }

      const chunkReadOffset = Math.max(0, skipBytes - skippedBytes);
      const availableBytes = chunkByteLength - chunkReadOffset;
      const copyLength = Math.min(
        availableBytes,
        readableBytes - writeOffset,
      );

      output.set(
        chunk.audioBytes.subarray(
          chunkReadOffset,
          chunkReadOffset + copyLength,
        ),
        writeOffset,
      );
      writeOffset += copyLength;
      skippedBytes += chunkByteLength;

      if (writeOffset >= readableBytes) break;
    }

    return output;
  }

  readChunks(
    { sink = "local-memory" }: BufferedAudioReadOptions = {},
  ): TimestampedAudioChunkSnapshot[] {
    assertBufferedAudioSinkAllowed(sink);

    return this.chunks.map((chunk) =>
      createTimestampedAudioChunkSnapshot(chunk),
    );
  }

  clear(): void {
    for (const chunk of this.chunks) {
      releaseAudioBytes(chunk.audioBytes);
    }
    this.chunks.length = 0;
    this.sizeBytes = 0;
  }

  updateActiveRollingBufferDurationSeconds(
    rollingBufferActiveDurationSeconds: number,
  ): CircularAudioBufferConfig {
    this.config = createCircularAudioBufferConfig(
      this.config.activeAudioFormat,
      {
        rollingBufferActiveDurationSeconds,
      },
    );
    this.pruneChunksOutsideActiveRollingWindow();
    this.pruneChunksOverCapacity();
    return this.getConfig();
  }

  pruneToActiveRollingWindow(nowMs = Date.now()): number {
    const normalizedNowMs = normalizeAudioChunkTimestampMs(nowMs, "nowMs");
    const sizeBytesBeforeEviction = this.sizeBytes;

    this.evictBufferedAudioOlderThan(
      this.getActiveRollingWindowStartMs(normalizedNowMs),
    );

    return sizeBytesBeforeEviction - this.sizeBytes;
  }

  evictExpiredUnsavedAudio(nowMs = Date.now()): number {
    return this.pruneToActiveRollingWindow(nowMs);
  }

  getConfig(): CircularAudioBufferConfig {
    return {
      ...this.config,
      activeAudioFormat: { ...this.config.activeAudioFormat },
      circularBufferCapacity: { ...this.config.circularBufferCapacity },
    };
  }

  getState(): CircularAudioBufferState {
    const oldestChunk = this.chunks[0] ?? null;
    const newestChunk = this.chunks[this.chunks.length - 1] ?? null;

    return {
      capacityBytes: this.capacityBytes,
      sizeBytes: this.sizeBytes,
      rolling_buffer_default_duration_seconds:
        this.config.rolling_buffer_default_duration_seconds,
      rolling_buffer_active_duration_seconds:
        this.config.rolling_buffer_active_duration_seconds,
      rolling_buffer_duration_seconds:
        this.config.rolling_buffer_active_duration_seconds,
      rollingBufferDefaultDurationSeconds:
        this.config.rollingBufferDefaultDurationSeconds,
      rollingBufferActiveDurationSeconds:
        this.config.rollingBufferActiveDurationSeconds,
      rollingBufferDurationSeconds:
        this.config.rollingBufferActiveDurationSeconds,
      availableDurationSeconds:
        this.sizeBytes / this.config.circularBufferCapacity.bytesPerSecond,
      chunkCount: this.chunks.length,
      oldestChunkTimestampMs: oldestChunk?.timestampMs ?? null,
      newestChunkTimestampMs: newestChunk?.timestampMs ?? null,
      oldestRetainedAudioTimestampMs: oldestChunk?.startedAtMs ?? null,
      newestRetainedAudioTimestampMs: newestChunk?.endedAtMs ?? null,
      bufferLocation: BUFFER_LOCATION_ON_DEVICE,
      bufferStorageKind: AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
      persistenceSafeguards: getBufferedAudioPersistenceSafeguards(),
    };
  }

  toJSON(): CircularAudioBufferState {
    return this.getState();
  }

  [NODE_INSPECT_CUSTOM](): CircularAudioBufferState {
    return this.getState();
  }

  toString(): string {
    return BUFFERED_AUDIO_REDACTION_LABEL;
  }

  private pruneChunksOutsideActiveRollingWindow(): void {
    const newestTimestampMs = this.chunks.reduce(
      (newest, chunk) => Math.max(newest, chunk.endedAtMs),
      0,
    );

    this.evictBufferedAudioOlderThan(
      this.getActiveRollingWindowStartMs(newestTimestampMs),
    );
  }

  private getActiveRollingWindowStartMs(anchorTimestampMs: number): number {
    return (
      anchorTimestampMs -
      this.config.rollingBufferActiveDurationSeconds *
        MILLISECONDS_PER_SECOND
    );
  }

  private evictBufferedAudioOlderThan(timestampMs: number): void {
    while (
      this.chunks.length > 0 &&
      this.chunks[0].endedAtMs <= timestampMs
    ) {
      this.removeOldestChunk();
    }

    if (
      this.chunks.length > 0 &&
      this.chunks[0].startedAtMs < timestampMs
    ) {
      this.trimOldestChunkBefore(timestampMs);
    }
  }

  private pruneChunksOverCapacity(): void {
    while (this.sizeBytes > this.capacityBytes && this.chunks.length > 0) {
      const overflowBytes = this.sizeBytes - this.capacityBytes;
      const oldestChunk = this.chunks[0];
      if (overflowBytes >= oldestChunk.audioBytes.byteLength) {
        this.removeOldestChunk();
        continue;
      }

      this.trimOldestChunkByByteCount(overflowBytes);
    }
  }

  private removeOldestChunk(): void {
    const [oldestChunk] = this.chunks.splice(0, 1);
    if (!oldestChunk) return;

    this.sizeBytes -= oldestChunk.audioBytes.byteLength;
    releaseAudioBytes(oldestChunk.audioBytes);
  }

  private trimOldestChunkBefore(timestampMs: number): void {
    const oldestChunk = this.chunks[0];
    if (!oldestChunk) return;

    const durationToTrimMs = timestampMs - oldestChunk.startedAtMs;
    if (durationToTrimMs <= 0) return;

    const rawBytesToTrim =
      (durationToTrimMs / 1000) *
      this.config.circularBufferCapacity.bytesPerSecond;
    const bytesToTrim = Math.min(
      oldestChunk.audioBytes.byteLength,
      this.ceilToFrameByteCount(rawBytesToTrim),
    );

    this.trimOldestChunkByByteCount(bytesToTrim);
  }

  private trimOldestChunkByByteCount(byteCount: number): void {
    const oldestChunk = this.chunks[0];
    if (!oldestChunk || byteCount <= 0) return;

    const bytesToTrim = Math.min(
      oldestChunk.audioBytes.byteLength,
      this.ceilToFrameByteCount(byteCount),
    );

    if (bytesToTrim >= oldestChunk.audioBytes.byteLength) {
      this.removeOldestChunk();
      return;
    }

    const retainedBytes = markAudioBytesAsNonPersistable(
      oldestChunk.audioBytes.slice(bytesToTrim),
    );
    releaseAudioBytes(oldestChunk.audioBytes);

    oldestChunk.audioBytes = retainedBytes;
    oldestChunk.startedAtMs = Math.max(
      0,
      oldestChunk.endedAtMs -
        this.durationMsForByteLength(retainedBytes.byteLength),
    );
    this.sizeBytes -= bytesToTrim;
  }

  private durationMsForByteLength(byteLength: number): number {
    return (
      (byteLength / this.config.circularBufferCapacity.bytesPerSecond) * 1000
    );
  }

  private ceilToFrameByteCount(byteCount: number): number {
    const frameSizeBytes =
      this.config.circularBufferCapacity.frameSizeBytes;
    if (byteCount <= 0) return 0;

    return Math.ceil(byteCount / frameSizeBytes) * frameSizeBytes;
  }
}

export function createOnDeviceCircularAudioBuffer(
  activeAudioFormatOrConfig: ActiveAudioFormat | CircularAudioBufferConfig,
  overrides: Parameters<typeof createRollingAudioBufferConfig>[0] = {},
): OnDeviceCircularAudioBuffer {
  const config = isCircularAudioBufferConfig(activeAudioFormatOrConfig)
    ? activeAudioFormatOrConfig
    : createCircularAudioBufferConfig(activeAudioFormatOrConfig, overrides);

  return new OnDeviceCircularAudioBuffer(config);
}

export function appendCapturedFrameToCircularBuffer<TFrame extends object>(
  buffer: OnDeviceCircularAudioBuffer,
  frame: CapturedAudioFrame<TFrame>,
): TFrame {
  try {
    const appendedByteCount = buffer.append(frame.audioBytes, {
      timestampMs: (frame as { timestampMs?: number }).timestampMs,
    });
    if (appendedByteCount === 0) {
      throw new Error("captured audio frame must include at least one byte");
    }

    return stripCapturedAudioBytes(frame);
  } finally {
    releaseCapturedAudioFrame(frame);
  }
}

function createTimestampedAudioChunkSnapshot(
  chunk: TimestampedAudioChunk,
): TimestampedAudioChunkSnapshot {
  const snapshot = {
    timestampMs: chunk.timestampMs,
    startedAtMs: chunk.startedAtMs,
    endedAtMs: chunk.endedAtMs,
    byteLength: chunk.audioBytes.byteLength,
  } as TimestampedAudioChunkSnapshot;

  Object.defineProperty(snapshot, "audioBytes", {
    value: createNonPersistableAudioBytes(chunk.audioBytes),
    enumerable: false,
    writable: false,
    configurable: true,
  });

  return Object.freeze(snapshot);
}

function copyAudioBytes(audioBytes: CircularAudioBufferInput): Uint8Array {
  return new Uint8Array(normalizeAudioBytes(audioBytes));
}

function releaseAudioBytes(
  audioBytes: CircularAudioBufferInput | undefined,
): void {
  if (audioBytes === undefined) return;

  try {
    if (audioBytes instanceof ArrayBuffer) {
      new Uint8Array(audioBytes).fill(0);
      return;
    }

    if (ArrayBuffer.isView(audioBytes)) {
      new Uint8Array(
        audioBytes.buffer,
        audioBytes.byteOffset,
        audioBytes.byteLength,
      ).fill(0);
      return;
    }

    if (Array.isArray(audioBytes)) {
      for (let index = 0; index < audioBytes.length; index += 1) {
        (audioBytes as number[])[index] = 0;
      }
    }
  } catch {
    // Best-effort release; immutable host-owned buffers may not be writable.
  }
}

function defineRedactionMethod(target: object, key: PropertyKey): void {
  try {
    Object.defineProperty(target, key, {
      value: () => BUFFERED_AUDIO_REDACTION_LABEL,
      enumerable: false,
      configurable: true,
    });
  } catch {
    // Frozen platform-owned buffers still stay inside the in-memory buffer path.
  }
}

function defineBufferedAudioBrand(target: object): void {
  try {
    Object.defineProperty(target, NON_PERSISTABLE_BUFFERED_AUDIO, {
      value: true,
      enumerable: false,
      configurable: true,
    });
  } catch {
    // Frozen platform-owned buffers are still caught when carried under audio keys.
  }
}

function isBrandedBufferedAudio(value: object): boolean {
  return (
    (value as Record<PropertyKey, unknown>)[NON_PERSISTABLE_BUFFERED_AUDIO] ===
    true
  );
}

function isAudioPayloadKey(key: PropertyKey): boolean {
  return typeof key === "string" && AUDIO_PAYLOAD_KEY_PATTERN.test(key);
}

function isAudioPayloadPath(path: string): boolean {
  const dotPathMatch = /\.([A-Za-z_$][\w$]*)$/.exec(path);
  if (dotPathMatch) return isAudioPayloadKey(dotPathMatch[1]);

  const bracketPathMatch = /\[(".*")\]$/.exec(path);
  if (!bracketPathMatch) return false;

  try {
    return isAudioPayloadKey(JSON.parse(bracketPathMatch[1]));
  } catch {
    return false;
  }
}

function isLikelyDirectByteArray(value: object, path: string): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (
    path !== "$" &&
    !/^\$\[\d+\]$/.test(path) &&
    !isAudioPayloadPath(path)
  ) {
    return false;
  }

  return value.every(
    (item) => Number.isSafeInteger(item) && item >= 0 && item <= 255,
  );
}

function formatPayloadPath(parentPath: string, key: PropertyKey): string {
  if (typeof key === "symbol") return `${parentPath}[${String(key)}]`;
  const stringKey = String(key);
  if (/^[A-Za-z_$][\w$]*$/.test(stringKey)) {
    return `${parentPath}.${stringKey}`;
  }
  return `${parentPath}[${JSON.stringify(stringKey)}]`;
}

function throwBufferedAudioNetworkGuardError(path: string): never {
  throw new Error(`${BUFFERED_AUDIO_NETWORK_GUARD_ERROR}: ${path}`);
}

function throwBufferedAudioDiagnosticsGuardError(
  sink: AudioDiagnosticsSink,
  path: string,
): never {
  throw new Error(`${BUFFERED_AUDIO_DIAGNOSTICS_GUARD_ERROR}: ${sink} ${path}`);
}

function normalizeCapturedAudioNonSaveRetentionSurface(
  surface: CapturedAudioNonSaveRetentionSurface,
): CapturedAudioNonSaveRetentionSurface {
  if (
    !(
      CAPTURED_AUDIO_NON_SAVE_RETENTION_SURFACES as readonly string[]
    ).includes(surface)
  ) {
    throw new Error(`unknown captured audio retention surface: ${surface}`);
  }

  return surface;
}

function throwCapturedAudioNonSaveRetentionGuardError(
  surface: CapturedAudioNonSaveRetentionSurface,
  path: string,
): never {
  throw new Error(
    `${CAPTURED_AUDIO_NON_SAVE_RETENTION_GUARD_ERROR}: ${surface} ${path}`,
  );
}

function normalizeApprovedAudioSaveAction(
  value: unknown,
): ApprovedAudioSaveAction {
  const actionRecord = requireApprovedAudioSaveActionRecord(
    value,
    "saveAction",
  );
  if (actionRecord.kind !== APPROVED_AUDIO_SAVE_ACTION_KIND) {
    throwApprovedAudioSaveActionContractError(
      `saveAction.kind must be ${APPROVED_AUDIO_SAVE_ACTION_KIND}`,
    );
  }

  return Object.freeze({
    kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    request: createApprovedAudioSaveRequest(
      actionRecord.request as ApprovedAudioSaveRequestInput,
    ),
  }) as ApprovedAudioSaveAction;
}

function requireApprovedAudioSaveActionRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwApprovedAudioSaveActionContractError(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function normalizeApprovedAudioClipSaveAuthorization(
  input: Pick<ApprovedAudioClipSaveInput, "saveAction" | "saveAuthorization">,
): {
  saveAction: ApprovedAudioSaveAction;
  saveAuthorization: ApprovedAudioSaveAuthorization;
} {
  const normalizedSaveAction = normalizeApprovedAudioSaveAction(
    input.saveAction,
  );
  const normalizedSaveAuthorization = normalizeApprovedAudioSaveAuthorization(
    input.saveAuthorization,
    normalizedSaveAction.request,
  );

  return {
    saveAction: normalizedSaveAction,
    saveAuthorization: normalizedSaveAuthorization,
  };
}

function normalizeDurableApprovedAudioClipWrite(
  value: unknown,
): SavedApprovedAudioClip {
  const clipRecord = requireDurableApprovedAudioClipWriteRecord(
    value,
    "durableAudioClip",
  );
  normalizeRequiredAudioSaveLiteral(
    clipRecord.recordSchemaVersion,
    SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
    "durableAudioClip.recordSchemaVersion",
  );
  const clipId = normalizeApprovedAudioClipId(
    clipRecord.clipId,
    "durableAudioClip.clipId",
  );
  const savedAtMs = normalizeAudioSaveTimestampMs(
    clipRecord.savedAtMs,
    "durableAudioClip.savedAtMs",
  );
  const byteLength = normalizeDurableApprovedAudioClipByteLength(
    clipRecord.byteLength,
    "durableAudioClip.byteLength",
  );
  const request = createApprovedAudioSaveRequest({
    capturedAudioSaveIntent:
      clipRecord.capturedAudioSaveIntent as typeof CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind:
      clipRecord.saveActionKind as typeof APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: clipRecord.approvedVoiceMatch as ApprovedAudioSaveVoiceMatch,
    approvedUserIdentity:
      clipRecord.approvedUserIdentity as ApprovedAudioSaveUserIdentity,
    userVisiblePurpose: clipRecord.userVisiblePurpose as string,
    purposeMetadata:
      clipRecord.purposeMetadata as ApprovedAudioSavePurposeMetadata,
    retentionMetadata:
      clipRecord.retentionMetadata as ApprovedAudioRetentionMetadata,
  });
  const ownerIdentity = normalizeApprovedAudioSaveUserIdentity(
    clipRecord.ownerIdentity,
    "durableAudioClip.ownerIdentity",
  );
  const retentionTimestampMs = normalizeAudioSaveTimestampMs(
    clipRecord.retentionTimestampMs,
    "durableAudioClip.retentionTimestampMs",
  );
  const retentionPurposeMetadata = normalizeApprovedAudioSavePurposeMetadata(
    clipRecord.retentionPurposeMetadata,
    request.userVisiblePurpose,
    request.retentionMetadata.requestedAtMs,
  );
  const userVisibleMetadata = normalizeSavedApprovedAudioUserVisibleMetadata(
    clipRecord.userVisibleMetadata,
    "durableAudioClip.userVisibleMetadata",
  );
  const storageLocation = normalizeRequiredAudioSaveLiteral(
    clipRecord.storageLocation,
    BUFFER_LOCATION_ON_DEVICE,
    "durableAudioClip.storageLocation",
  );
  const retentionPolicy = normalizeRequiredAudioSaveLiteral(
    clipRecord.retentionPolicy,
    AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    "durableAudioClip.retentionPolicy",
  );

  if (!Object.prototype.hasOwnProperty.call(clipRecord, "audioBytes")) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.audioBytes must contain approved speech audio",
    );
  }

  const audioBytes = normalizeDurableApprovedAudioClipBytes(
    clipRecord.audioBytes,
  );

  if (audioBytes.byteLength === 0) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.audioBytes must contain approved speech audio",
    );
  }

  if (byteLength !== audioBytes.byteLength) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.byteLength must match durableAudioClip.audioBytes.byteLength",
    );
  }

  if (
    savedAtMs < request.retentionMetadata.requestedAtMs ||
    savedAtMs > request.retentionMetadata.expiresAtMs
  ) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.savedAtMs must be inside the declared retention window",
    );
  }

  if (storageLocation !== request.retentionMetadata.storageLocation) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.storageLocation must match retentionMetadata.storageLocation",
    );
  }

  if (retentionPolicy !== request.retentionMetadata.retentionPolicy) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.retentionPolicy must match retentionMetadata.retentionPolicy",
    );
  }

  assertApprovedAudioOwnerIdentityMatchesSaveIdentity(
    ownerIdentity,
    request.approvedUserIdentity,
    "durableAudioClip.ownerIdentity",
  );

  if (retentionTimestampMs !== request.retentionMetadata.requestedAtMs) {
    throwDurableApprovedAudioStorageContractError(
      "durableAudioClip.retentionTimestampMs must match retentionMetadata.requestedAtMs",
    );
  }

  assertRetentionPurposeMetadataMatchesPurposeMetadata(
    retentionPurposeMetadata,
    request.purposeMetadata,
    "durableAudioClip.retentionPurposeMetadata",
  );
  assertUserVisibleMetadataMatchesPurposeMetadata(
    userVisibleMetadata,
    request.purposeMetadata,
    "durableAudioClip.userVisibleMetadata",
  );

  return value as SavedApprovedAudioClip;
}

function requireDurableApprovedAudioClipWriteRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwDurableApprovedAudioStorageContractError(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function normalizeDurableApprovedAudioClipBytes(value: unknown): Uint8Array {
  try {
    return normalizeAudioBytes(value as CircularAudioBufferInput);
  } catch (error) {
    throwDurableApprovedAudioStorageContractError(
      `durableAudioClip.audioBytes must be local captured audio bytes: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function normalizeDurableApprovedAudioClipByteLength(
  value: unknown,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throwDurableApprovedAudioStorageContractError(
      `${path} must be a positive integer`,
    );
  }

  return value;
}

function createBrandedApprovedAudioSaveAuthorization(
  request: ApprovedAudioSaveRequest,
  authorizedAtMs = request.retentionMetadata.requestedAtMs,
): ApprovedAudioSaveAuthorization {
  const normalizedAuthorizedAtMs = normalizeAudioSaveTimestampMs(
    authorizedAtMs,
    "saveAuthorization.authorizedAtMs",
  );

  if (normalizedAuthorizedAtMs < request.retentionMetadata.requestedAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.authorizedAtMs must be at or after retentionMetadata.requestedAtMs",
    );
  }

  if (normalizedAuthorizedAtMs >= request.retentionMetadata.expiresAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.authorizedAtMs must be before retentionMetadata.expiresAtMs",
    );
  }

  const authorization = {
    kind: APPROVED_AUDIO_SAVE_AUTHORIZATION_KIND,
    authorized: true,
    capturedAudioSaveIntent: request.capturedAudioSaveIntent,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceId: request.approvedUserIdentity.approvedVoiceId,
    matchedVoiceId: request.approvedVoiceMatch.matchedVoiceId,
    userVisiblePurpose: request.userVisiblePurpose,
    purposeKind: request.purposeMetadata.kind,
    purposeRequestedAtMs: request.purposeMetadata.requestedAtMs,
    storageLocation: request.retentionMetadata.storageLocation,
    retentionPolicy: request.retentionMetadata.retentionPolicy,
    requestedAtMs: request.retentionMetadata.requestedAtMs,
    expiresAtMs: request.retentionMetadata.expiresAtMs,
    authorizedAtMs: normalizedAuthorizedAtMs,
  } as ApprovedAudioSaveAuthorization;

  Object.defineProperty(authorization, APPROVED_AUDIO_SAVE_AUTHORIZATION_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  return Object.freeze(authorization) as ApprovedAudioSaveAuthorization;
}

function normalizeApprovedAudioSaveAuthorization(
  value: unknown,
  request: ApprovedAudioSaveRequest,
): ApprovedAudioSaveAuthorization {
  const authorizationRecord = requireApprovedAudioSaveAuthorizationRecord(
    value,
    "saveAuthorization",
  );

  if (
    authorizationRecord[APPROVED_AUDIO_SAVE_AUTHORIZATION_BRAND] !== true
  ) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization must be created by createApprovedAudioSaveAuthorization",
    );
  }

  normalizeRequiredAudioSaveLiteral(
    authorizationRecord.kind,
    APPROVED_AUDIO_SAVE_AUTHORIZATION_KIND,
    "saveAuthorization.kind",
  );
  if (authorizationRecord.authorized !== true) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.authorized must be true",
    );
  }

  normalizeRequiredAudioSaveLiteral(
    authorizationRecord.capturedAudioSaveIntent,
    CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    "saveAuthorization.capturedAudioSaveIntent",
  );
  normalizeRequiredAudioSaveLiteral(
    authorizationRecord.saveActionKind,
    APPROVED_AUDIO_SAVE_ACTION_KIND,
    "saveAuthorization.saveActionKind",
  );
  const approvedVoiceId = normalizeRequiredAudioSaveString(
    authorizationRecord.approvedVoiceId,
    "saveAuthorization.approvedVoiceId",
  );
  const matchedVoiceId = normalizeRequiredAudioSaveString(
    authorizationRecord.matchedVoiceId,
    "saveAuthorization.matchedVoiceId",
  );
  const userVisiblePurpose = normalizeRequiredAudioSaveString(
    authorizationRecord.userVisiblePurpose,
    "saveAuthorization.userVisiblePurpose",
  );
  const purposeKind = normalizeRequiredAudioSaveLiteral(
    authorizationRecord.purposeKind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    "saveAuthorization.purposeKind",
  );
  const purposeRequestedAtMs = normalizeAudioSaveTimestampMs(
    authorizationRecord.purposeRequestedAtMs,
    "saveAuthorization.purposeRequestedAtMs",
  );
  normalizeRequiredAudioSaveLiteral(
    authorizationRecord.storageLocation,
    BUFFER_LOCATION_ON_DEVICE,
    "saveAuthorization.storageLocation",
  );
  normalizeRequiredAudioSaveLiteral(
    authorizationRecord.retentionPolicy,
    AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    "saveAuthorization.retentionPolicy",
  );
  const requestedAtMs = normalizeAudioSaveTimestampMs(
    authorizationRecord.requestedAtMs,
    "saveAuthorization.requestedAtMs",
  );
  const expiresAtMs = normalizeAudioSaveTimestampMs(
    authorizationRecord.expiresAtMs,
    "saveAuthorization.expiresAtMs",
  );
  const authorizedAtMs = normalizeAudioSaveTimestampMs(
    authorizationRecord.authorizedAtMs,
    "saveAuthorization.authorizedAtMs",
  );

  if (approvedVoiceId !== request.approvedUserIdentity.approvedVoiceId) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.approvedVoiceId must match approvedUserIdentity.approvedVoiceId",
    );
  }

  if (matchedVoiceId !== request.approvedVoiceMatch.matchedVoiceId) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.matchedVoiceId must match approvedVoiceMatch.matchedVoiceId",
    );
  }

  if (userVisiblePurpose !== request.userVisiblePurpose) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.userVisiblePurpose must match the explicit save request",
    );
  }

  if (purposeKind !== request.purposeMetadata.kind) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.purposeKind must match purposeMetadata.kind",
    );
  }

  if (purposeRequestedAtMs !== request.purposeMetadata.requestedAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.purposeRequestedAtMs must match purposeMetadata.requestedAtMs",
    );
  }

  if (requestedAtMs !== request.retentionMetadata.requestedAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.requestedAtMs must match retentionMetadata.requestedAtMs",
    );
  }

  if (expiresAtMs !== request.retentionMetadata.expiresAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.expiresAtMs must match retentionMetadata.expiresAtMs",
    );
  }

  if (authorizedAtMs < requestedAtMs || authorizedAtMs >= expiresAtMs) {
    throwApprovedAudioSaveAuthorizationContractError(
      "saveAuthorization.authorizedAtMs must be inside the retention window",
    );
  }

  return createBrandedApprovedAudioSaveAuthorization(request, authorizedAtMs);
}

function requireApprovedAudioSaveAuthorizationRecord(
  value: unknown,
  path: string,
): Record<PropertyKey, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwApprovedAudioSaveAuthorizationContractError(
      `${path} must be an object`,
    );
  }

  return value as Record<PropertyKey, unknown>;
}

function createSavedApprovedAudioClip({
  clipId,
  audioBytes,
  savedAtMs,
  request,
}: {
  clipId: string;
  audioBytes: CircularAudioBufferInput;
  savedAtMs: number;
  request: ApprovedAudioSaveRequest;
}): SavedApprovedAudioClip {
  const localAudioBytes = markAudioBytesAsNonPersistable(
    copyAudioBytes(audioBytes),
  );
  const savedClip = {
    recordSchemaVersion: SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
    clipId: normalizeApprovedAudioClipId(clipId, "clipId"),
    byteLength: localAudioBytes.byteLength,
    savedAtMs,
    capturedAudioSaveIntent: request.capturedAudioSaveIntent,
    saveActionKind: request.saveActionKind,
    approvedVoiceMatch: request.approvedVoiceMatch,
    approvedUserIdentity: request.approvedUserIdentity,
    ownerIdentity: request.approvedUserIdentity,
    userVisiblePurpose: request.userVisiblePurpose,
    userVisibleMetadata: createSavedApprovedAudioUserVisibleMetadata(
      request.purposeMetadata,
    ),
    purposeMetadata: request.purposeMetadata,
    retentionPurposeMetadata: request.purposeMetadata,
    retentionMetadata: request.retentionMetadata,
    retentionTimestampMs: request.retentionMetadata.requestedAtMs,
    storageLocation: BUFFER_LOCATION_ON_DEVICE,
    retentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  } as SavedApprovedAudioClip;

  Object.defineProperty(savedClip, "audioBytes", {
    value: localAudioBytes,
    enumerable: false,
    writable: false,
    configurable: true,
  });

  return Object.freeze(savedClip);
}

function cloneSavedApprovedAudioClip(
  clip: SavedApprovedAudioClip,
): SavedApprovedAudioClip {
  return createSavedApprovedAudioClip({
    clipId: clip.clipId,
    audioBytes: clip.audioBytes,
    savedAtMs: clip.savedAtMs,
    request: createApprovedAudioSaveRequest({
      capturedAudioSaveIntent: clip.capturedAudioSaveIntent,
      saveActionKind: clip.saveActionKind,
      approvedVoiceMatch: clip.approvedVoiceMatch,
      approvedUserIdentity: clip.approvedUserIdentity,
      userVisiblePurpose: clip.userVisiblePurpose,
      purposeMetadata: clip.purposeMetadata,
      retentionMetadata: clip.retentionMetadata,
    }),
  });
}

function freezeSavedAudioRecordViews(
  records: SavedApprovedAudioRecordView[],
): readonly SavedApprovedAudioRecordView[] {
  return Object.freeze([...records]);
}

function normalizeApprovedAudioExportUserId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "saved approved audio user export requires an approvedUserId",
    );
  }

  return value.trim();
}

function normalizeApprovedAudioExportTimestamp(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "saved approved audio export timestamp must be a non-negative safe integer",
    );
  }

  return value;
}

function createDefaultApprovedAudioClipId(
  approvedVoiceId: string,
  savedAtMs: number,
): string {
  const safeVoiceId = approvedVoiceId
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `approved-audio-${safeVoiceId || "voice"}-${savedAtMs}`;
}

function normalizeApprovedAudioClipId(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwApprovedAudioClipStoreContractError(
      `${path} must be a non-empty string`,
    );
  }

  return value.trim();
}

function normalizeSavedAudioRecordByteLength(
  value: unknown,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throwApprovedAudioClipStoreContractError(
      `${path} must be a positive integer`,
    );
  }

  return value;
}

function normalizeApprovedAudioSaveUserIdentity(
  value: unknown,
  path = "approvedUserIdentity",
): ApprovedAudioSaveUserIdentity {
  const identityRecord = requireAudioSaveRequestRecord(
    value,
    path,
  );
  const approvedVoiceId = normalizeRequiredAudioSaveString(
    identityRecord.approvedVoiceId,
    `${path}.approvedVoiceId`,
  );
  const identity: ApprovedAudioSaveUserIdentity = {
    approvedVoiceId,
  };

  if (identityRecord.approvedUserId !== undefined) {
    identity.approvedUserId = normalizeRequiredAudioSaveString(
      identityRecord.approvedUserId,
      `${path}.approvedUserId`,
    );
  }

  if (identityRecord.displayName !== undefined) {
    identity.displayName = normalizeRequiredAudioSaveString(
      identityRecord.displayName,
      `${path}.displayName`,
    );
  }

  return Object.freeze(identity) as ApprovedAudioSaveUserIdentity;
}

function assertSavedAudioRecordOwnerIdentityMatchesSaveIdentity(
  ownerIdentity: ApprovedAudioOwnerIdentity,
  approvedUserIdentity: ApprovedAudioSaveUserIdentity,
  path: string,
): void {
  if (
    ownerIdentity.approvedVoiceId !== approvedUserIdentity.approvedVoiceId ||
    ownerIdentity.approvedUserId !== approvedUserIdentity.approvedUserId ||
    ownerIdentity.displayName !== approvedUserIdentity.displayName
  ) {
    throwApprovedAudioClipStoreContractError(
      `${path} must match approvedUserIdentity`,
    );
  }
}

function assertApprovedAudioOwnerIdentityMatchesSaveIdentity(
  ownerIdentity: ApprovedAudioOwnerIdentity,
  approvedUserIdentity: ApprovedAudioSaveUserIdentity,
  path: string,
): void {
  if (
    ownerIdentity.approvedVoiceId !== approvedUserIdentity.approvedVoiceId ||
    ownerIdentity.approvedUserId !== approvedUserIdentity.approvedUserId ||
    ownerIdentity.displayName !== approvedUserIdentity.displayName
  ) {
    throwDurableApprovedAudioStorageContractError(
      `${path} must match approvedUserIdentity`,
    );
  }
}

function normalizeApprovedAudioSaveVoiceMatch(
  value: unknown,
  approvedVoiceId: string,
): ApprovedAudioSaveVoiceMatch {
  const matchRecord = requireAudioSaveRequestRecord(
    value,
    "approvedVoiceMatch",
  );

  if (matchRecord.accepted !== true) {
    throwAudioSaveRequestContractError(
      "approvedVoiceMatch.accepted must be true",
    );
  }

  const matchedVoiceId = normalizeRequiredAudioSaveString(
    matchRecord.matchedVoiceId,
    "approvedVoiceMatch.matchedVoiceId",
  );
  if (matchedVoiceId !== approvedVoiceId) {
    throwAudioSaveRequestContractError(
      "approvedVoiceMatch.matchedVoiceId must match approvedUserIdentity.approvedVoiceId",
    );
  }

  const matchedApprovedVoiceProfileId =
    matchRecord.matchedApprovedVoiceProfileId === undefined
      ? undefined
      : normalizeRequiredAudioSaveString(
          matchRecord.matchedApprovedVoiceProfileId,
          "approvedVoiceMatch.matchedApprovedVoiceProfileId",
        );
  const matchedApprovedVoiceLabel =
    matchRecord.matchedApprovedVoiceLabel === undefined
      ? undefined
      : normalizeRequiredAudioSaveString(
          matchRecord.matchedApprovedVoiceLabel,
          "approvedVoiceMatch.matchedApprovedVoiceLabel",
        );
  const matchedApprovedVoiceProfileMetadata =
    normalizeApprovedAudioSaveVoiceMatchProfileMetadata(
      matchRecord.matchedApprovedVoiceProfileMetadata,
      matchedVoiceId,
      matchedApprovedVoiceProfileId,
      matchedApprovedVoiceLabel,
    );
  const resolvedMatchedApprovedVoiceProfileId =
    matchedApprovedVoiceProfileId ??
    matchedApprovedVoiceProfileMetadata?.profileId;
  const resolvedMatchedApprovedVoiceLabel =
    matchedApprovedVoiceLabel ??
    matchedApprovedVoiceProfileMetadata?.label ??
    resolvedMatchedApprovedVoiceProfileId;
  const confidence = normalizeApprovedVoiceMatchConfidence(
    matchRecord.confidence,
    "approvedVoiceMatch.confidence",
  );
  const recognizedAtMs = normalizeAudioSaveTimestampMs(
    matchRecord.recognizedAtMs,
    "approvedVoiceMatch.recognizedAtMs",
  );
  const recognitionLatencyMs = normalizeApprovedVoiceMatchLatencyMs(
    matchRecord.recognitionLatencyMs,
    "approvedVoiceMatch.recognitionLatencyMs",
  );
  const match: ApprovedAudioSaveVoiceMatch = {
    accepted: true,
    matchedVoiceId,
    confidence,
    recognizedAtMs,
    recognitionLatencyMs,
  };

  if (resolvedMatchedApprovedVoiceProfileId) {
    match.matchedApprovedVoiceProfileId =
      resolvedMatchedApprovedVoiceProfileId;
  }

  if (resolvedMatchedApprovedVoiceLabel) {
    match.matchedApprovedVoiceLabel = resolvedMatchedApprovedVoiceLabel;
  }

  if (matchedApprovedVoiceProfileMetadata) {
    match.matchedApprovedVoiceProfileMetadata =
      matchedApprovedVoiceProfileMetadata;
  }

  if (matchRecord.reason !== undefined) {
    match.reason = normalizeRequiredAudioSaveString(
      matchRecord.reason,
      "approvedVoiceMatch.reason",
    );
  }

  return Object.freeze(match) as ApprovedAudioSaveVoiceMatch;
}

function normalizeApprovedAudioSaveVoiceMatchProfileMetadata(
  value: unknown,
  matchedVoiceId: string,
  matchedApprovedVoiceProfileId?: string,
  matchedApprovedVoiceLabel?: string,
): ApprovedAudioSaveVoiceMatchProfileMetadata | undefined {
  if (value === undefined || value === null) return undefined;

  const metadataRecord = requireAudioSaveRequestRecord(
    value,
    "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata",
  );
  const id = normalizeRequiredAudioSaveString(
    metadataRecord.id,
    "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.id",
  );
  const identityId = normalizeRequiredAudioSaveString(
    metadataRecord.identityId,
    "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.identityId",
  );
  const profileId = normalizeRequiredAudioSaveString(
    metadataRecord.profileId,
    "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.profileId",
  );
  const label = normalizeRequiredAudioSaveString(
    metadataRecord.label,
    "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.label",
  );
  const displayName =
    metadataRecord.displayName === undefined ||
    metadataRecord.displayName === null
      ? null
      : normalizeRequiredAudioSaveString(
          metadataRecord.displayName,
          "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.displayName",
        );
  const approvalState =
    metadataRecord.approvalState === undefined
      ? "approved"
      : normalizeRequiredAudioSaveString(
          metadataRecord.approvalState,
          "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata.approvalState",
        );

  if (
    id !== matchedVoiceId ||
    identityId !== matchedVoiceId ||
    (matchedApprovedVoiceProfileId !== undefined &&
      profileId !== matchedApprovedVoiceProfileId) ||
    (matchedApprovedVoiceLabel !== undefined &&
      label !== matchedApprovedVoiceLabel) ||
    metadataRecord.approved !== true ||
    metadataRecord.enrolled !== true
  ) {
    throwAudioSaveRequestContractError(
      "approvedVoiceMatch.matchedApprovedVoiceProfileMetadata must describe the matched approved voice profile",
    );
  }

  return Object.freeze({
    id,
    identityId,
    profileId,
    displayName,
    label,
    approvalState,
    approved: true,
    enrolled: true,
  }) as ApprovedAudioSaveVoiceMatchProfileMetadata;
}

function normalizeApprovedAudioRetentionMetadata(
  value: unknown,
): ApprovedAudioRetentionMetadata {
  const metadataRecord = requireAudioSaveRequestRecord(
    value,
    "retentionMetadata",
  );
  const requestedAtMs = normalizeAudioSaveTimestampMs(
    metadataRecord.requestedAtMs,
    "retentionMetadata.requestedAtMs",
  );
  const retentionDurationSeconds = normalizeAudioSaveDurationSeconds(
    metadataRecord.retentionDurationSeconds,
    "retentionMetadata.retentionDurationSeconds",
  );
  const expiresAtMs = normalizeAudioSaveTimestampMs(
    metadataRecord.expiresAtMs,
    "retentionMetadata.expiresAtMs",
  );
  const storageLocation = normalizeRequiredAudioSaveLiteral(
    metadataRecord.storageLocation,
    BUFFER_LOCATION_ON_DEVICE,
    "retentionMetadata.storageLocation",
  );
  const retentionPolicy = normalizeRequiredAudioSaveLiteral(
    metadataRecord.retentionPolicy,
    AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    "retentionMetadata.retentionPolicy",
  );

  if (expiresAtMs <= requestedAtMs) {
    throwAudioSaveRequestContractError(
      "retentionMetadata.expiresAtMs must be after retentionMetadata.requestedAtMs",
    );
  }

  if (expiresAtMs - requestedAtMs > retentionDurationSeconds * 1000) {
    throwAudioSaveRequestContractError(
      "retentionMetadata.expiresAtMs exceeds retentionMetadata.retentionDurationSeconds",
    );
  }

  return Object.freeze({
    requestedAtMs,
    retentionDurationSeconds,
    expiresAtMs,
    storageLocation,
    retentionPolicy,
  }) as ApprovedAudioRetentionMetadata;
}

function normalizeApprovedAudioSavePurposeMetadata(
  value: unknown,
  userVisiblePurpose: string,
  requestedAtMs: number,
): ApprovedAudioSavePurposeMetadata {
  const metadataRecord = requireAudioSaveRequestRecord(
    value,
    "purposeMetadata",
  );
  const kind = normalizeRequiredAudioSaveLiteral(
    metadataRecord.kind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    "purposeMetadata.kind",
  );
  const metadataPurpose = normalizeUserVisibleLaterUsePurpose(
    metadataRecord.userVisiblePurpose,
    "purposeMetadata.userVisiblePurpose",
  );
  const metadataRequestedAtMs = normalizeAudioSaveTimestampMs(
    metadataRecord.requestedAtMs,
    "purposeMetadata.requestedAtMs",
  );

  if (metadataPurpose !== userVisiblePurpose) {
    throwAudioSaveRequestContractError(
      "purposeMetadata.userVisiblePurpose must match userVisiblePurpose",
    );
  }

  if (metadataRequestedAtMs !== requestedAtMs) {
    throwAudioSaveRequestContractError(
      "purposeMetadata.requestedAtMs must match retentionMetadata.requestedAtMs",
    );
  }

  return Object.freeze({
    kind,
    userVisiblePurpose: metadataPurpose,
    requestedAtMs: metadataRequestedAtMs,
  }) as ApprovedAudioSavePurposeMetadata;
}

function createSavedApprovedAudioUserVisibleMetadata(
  purposeMetadata: ApprovedAudioSavePurposeMetadata,
): SavedApprovedAudioUserVisibleMetadata {
  return Object.freeze({
    kind: purposeMetadata.kind,
    userVisiblePurpose: purposeMetadata.userVisiblePurpose,
    laterUsePurpose: purposeMetadata.userVisiblePurpose,
    requestedAtMs: purposeMetadata.requestedAtMs,
  }) as SavedApprovedAudioUserVisibleMetadata;
}

function normalizeSavedApprovedAudioUserVisibleMetadata(
  value: unknown,
  path: string,
): SavedApprovedAudioUserVisibleMetadata {
  const metadataRecord = requireAudioSaveRequestRecord(value, path);
  const kind = normalizeRequiredAudioSaveLiteral(
    metadataRecord.kind,
    APPROVED_AUDIO_SAVE_PURPOSE_KIND,
    `${path}.kind`,
  );
  const userVisiblePurpose = normalizeUserVisibleLaterUsePurpose(
    metadataRecord.userVisiblePurpose,
    `${path}.userVisiblePurpose`,
  );
  const laterUsePurpose = normalizeUserVisibleLaterUsePurpose(
    metadataRecord.laterUsePurpose,
    `${path}.laterUsePurpose`,
  );
  const requestedAtMs = normalizeAudioSaveTimestampMs(
    metadataRecord.requestedAtMs,
    `${path}.requestedAtMs`,
  );

  return Object.freeze({
    kind,
    userVisiblePurpose,
    laterUsePurpose,
    requestedAtMs,
  }) as SavedApprovedAudioUserVisibleMetadata;
}

function assertSavedAudioRecordRetentionPurposeMetadataMatchesPurposeMetadata(
  retentionPurposeMetadata: ApprovedAudioSavePurposeMetadata,
  purposeMetadata: ApprovedAudioSavePurposeMetadata,
  path: string,
): void {
  if (
    retentionPurposeMetadata.kind !== purposeMetadata.kind ||
    retentionPurposeMetadata.userVisiblePurpose !==
      purposeMetadata.userVisiblePurpose ||
    retentionPurposeMetadata.requestedAtMs !== purposeMetadata.requestedAtMs
  ) {
    throwApprovedAudioClipStoreContractError(`${path} must match purposeMetadata`);
  }
}

function assertSavedAudioRecordUserVisibleMetadataMatchesPurposeMetadata(
  userVisibleMetadata: SavedApprovedAudioUserVisibleMetadata,
  purposeMetadata: ApprovedAudioSavePurposeMetadata,
  path: string,
): void {
  if (
    userVisibleMetadata.kind !== purposeMetadata.kind ||
    userVisibleMetadata.userVisiblePurpose !==
      purposeMetadata.userVisiblePurpose ||
    userVisibleMetadata.laterUsePurpose !==
      purposeMetadata.userVisiblePurpose ||
    userVisibleMetadata.requestedAtMs !== purposeMetadata.requestedAtMs
  ) {
    throwApprovedAudioClipStoreContractError(`${path} must match purposeMetadata`);
  }
}

function assertRetentionPurposeMetadataMatchesPurposeMetadata(
  retentionPurposeMetadata: ApprovedAudioSavePurposeMetadata,
  purposeMetadata: ApprovedAudioSavePurposeMetadata,
  path: string,
): void {
  if (
    retentionPurposeMetadata.kind !== purposeMetadata.kind ||
    retentionPurposeMetadata.userVisiblePurpose !==
      purposeMetadata.userVisiblePurpose ||
    retentionPurposeMetadata.requestedAtMs !== purposeMetadata.requestedAtMs
  ) {
    throwDurableApprovedAudioStorageContractError(
      `${path} must match purposeMetadata`,
    );
  }
}

function assertUserVisibleMetadataMatchesPurposeMetadata(
  userVisibleMetadata: SavedApprovedAudioUserVisibleMetadata,
  purposeMetadata: ApprovedAudioSavePurposeMetadata,
  path: string,
): void {
  if (
    userVisibleMetadata.kind !== purposeMetadata.kind ||
    userVisibleMetadata.userVisiblePurpose !==
      purposeMetadata.userVisiblePurpose ||
    userVisibleMetadata.laterUsePurpose !==
      purposeMetadata.userVisiblePurpose ||
    userVisibleMetadata.requestedAtMs !== purposeMetadata.requestedAtMs
  ) {
    throwDurableApprovedAudioStorageContractError(
      `${path} must match purposeMetadata`,
    );
  }
}

function normalizeRequiredAudioSaveString(
  value: unknown,
  path: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwAudioSaveRequestContractError(`${path} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeUserVisibleLaterUsePurpose(
  value: unknown,
  path: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwAudioSaveRequestContractError(
      `${path} must be a non-empty user-visible later-use purpose`,
    );
  }

  return value.trim();
}

function normalizeRequiredAudioSaveLiteral<
  TExpected extends string | number | boolean,
>(
  value: unknown,
  expected: TExpected,
  path: string,
): TExpected {
  if (value !== expected) {
    throwAudioSaveRequestContractError(`${path} must be ${expected}`);
  }

  return expected;
}

function normalizeAudioSaveTimestampMs(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throwAudioSaveRequestContractError(
      `${path} must be a non-negative millisecond timestamp`,
    );
  }

  return value;
}

function normalizeApprovedVoiceMatchConfidence(
  value: unknown,
  path: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 1
  ) {
    throwAudioSaveRequestContractError(
      `${path} must be a confidence score greater than 0 and no more than 1`,
    );
  }

  return value;
}

function normalizeApprovedVoiceMatchLatencyMs(
  value: unknown,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throwAudioSaveRequestContractError(
      `${path} must be a non-negative millisecond duration`,
    );
  }

  if (value >= APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_MS) {
    throwAudioSaveRequestContractError(
      `${path} must be less than ${APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_MS}`,
    );
  }

  return value;
}

function normalizeAudioSaveDurationSeconds(
  value: unknown,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throwAudioSaveRequestContractError(`${path} must be greater than 0`);
  }

  return value;
}

function requireAudioSaveRequestRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwAudioSaveRequestContractError(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function throwAudioSaveRequestContractError(detail: string): never {
  throw new Error(`${APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR}: ${detail}`);
}

function throwApprovedAudioSaveActionContractError(detail: string): never {
  throw new Error(`${APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR}: ${detail}`);
}

function throwApprovedAudioSaveAuthorizationContractError(
  detail: string,
): never {
  throw new Error(
    `${APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR}: ${detail}`,
  );
}

function throwApprovedAudioClipStoreContractError(detail: string): never {
  throw new Error(`${APPROVED_AUDIO_CLIP_STORE_CONTRACT_ERROR}: ${detail}`);
}

function throwDurableApprovedAudioStorageContractError(detail: string): never {
  throw new Error(`${APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR}: ${detail}`);
}

function throwCapturedAudioMemoryOnlyUnlessExplicitSaveError(
  detail: string,
): never {
  throw new Error(
    `${CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR}: ${detail}`,
  );
}

function throwUnsavedCapturedAudioExternalResourceContractError(
  detail: string,
): never {
  throw new Error(
    `${UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_CONTRACT_ERROR}: ${detail}`,
  );
}

function normalizeActiveAudioFormat(
  activeAudioFormat: ActiveAudioFormat,
): ActiveAudioFormat {
  assertPositiveInteger(activeAudioFormat.sampleRateHz, "sampleRateHz");
  assertPositiveInteger(activeAudioFormat.channelCount, "channelCount");
  assertPositiveInteger(activeAudioFormat.bytesPerSample, "bytesPerSample");

  return {
    sampleRateHz: activeAudioFormat.sampleRateHz,
    channelCount: activeAudioFormat.channelCount,
    bytesPerSample: activeAudioFormat.bytesPerSample,
  };
}

function isCircularAudioBufferConfig(
  value: ActiveAudioFormat | CircularAudioBufferConfig,
): value is CircularAudioBufferConfig {
  return "circularBufferCapacity" in value;
}

function normalizeAudioBytes(audioBytes: CircularAudioBufferInput): Uint8Array {
  if (audioBytes instanceof ArrayBuffer) {
    return new Uint8Array(audioBytes);
  }

  if (ArrayBuffer.isView(audioBytes)) {
    return new Uint8Array(
      audioBytes.buffer,
      audioBytes.byteOffset,
      audioBytes.byteLength,
    );
  }

  if (Array.isArray(audioBytes)) {
    const bytes = new Uint8Array(audioBytes.length);
    audioBytes.forEach((value, index) => {
      if (!Number.isSafeInteger(value) || value < 0 || value > 255) {
        throw new Error(`audioBytes[${index}] must be a byte`);
      }
      bytes[index] = value;
    });
    return bytes;
  }

  throw new Error("audioBytes must be an ArrayBuffer, ArrayBufferView, or byte array");
}

function assertReadableByteCount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function normalizeAudioChunkTimestampMs(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative millisecond timestamp`);
  }

  return value;
}

function resolveRollingBufferActiveDurationSecondsFromUserSettings(
  settings: RollingBufferUserSettingsInput | null | undefined,
): number | undefined {
  if (settings === null || settings === undefined) {
    return undefined;
  }

  if (!isRollingBufferUserSettingsRecord(settings)) {
    throw new Error("rolling buffer user settings must be an object");
  }

  normalizeRollingBufferUserSettingsSchemaVersion(
    settings.schemaVersion,
    "schemaVersion",
  );

  const explicitActiveDuration = settings.rollingBufferActiveDurationSeconds;

  if (explicitActiveDuration === undefined) {
    return undefined;
  }

  return normalizeRollingBufferActiveDurationSeconds(
    explicitActiveDuration,
    ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
  );
}

function normalizeRollingBufferActiveDurationSeconds(
  value: unknown,
  name: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `${name} must be a finite duration in ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
    );
  }

  assertDurationSecondsInRange(value, name, {
    minSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
    maxSeconds: ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  });
  return value;
}

function isValidRollingBufferActiveDurationSeconds(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS &&
    value <= ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS
  );
}

function normalizeRollingBufferUserSettingsSchemaVersion(
  value: unknown,
  name: string,
): void {
  if (
    value !== undefined &&
    value !== ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION
  ) {
    throw new Error(
      `${name} must be ${ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION}`,
    );
  }
}

function normalizeRollingBufferUserSettingsTimestampMs(
  value: unknown,
  name: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative millisecond timestamp`);
  }

  return value;
}

function normalizeRollingBufferUserSettingsStorageKey(
  value: unknown,
  name: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }

  return value.trim();
}

function assertRollingBufferUserSettingsReadableStorage(
  storage: unknown,
): asserts storage is RollingBufferUserSettingsPersistenceReadAdapter {
  if (
    !isRollingBufferUserSettingsRecord(storage) ||
    typeof storage.getItem !== "function"
  ) {
    throw new Error(
      "rolling buffer user settings loading requires getItem storage",
    );
  }
}

function assertRollingBufferUserSettingsStorage(
  storage: unknown,
): asserts storage is RollingBufferUserSettingsPersistenceAdapter {
  if (
    !isRollingBufferUserSettingsRecord(storage) ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    throw new Error(
      "rolling buffer user settings persistence requires getItem and setItem storage",
    );
  }
}

function isRollingBufferUserSettingsRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertDurationSeconds(
  value: number,
  name: string,
  { allowZero }: { allowZero: boolean },
): void {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(
      `${name} must be ${allowZero ? "0 or greater" : "greater than 0"}`,
    );
  }
}

function assertDurationSecondsInRange(
  value: number,
  name: string,
  {
    minSeconds,
    maxSeconds,
  }: { minSeconds: number; maxSeconds: number },
): void {
  if (
    !Number.isFinite(value) ||
    value < minSeconds ||
    value > maxSeconds
  ) {
    throw new Error(
      `${name} must be between ${minSeconds} and ${maxSeconds} ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
    );
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} exceeds JavaScript safe integer precision`);
  }
}
