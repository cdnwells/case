import {
  APPROVED_AUDIO_CLIP_STORE_CONTRACT_ERROR,
  APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR,
  APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR,
  APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_MS,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
  AUDIO_BUFFER_CONFIG_HOOK_GUARD_ERROR,
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR,
  BUFFERED_AUDIO_REDACTION_LABEL,
  BUFFERED_AUDIO_DIAGNOSTICS_GUARD_ERROR,
  BUFFERED_AUDIO_NETWORK_GUARD_ERROR,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  CAPTURE_ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  DEFAULT_CAPTURE_BUFFERING_CONFIG,
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG,
  DEFAULT_ROLLING_BUFFER_DURATION_SECONDS,
  DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
  loadRollingAudioBufferConfigFromUserSettings,
  loadRollingBufferUserSettings,
  PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS,
  PROCESSING_WINDOW_EXPIRED_RELEASE_REASON,
  PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  RAW_AUDIO_PERSISTENCE_DEFAULT_ENABLED,
  persistRollingBufferUserSettings,
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA,
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA_VERSION,
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_IMMUTABLE_ERROR,
  ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
  ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
  ROLLING_BUFFER_DEPRECATED_DURATION_OVERRIDE_ERROR,
  ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD,
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE,
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  ROLLING_BUFFER_DURATION_SECONDS,
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION,
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
  ROLLING_BUFFER_DURATION_CONFIG_OPTION,
  ROLLING_BUFFER_DURATION_UNIT,
  ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  ROLLING_BUFFER_MAX_DURATION_SECONDS,
  ROLLING_BUFFER_MIN_DURATION_SECONDS,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
  ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY,
  ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS,
  PROHIBITED_BUFFERED_AUDIO_SINKS,
  PROHIBITED_PRE_APPROVAL_AUDIO_PERSISTENCE_WRITE_TARGETS,
  REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA,
  TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_CONTRACT_ERROR,
  UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY,
  UNSAVED_RAW_AUDIO_PROCESSING_WINDOW_DISCARD_POLICY,
  assertApprovedAudioSaveRequest,
  assertApprovedAudioSaveAction,
  assertApprovedAudioSaveAuthorization,
  assertApprovedAudioClipSaveAuthorized,
  assertDurableApprovedAudioClipWriteAllowed,
  assertApprovedVoiceVerifiedForBufferedAudioDownstream,
  assertBufferedAudioSinkAllowed,
  assertAnalyticsPayloadExcludesCapturedAudio,
  assertCrashReportPayloadExcludesCapturedAudio,
  assertDebugTracePayloadExcludesCapturedAudio,
  assertLogPayloadExcludesCapturedAudio,
  assertNetworkPayloadExcludesBufferedAudio,
  assertTelemetryPayloadExcludesCapturedAudio,
  assertNoAutomaticAudioBufferConfigHooks,
  appendCapturedFrameToCircularBuffer,
  attachNonPersistableAudioBytes,
  createAudioSafeLogArgs,
  createCircularAudioBufferConfig,
  createApprovedAudioSaveAuthorization,
  createApprovedAudioSaveAction,
  createDurableApprovedAudioClipStore,
  createApprovedSpeechAudioRelease,
  createAnalyticsSafeJsonBody,
  createAudioSafeDebugTraceArgs,
  createSavedApprovedAudioRecordView,
  createApprovedAudioSaveRequest,
  createCrashReportSafeJsonBody,
  createDebugTraceSafeJsonBody,
  createLocalApprovedAudioClipStore,
  createLogSafePayload,
  createNetworkSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  createRollingAudioBufferConfig,
  createTelemetrySafeJsonBody,
  createTelemetrySafePayload,
  deriveCircularAudioBufferCapacity,
  discardRejectedSpeechBeforeDownstream,
  getDefaultCaptureBufferingConfig,
  getSavedApprovedAudioRecordView,
  listSavedApprovedAudioRecordViews,
  parseRollingBufferUserSettings,
  purgeUnsavedCapturedAudioExternalResources,
  releaseCapturedAudioFrame,
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent,
  resolveRollingBufferActiveDurationSeconds,
  resolveRollingBufferNoOverrideActiveDurationSeconds,
  saveApprovedAudioClipFromExplicitSaveAction,
  saveRollingBufferUserSettings,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
  serializeRollingBufferUserSettings,
} from "./audioBuffer.ts";
import { readFileSync } from "node:fs";
import { inspect } from "node:util";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
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
      `${message}: expected function not to throw, received ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
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

function expectNotIncludes(actual, expected, message) {
  if (String(actual).includes(expected)) {
    throw new Error(
      `${message}: expected ${actual} not to include ${expected}`,
    );
  }
}

function sourceSliceBetween(source, startMarker, endMarker, message) {
  const startIndex = source.indexOf(startMarker);
  const endIndex =
    startIndex === -1
      ? -1
      : source.indexOf(endMarker, startIndex + startMarker.length);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`${message}: expected source markers to be present`);
  }

  return source.slice(startIndex, endIndex);
}

const audioBufferSource = readFileSync(
  new URL("./audioBuffer.ts", import.meta.url),
  "utf8",
);
const projectReadmeSource = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const rollingBufferDefaultDurationBindingMatch = audioBufferSource.match(
  /\bexport const ROLLING_BUFFER_DEFAULT_DURATION_SECONDS = (?<value>\d+);/,
);
const noOverrideActiveDurationBindingSource = sourceSliceBetween(
  audioBufferSource,
  "export const ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS",
  "export const DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG",
  "no-override active duration binding source",
);
const noOverrideActiveDurationResolverSource = sourceSliceBetween(
  audioBufferSource,
  "export function resolveRollingBufferNoOverrideActiveDurationSeconds",
  "export function createRollingAudioBufferConfigFromUserSettings",
  "no-override active duration resolver source",
);

function createMemorySettingsStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));
  const writes = [];

  return {
    values,
    writes,
    async getItem(storageKey) {
      return values.has(storageKey) ? values.get(storageKey) : null;
    },
    async setItem(storageKey, serializedSettings) {
      writes.push([storageKey, serializedSettings]);
      values.set(storageKey, serializedSettings);
    },
  };
}

function expectDefaultRollingBufferDurationPinned(message) {
  const freshDefaultConfig = createRollingAudioBufferConfig();

  expectEqual(
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    15,
    `${message}: authoritative default constant stays pinned to 15 seconds`,
  );
  expectEqual(
    resolveRollingBufferActiveDurationSeconds(),
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    `${message}: no-override active duration resolves through the authoritative default constant`,
  );
  expectEqual(
    ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    resolveRollingBufferActiveDurationSeconds(),
    `${message}: exported no-override active duration aliases the resolved default`,
  );
  expectEqual(
    DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferDefaultDurationSeconds,
    15,
    `${message}: frozen default config keeps the immutable default duration`,
  );
  expectEqual(
    DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG[
      ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD
    ],
    15,
    `${message}: frozen default config exposes the immutable snake_case default duration`,
  );
  expectEqual(
    DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferActiveDurationSeconds,
    ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    `${message}: frozen default config keeps resolved active duration unchanged`,
  );
  expectEqual(
    DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG[
      ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
    ],
    ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    `${message}: frozen default config exposes resolved active duration as a snake_case field`,
  );
  expectEqual(
    DEFAULT_CAPTURE_BUFFERING_CONFIG.rollingBufferWindowDurationSeconds,
    ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
    `${message}: capture buffering default keeps the resolved active rolling window`,
  );
  expectEqual(
    freshDefaultConfig.rollingBufferDefaultDurationSeconds,
    15,
    `${message}: freshly resolved config keeps the immutable default duration`,
  );
  expectEqual(
    freshDefaultConfig[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
    15,
    `${message}: freshly resolved config exposes the immutable snake_case default duration`,
  );
  expectEqual(
    freshDefaultConfig.rollingBufferActiveDurationSeconds,
    15,
    `${message}: freshly resolved config keeps the active duration on the default`,
  );
  expectEqual(
    freshDefaultConfig[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
    15,
    `${message}: freshly resolved config exposes the active duration on the snake_case default`,
  );
  expectEqual(
    freshDefaultConfig.rollingBufferDurationSeconds,
    15,
    `${message}: freshly resolved legacy duration alias stays tied to active default`,
  );
  expectEqual(
    freshDefaultConfig[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD],
    15,
    `${message}: freshly resolved snake_case legacy duration alias stays tied to active default`,
  );
}

function expectVisibleRollingBufferDurations(
  visibleDurations,
  activeDurationSeconds,
  message,
) {
  expectEqual(
    "rollingBufferDefaultDurationSeconds" in visibleDurations,
    true,
    `${message}: visible duration surface includes the immutable default duration`,
  );
  expectEqual(
    ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD in visibleDurations,
    true,
    `${message}: visible schema duration surface includes the immutable default duration`,
  );
  expectEqual(
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD in visibleDurations,
    true,
    `${message}: visible schema duration surface includes the active duration`,
  );
  expectEqual(
    visibleDurations.rollingBufferDefaultDurationSeconds,
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    `${message}: visible default duration remains pinned to 15 seconds`,
  );
  expectEqual(
    visibleDurations[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    `${message}: visible snake_case default duration remains pinned to 15 seconds`,
  );
  expectEqual(
    visibleDurations.rollingBufferActiveDurationSeconds,
    activeDurationSeconds,
    `${message}: visible active duration reflects the explicit customization`,
  );
  expectEqual(
    visibleDurations[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
    activeDurationSeconds,
    `${message}: visible snake_case active duration reflects the explicit customization`,
  );
  expectEqual(
    visibleDurations.rollingBufferDurationSeconds,
    activeDurationSeconds,
    `${message}: deprecated visible duration aliases the customized active duration`,
  );
  expectEqual(
    visibleDurations[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD],
    activeDurationSeconds,
    `${message}: deprecated snake_case visible duration aliases the customized active duration`,
  );
}

function expectExplicitOverrideOnlyChangesResolvedActiveDuration(
  baselineConfig,
  overriddenConfig,
  activeDurationSeconds,
  message,
) {
  const activeDurationAliasFields = new Set([
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
    "rollingBufferActiveDurationSeconds",
    ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD,
    "rollingBufferDurationSeconds",
  ]);
  const stableBaselineValues = Object.fromEntries(
    Object.entries(baselineConfig).filter(
      ([fieldName]) => !activeDurationAliasFields.has(fieldName),
    ),
  );
  const stableOverriddenValues = Object.fromEntries(
    Object.entries(overriddenConfig).filter(
      ([fieldName]) => !activeDurationAliasFields.has(fieldName),
    ),
  );

  expectEqual(
    overriddenConfig[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
    activeDurationSeconds,
    `${message}: explicit override changes rolling_buffer_active_duration_seconds`,
  );
  expectEqual(
    overriddenConfig.rollingBufferActiveDurationSeconds,
    activeDurationSeconds,
    `${message}: camelCase active duration mirrors the resolved active duration`,
  );
  expectEqual(
    overriddenConfig[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD],
    activeDurationSeconds,
    `${message}: deprecated snake_case duration remains only an active-duration alias`,
  );
  expectEqual(
    overriddenConfig.rollingBufferDurationSeconds,
    activeDurationSeconds,
    `${message}: deprecated camelCase duration remains only an active-duration alias`,
  );
  expectEqual(
    JSON.stringify(stableOverriddenValues),
    JSON.stringify(stableBaselineValues),
    `${message}: explicit override leaves every other resolved rolling-buffer value unchanged`,
  );
}

function createApprovedAudioSaveRequestInput(overrides = {}) {
  const userVisiblePurpose = "Save this audio clip for playback in the note";
  const requestedAtMs = 1700000000000;
  const base = {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "voice-alice",
      confidence: 0.94,
      recognizedAtMs: 1700000000050,
      recognitionLatencyMs: 120,
      reason: "high_confidence_match",
    },
    approvedUserIdentity: {
      approvedVoiceId: "voice-alice",
      approvedUserId: "user-alice",
      displayName: "Alice",
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
      expiresAtMs: 1700003600000,
      storageLocation: BUFFER_LOCATION_ON_DEVICE,
      retentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    },
  };

  return {
    ...base,
    ...overrides,
    approvedVoiceMatch:
      overrides.approvedVoiceMatch === undefined
        ? base.approvedVoiceMatch
        : {
            ...base.approvedVoiceMatch,
            ...overrides.approvedVoiceMatch,
          },
    approvedUserIdentity:
      overrides.approvedUserIdentity === undefined
        ? base.approvedUserIdentity
        : {
            ...base.approvedUserIdentity,
            ...overrides.approvedUserIdentity,
          },
    purposeMetadata:
      overrides.purposeMetadata === undefined
        ? base.purposeMetadata
        : {
            ...base.purposeMetadata,
            ...overrides.purposeMetadata,
          },
    retentionMetadata:
      overrides.retentionMetadata === undefined
        ? base.retentionMetadata
        : {
            ...base.retentionMetadata,
            ...overrides.retentionMetadata,
          },
  };
}

function createShortTestAudioBuffer(initialAudioBytes) {
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

function verifyVoiceApprovalDiscardScenario({
  label,
  reason,
  rejectedVoiceId = null,
  latencyMs,
  rollingAudioBytes,
  capturedAudioBytes,
}) {
  const clipStore = createLocalApprovedAudioClipStore();
  const rollingAudioBuffer = createShortTestAudioBuffer(rollingAudioBytes);
  const capturedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: `discard-${reason}`,
      timestampMs: 990,
      embedding: [0.05, 0.9, 0.05],
    },
    Uint8Array.from(capturedAudioBytes),
  );
  const originalCapturedAudioBytes = capturedFrame.audioBytes;
  const discardResult = discardRejectedSpeechBeforeDownstream({
    recognitionResult: {
      accepted: false,
      matchedVoiceId: null,
      rejectedVoiceId,
      latencyMs,
      reason,
    },
    rollingAudioBuffer,
    capturedFrames: [capturedFrame],
  });

  expectEqual(
    discardResult.discarded,
    true,
    `${label} discard path marks buffered audio discarded`,
  );
  expectArrayEqual(
    discardResult.blockedDownstreamSinks,
    Array.from(REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS),
    `${label} discard path blocks downstream buffered-audio paths`,
  );
  for (const downstreamPath of PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS) {
    expectEqual(
      discardResult.blockedDownstreamSinks.includes(downstreamPath),
      true,
      `${label} discard path blocks ${downstreamPath} before approved voice verification`,
    );
  }
  expectArrayEqual(
    rollingAudioBuffer.read(),
    [],
    `${label} discard path clears rolling audio without persistence`,
  );
  expectEqual(
    rollingAudioBuffer.getState().sizeBytes,
    0,
    `${label} discard path retains no rolling bytes after cleanup`,
  );
  expectArrayEqual(
    originalCapturedAudioBytes,
    capturedAudioBytes.map(() => 0),
    `${label} discard path zeroes temporary captured audio bytes`,
  );
  expectEqual(
    "audioBytes" in capturedFrame,
    false,
    `${label} discard path removes captured audio from frame metadata`,
  );
  expectEqual(
    clipStore.list().length,
    0,
    `${label} discard path persists no approved audio clips`,
  );
  expectDoesNotThrow(
    () =>
      assertNetworkPayloadExcludesBufferedAudio({
        discardResult,
        retainedAudioRecords: clipStore.list(),
      }),
    `${label} discard path exposes only network-safe metadata`,
  );
  expectDoesNotThrow(
    () =>
      assertLogPayloadExcludesCapturedAudio({
        discardResult,
        retainedAudioRecords: clipStore.list(),
      }),
    `${label} discard path exposes only log-safe metadata`,
  );
  expectDoesNotThrow(
    () =>
      assertTelemetryPayloadExcludesCapturedAudio({
        discardResult,
        retainedAudioRecords: clipStore.list(),
      }),
    `${label} discard path exposes only telemetry-safe metadata`,
  );
  expectNotIncludes(
    JSON.stringify({
      discardResult,
      capturedFrame,
      retainedAudioRecords: clipStore.list(),
    }),
    "audioBytes",
    `${label} discard path serialization carries no captured audio`,
  );
}

const defaultRollingConfig = createRollingAudioBufferConfig();
const defaultCaptureBufferingConfig = getDefaultCaptureBufferingConfig();

expectDefaultRollingBufferDurationPinned(
  "baseline before rolling-buffer customization or persistence",
);

expectEqual(
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  0.1,
  "capture buffering exposes a named 100 ms processing-window default",
);
expectEqual(
  PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  "processing-window default alias resolves to the capture buffering default",
);
expectEqual(
  CAPTURE_ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "capture buffering rolling-buffer-window default aliases the authoritative rolling default",
);
expectEqual(
  ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS,
  CAPTURE_ROLLING_BUFFER_WINDOW_DEFAULT_DURATION_SECONDS,
  "rolling-buffer-window default alias resolves to the capture buffering default",
);
expectEqual(
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  false,
  "capture buffering disables raw audio persistence by default",
);
expectEqual(
  RAW_AUDIO_PERSISTENCE_DEFAULT_ENABLED,
  RAW_AUDIO_PERSISTENCE_ENABLED_BY_DEFAULT,
  "raw audio persistence default alias resolves to the disabled capture default",
);
expectEqual(
  DEFAULT_CAPTURE_BUFFERING_CONFIG.processingWindowDurationSeconds,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  "capture buffering default config declares the processing-window duration",
);
expectEqual(
  DEFAULT_CAPTURE_BUFFERING_CONFIG.rollingBufferWindowDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "capture buffering default config declares the resolved active rolling-buffer window",
);
expectEqual(
  DEFAULT_CAPTURE_BUFFERING_CONFIG.rawAudioPersistenceEnabled,
  false,
  "capture buffering default config leaves raw audio persistence disabled",
);
expectEqual(
  defaultCaptureBufferingConfig.rawAudioPersistenceEnabled,
  false,
  "capture buffering default config copy leaves raw audio persistence disabled",
);
expectEqual(
  defaultCaptureBufferingConfig.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "capture buffering default config keeps audio on-device",
);
expectEqual(
  defaultCaptureBufferingConfig.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "capture buffering default config keeps discard-unless-saved retention",
);

expectEqual(
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  15,
  "rolling buffer exposes the authoritative default duration constant required by the config contract",
);
expectEqual(
  rollingBufferDefaultDurationBindingMatch?.groups?.value,
  "15",
  "authoritative rolling-buffer default binding value is exactly 15 seconds in source",
);
expectEqual(
  Object.isFrozen(DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG),
  true,
  "default rolling buffer config is immutable",
);
expectEqual(
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "default rolling buffer config carries the immutable default duration separately",
);
expectEqual(
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "default rolling buffer config resolves the active duration from the default",
);
expectEqual(
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "no-override rolling buffer active duration resolves to the immutable 15-second default",
);
expectEqual(
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  resolveRollingBufferNoOverrideActiveDurationSeconds(),
  "no-override active duration binding aliases the dedicated default resolver",
);
expectEqual(
  resolveRollingBufferNoOverrideActiveDurationSeconds(),
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "dedicated no-override active duration resolver returns the authoritative default binding",
);
expectIncludes(
  noOverrideActiveDurationBindingSource,
  "resolveRollingBufferNoOverrideActiveDurationSeconds()",
  "no-override active duration binding uses the dedicated resolver",
);
expectNotIncludes(
  noOverrideActiveDurationBindingSource,
  "= 15",
  "no-override active duration binding does not duplicate the literal default",
);
expectIncludes(
  noOverrideActiveDurationResolverSource,
  "return ROLLING_BUFFER_DEFAULT_DURATION_SECONDS;",
  "no-override active duration resolver uses the authoritative default binding",
);
expectNotIncludes(
  noOverrideActiveDurationResolverSource,
  "return 15",
  "no-override active duration resolver does not duplicate the literal default",
);
expectEqual(
  resolveRollingBufferActiveDurationSeconds(null),
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "null rolling-buffer customization resolves active duration from the immutable default",
);
expectEqual(
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferDurationSeconds,
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferActiveDurationSeconds,
  "default rolling buffer config keeps the deprecated duration field as an active-duration alias",
);
expectEqual(
  DEFAULT_ROLLING_BUFFER_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "legacy rolling buffer default alias resolves to the authoritative default duration constant",
);
expectEqual(
  ROLLING_BUFFER_DURATION_SECONDS,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer duration explicit customization source defaults to the authoritative 15-second binding",
);
expectEqual(
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  "ROLLING_BUFFER_DURATION_SECONDS",
  "rolling buffer duration customization source names the explicit app-level binding",
);
expectEqual(
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE.defaultValueSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer explicit customization source defaults from the authoritative default",
);
expectEqual(
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE.valueSeconds,
  ROLLING_BUFFER_DURATION_SECONDS,
  "rolling buffer explicit customization source exposes the configured duration value",
);
expectEqual(
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE.mapsOnlyTo,
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  "rolling buffer explicit customization source maps only to the active duration schema field",
);
expectEqual(
  defaultRollingConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config preserves the immutable 15-second default separately from active duration",
);
expectEqual(
  defaultRollingConfig.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config active duration defaults to the immutable 15-second default",
);
expectEqual(
  defaultRollingConfig.rollingBufferDurationSeconds,
  defaultRollingConfig.rollingBufferActiveDurationSeconds,
  "deprecated rollingBufferDurationSeconds aliases the active rolling buffer duration",
);
expectEqual(
  defaultRollingConfig.bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "rolling buffer defaults to ephemeral in-memory storage",
);
expectEqual(
  defaultRollingConfig.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "rolling buffer stays on-device",
);
expectEqual(
  defaultRollingConfig.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "retention policy discards unsaved audio",
);
expectArrayEqual(
  PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS,
  ["transcription", "analytics", "sync", "upload"],
  "pre-approval buffered audio explicitly blocks transcription, analytics, sync, and upload",
);
expectEqual(
  "audioRetentionDurationSeconds" in defaultRollingConfig,
  false,
  "rolling buffer config has no automatic audio retention duration hook",
);
expectEqual(
  "persistenceAdapter" in defaultRollingConfig,
  false,
  "rolling buffer config has no automatic persistence adapter hook",
);

const defaultWindowBuffer = createOnDeviceCircularAudioBuffer({
  sampleRateHz: 10,
  channelCount: 1,
  bytesPerSample: 1,
});

expectEqual(
  defaultWindowBuffer.getConfig().rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling audio window config carries the immutable 15-second default duration separately",
);
expectEqual(
  defaultWindowBuffer.getConfig().rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling audio window config carries the active duration separately from the default",
);
expectEqual(
  defaultWindowBuffer.getConfig().rollingBufferDurationSeconds,
  defaultWindowBuffer.getConfig().rollingBufferActiveDurationSeconds,
  "rolling audio window deprecated duration field aliases the active duration",
);
expectEqual(
  defaultWindowBuffer.getState().rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling audio window state carries the immutable 15-second default duration separately",
);
expectEqual(
  defaultWindowBuffer.getState().rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling audio window state carries the resolved active duration separately",
);
expectEqual(
  defaultWindowBuffer.getState().rollingBufferDurationSeconds,
  defaultWindowBuffer.getState().rollingBufferActiveDurationSeconds,
  "rolling audio window state keeps the deprecated duration field as an active-duration alias",
);
expectEqual(
  defaultWindowBuffer.getConfig().bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "default rolling audio window is backed only by ephemeral memory",
);
expectEqual(
  "audioRetentionDurationSeconds" in defaultWindowBuffer.getConfig(),
  false,
  "default rolling audio window exposes no automatic retention duration",
);
expectEqual(
  defaultWindowBuffer.capacityBytes,
  150,
  "default rolling audio window capacity covers 15 seconds of active audio",
);
defaultWindowBuffer.append(
  Uint8Array.from({ length: 151 }, (_, index) => index),
);
expectEqual(
  defaultWindowBuffer.read().byteLength,
  150,
  "default rolling audio window retains only the newest 15 seconds",
);
expectEqual(
  defaultWindowBuffer.getState().availableDurationSeconds,
  15,
  "default rolling audio window reports a retained 15-second duration",
);
expectEqual(
  defaultWindowBuffer.read()[0],
  1,
  "default rolling audio window evicts samples older than 15 seconds",
);

const noOverrideActiveAppendEvictionBuffer =
  createOnDeviceCircularAudioBuffer({
    sampleRateHz: 1,
    channelCount: 1,
    bytesPerSample: 1,
  });
noOverrideActiveAppendEvictionBuffer.append(
  Uint8Array.from(
    { length: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS },
    (_, index) => index + 1,
  ),
  {
    timestampMs: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS * 1000,
  },
);
noOverrideActiveAppendEvictionBuffer.append(Uint8Array.from([99]), {
  timestampMs: (ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS + 1) * 1000,
});
expectEqual(
  noOverrideActiveAppendEvictionBuffer.getConfig()
    .rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "append-time active-window eviction preserves the immutable default duration",
);
expectEqual(
  noOverrideActiveAppendEvictionBuffer.getConfig()
    .rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "append-time active-window eviction resolves the no-override active duration",
);
expectArrayEqual(
  noOverrideActiveAppendEvictionBuffer.read(),
  [
    ...Array.from(
      { length: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS - 1 },
      (_, index) => index + 2,
    ),
    99,
  ],
  "append-time active-window eviction trims samples older than the resolved 15-second active window",
);
expectEqual(
  noOverrideActiveAppendEvictionBuffer.getState()
    .oldestRetainedAudioTimestampMs,
  1000,
  "append-time active-window eviction advances retained audio to the active window start",
);

const defaultMaintenanceBuffer = createOnDeviceCircularAudioBuffer({
  sampleRateHz: 1,
  channelCount: 1,
  bytesPerSample: 1,
});
defaultMaintenanceBuffer.append(
  Uint8Array.from(
    { length: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS },
    (_, index) => index,
  ),
  {
    timestampMs: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS * 1000,
  },
);
expectEqual(
  defaultMaintenanceBuffer.pruneToActiveRollingWindow(
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS * 1000,
  ),
  0,
  "no-override rolling buffer maintenance keeps the full active 15-second window at the boundary",
);
expectEqual(
  defaultMaintenanceBuffer.getState().availableDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "no-override rolling buffer maintenance exposes exactly 15 active seconds before expiry",
);
expectEqual(
  defaultMaintenanceBuffer.pruneToActiveRollingWindow(
    (ROLLING_BUFFER_DEFAULT_DURATION_SECONDS + 1) * 1000,
  ),
  1,
  "no-override rolling buffer maintenance prunes audio older than the active 15-second window",
);
expectArrayEqual(
  defaultMaintenanceBuffer.read(),
  Array.from(
    { length: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS - 1 },
    (_, index) => index + 1,
  ),
  "no-override rolling buffer maintenance discards expired local audio without retaining pre-window speech",
);
expectEqual(
  defaultMaintenanceBuffer.getState().oldestRetainedAudioTimestampMs,
  1000,
  "no-override rolling buffer maintenance advances retained audio to the active window start",
);
defaultMaintenanceBuffer.append(Uint8Array.from([99]), {
  timestampMs: (ROLLING_BUFFER_DEFAULT_DURATION_SECONDS + 1) * 1000,
});
expectEqual(
  defaultMaintenanceBuffer.getState().availableDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "no-override rolling buffer returns to exactly 15 active seconds after the next local frame",
);
expectArrayEqual(
  defaultMaintenanceBuffer.read(),
  [
    ...Array.from(
      { length: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS - 1 },
      (_, index) => index + 1,
    ),
    99,
  ],
  "no-override rolling buffer keeps only the active 15-second audio window after maintenance and append",
);

const defaultNoSavePurposeRollingBuffer = createOnDeviceCircularAudioBuffer({
  sampleRateHz: 1,
  channelCount: 1,
  bytesPerSample: 1,
});
const defaultNoSavePurposeClipStore = createLocalApprovedAudioClipStore();
const defaultNoSavePurposeAudioBytes = Uint8Array.from(
  Array.from(
    { length: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS },
    (_, index) => index + 10,
  ),
);
defaultNoSavePurposeRollingBuffer.append(defaultNoSavePurposeAudioBytes, {
  timestampMs: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS * 1000,
});
const defaultNoSavePurposeSegment =
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: defaultNoSavePurposeRollingBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "voice-alice",
      latencyMs: 500,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "voice-alice",
        score: 0.98,
        threshold: 0.8,
      },
    },
    downstreamPath: "transcription",
    selectedAtMs: ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS * 1000,
  });
const defaultNoSavePurposeSegmentBytes =
  defaultNoSavePurposeSegment?.audioBytes;
const defaultNoSavePurposeRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: defaultNoSavePurposeRollingBuffer,
  rollingBufferAudioSegments:
    defaultNoSavePurposeSegment === null ? [] : [defaultNoSavePurposeSegment],
  scheduleProcessingWindowExpiry: false,
});
const defaultNoSavePurposeCleanup =
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
    releaseCapturedAudio: defaultNoSavePurposeRelease.release,
  });

expectEqual(
  DEFAULT_ROLLING_AUDIO_BUFFER_CONFIG.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "default no-save-purpose rolling buffer starts from the resolved no-override active duration",
);
expectEqual(
  defaultNoSavePurposeRollingBuffer.getConfig()
    .rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "default no-save-purpose rolling buffer keeps the immutable default duration",
);
expectEqual(
  defaultNoSavePurposeRollingBuffer.getConfig()
    .rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_NO_OVERRIDE_ACTIVE_DURATION_SECONDS,
  "default no-save-purpose rolling buffer uses the resolved active duration without an override",
);
expectEqual(
  defaultNoSavePurposeSegment === null,
  false,
  "default no-save-purpose rolling buffer selects local audio for approved speech processing",
);
expectEqual(
  defaultNoSavePurposeSegment?.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "default no-save-purpose rolling segment keeps discard-unless-saved policy metadata",
);
expectEqual(
  defaultNoSavePurposeCleanup.saveIntentPresent,
  DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
  "default no-save-purpose transcription cleanup has no explicit save intent",
);
expectEqual(
  defaultNoSavePurposeCleanup.released,
  true,
  "default no-save-purpose transcription cleanup releases the rolling buffer",
);
expectEqual(
  defaultNoSavePurposeCleanup.releaseReason,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  "default no-save-purpose transcription cleanup records the no-save discard reason",
);
expectArrayEqual(
  defaultNoSavePurposeRollingBuffer.read(),
  [],
  "default no-save-purpose rolling buffer discards audio without an explicit save purpose",
);
expectEqual(
  defaultNoSavePurposeRollingBuffer.getState().sizeBytes,
  0,
  "default no-save-purpose rolling buffer retains no bytes after discard",
);
expectArrayEqual(
  defaultNoSavePurposeSegmentBytes ?? [],
  Array.from(
    { length: defaultNoSavePurposeSegment?.byteLength ?? 0 },
    () => 0,
  ),
  "default no-save-purpose selected rolling segment bytes are zeroed on discard",
);
expectEqual(
  defaultNoSavePurposeSegment === null ||
    "audioBytes" in defaultNoSavePurposeSegment,
  false,
  "default no-save-purpose selected rolling segment removes raw audio metadata on discard",
);
expectEqual(
  defaultNoSavePurposeClipStore.list().length,
  0,
  "default no-save-purpose rolling buffer creates no saved clip without a user-visible later-use purpose",
);
expectEqual(
  defaultWindowBuffer.getState().persistenceSafeguards.persistencePolicy,
  AUDIO_BUFFER_PERSISTENCE_POLICY_LOCAL_MEMORY_ONLY,
  "pre-approval rolling audio declares a local-memory-only persistence policy",
);
expectEqual(
  defaultWindowBuffer.getState().persistenceSafeguards.automaticPersistenceEnabled,
  false,
  "pre-approval rolling audio disables automatic persistence writes",
);
expectEqual(
  defaultWindowBuffer.getState().persistenceSafeguards.automaticRetentionEnabled,
  false,
  "pre-approval rolling audio disables automatic retention writes",
);
for (const sink of PROHIBITED_PRE_APPROVAL_AUDIO_PERSISTENCE_WRITE_TARGETS) {
  expectThrows(
    () => assertBufferedAudioSinkAllowed(sink),
    `pre-approval audio buffering rejects ${sink} persistence writes`,
  );
  expectThrows(
    () => defaultWindowBuffer.read(undefined, { sink }),
    `pre-approval audio buffering cannot read rolling audio into ${sink}`,
  );
}

const rollingWindowEvictionBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 2,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 3,
  },
);

rollingWindowEvictionBuffer.append(Uint8Array.from([10, 11]));
rollingWindowEvictionBuffer.append(Uint8Array.from([20, 21]));
rollingWindowEvictionBuffer.append(Uint8Array.from([30, 31]));
expectArrayEqual(
  rollingWindowEvictionBuffer.read(),
  [10, 11, 20, 21, 30, 31],
  "rolling window keeps all audio while it is within the configured duration",
);

rollingWindowEvictionBuffer.append(Uint8Array.from([40, 41]));
expectArrayEqual(
  rollingWindowEvictionBuffer.read(),
  [20, 21, 30, 31, 40, 41],
  "rolling window evicts audio older than the configured duration",
);
expectArrayEqual(
  rollingWindowEvictionBuffer.read(4),
  [30, 31, 40, 41],
  "rolling window still exposes newer audio after older audio is evicted",
);
expectEqual(
  rollingWindowEvictionBuffer.getState().availableDurationSeconds,
  3,
  "rolling window eviction preserves the configured available duration",
);

const rollingWindowExpiryBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
rollingWindowExpiryBuffer.append(Uint8Array.from([90, 91, 92, 93]), {
  timestampMs: 1000,
});
expectEqual(
  rollingWindowExpiryBuffer.evictExpiredUnsavedAudio(1000),
  0,
  "rolling-buffer expiry leaves unsaved raw audio inside the active window",
);
expectArrayEqual(
  rollingWindowExpiryBuffer.read(),
  [90, 91, 92, 93],
  "unexpired unsaved raw audio remains available only in local memory",
);
expectEqual(
  rollingWindowExpiryBuffer.evictExpiredUnsavedAudio(1500),
  2,
  "rolling-buffer expiry evicts stale unsaved raw audio when part of a chunk ages out",
);
expectArrayEqual(
  rollingWindowExpiryBuffer.read(),
  [92, 93],
  "partial rolling-buffer expiry exposes only still-active unsaved raw audio",
);
expectEqual(
  rollingWindowExpiryBuffer.evictExpiredUnsavedAudio(2000),
  2,
  "rolling-buffer expiry evicts the remaining unsaved raw audio at the window deadline",
);
expectArrayEqual(
  rollingWindowExpiryBuffer.read(),
  [],
  "expired unsaved raw audio is unavailable without waiting for a later append",
);
expectEqual(
  rollingWindowExpiryBuffer.getState().sizeBytes,
  0,
  "rolling-buffer expiry leaves no expired raw audio bytes retained",
);

const timestampedChunkBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 10,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);

timestampedChunkBuffer.append(Uint8Array.from([1, 2]), {
  timestampMs: 1000,
});
timestampedChunkBuffer.append(Uint8Array.from([3, 4]), {
  timestampMs: 1400,
});
expectEqual(
  timestampedChunkBuffer.getState().chunkCount,
  2,
  "rolling buffer timestamps incoming audio chunks",
);
expectEqual(
  timestampedChunkBuffer.getState().oldestChunkTimestampMs,
  1000,
  "rolling buffer exposes oldest retained chunk timestamp",
);
expectEqual(
  timestampedChunkBuffer.getState().newestChunkTimestampMs,
  1400,
  "rolling buffer exposes newest retained chunk timestamp",
);
expectArrayEqual(
  timestampedChunkBuffer.readChunks().map((chunk) => chunk.timestampMs),
  [1000, 1400],
  "rolling buffer returns timestamped chunk metadata in audio order",
);

timestampedChunkBuffer.append(Uint8Array.from([5, 6]), {
  timestampMs: 2500,
});
expectArrayEqual(
  timestampedChunkBuffer.read(),
  [5, 6],
  "rolling buffer evicts chunks older than the timestamped rolling window",
);
expectEqual(
  timestampedChunkBuffer.getState().oldestRetainedAudioTimestampMs,
  2300,
  "rolling buffer advances retained audio start time after timestamp eviction",
);

const partiallyTrimmedChunkBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 10,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
partiallyTrimmedChunkBuffer.append(Uint8Array.from([10, 11, 12, 13]), {
  timestampMs: 1000,
});
partiallyTrimmedChunkBuffer.append(Uint8Array.from([14]), {
  timestampMs: 1700,
});
expectArrayEqual(
  partiallyTrimmedChunkBuffer.read(),
  [11, 12, 13, 14],
  "rolling buffer trims stale bytes from chunks that cross the timestamp window boundary",
);
expectEqual(
  partiallyTrimmedChunkBuffer.readChunks()[0].startedAtMs,
  700,
  "timestamped chunk metadata is updated after partial eviction",
);

const manualRollingBufferDurationSeconds = 7.5;
const presentValidExplicitOverrideDurationSeconds = 22;
const customRollingConfig = createRollingAudioBufferConfig({
  rollingBufferActiveDurationSeconds: manualRollingBufferDurationSeconds,
});
const explicitSourceRollingConfig = createRollingAudioBufferConfig({
  ROLLING_BUFFER_DURATION_SECONDS: manualRollingBufferDurationSeconds,
});
const presentValidExplicitOverrideConfig = createRollingAudioBufferConfig({
  [ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME]:
    presentValidExplicitOverrideDurationSeconds,
});
const missingExplicitOverrideConfig = createRollingAudioBufferConfig({
  [ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME]: undefined,
});
const explicitSourceDefaultRollingConfig = createRollingAudioBufferConfig({
  ROLLING_BUFFER_DURATION_SECONDS: null,
});
const invalidExplicitOverrideConfig = createRollingAudioBufferConfig({
  [ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME]:
    ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS + 0.01,
});
const nonNumericInvalidExplicitOverrideConfig = createRollingAudioBufferConfig({
  [ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME]: "not-a-duration",
});

expectEqual(
  customRollingConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "manual active duration customization does not change the immutable default duration",
);
expectDefaultRollingBufferDurationPinned(
  "after manual active-duration customization",
);
expectEqual(
  customRollingConfig.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer active duration can be manually configured with a named active-duration field",
);
expectEqual(
  customRollingConfig.rollingBufferDurationSeconds,
  manualRollingBufferDurationSeconds,
  "legacy rolling buffer duration field aliases the manually configured active duration",
);
expectEqual(
  "audioRetentionDurationSeconds" in customRollingConfig,
  false,
  "manual rolling buffer config still exposes no automatic retention duration",
);
expectVisibleRollingBufferDurations(
  customRollingConfig,
  manualRollingBufferDurationSeconds,
  "manual active duration customization config",
);
expectVisibleRollingBufferDurations(
  JSON.parse(JSON.stringify(customRollingConfig)),
  manualRollingBufferDurationSeconds,
  "manual active duration customization serialized config",
);
expectVisibleRollingBufferDurations(
  explicitSourceRollingConfig,
  manualRollingBufferDurationSeconds,
  "explicit ROLLING_BUFFER_DURATION_SECONDS source customization config",
);
expectEqual(
  resolveRollingBufferActiveDurationSeconds(
    presentValidExplicitOverrideDurationSeconds,
    ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  ),
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override resolves as the active duration",
);
expectEqual(
  presentValidExplicitOverrideConfig[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override maps to rolling_buffer_active_duration_seconds",
);
expectEqual(
  presentValidExplicitOverrideConfig.rollingBufferActiveDurationSeconds,
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override maps to the camelCase active duration",
);
expectEqual(
  presentValidExplicitOverrideConfig[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override leaves the immutable default duration unchanged",
);
expectEqual(
  presentValidExplicitOverrideConfig[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD],
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override exposes the deprecated snake_case duration only as an active alias",
);
expectEqual(
  resolveRollingBufferActiveDurationSeconds(
    ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS + 0.01,
    ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  ),
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "invalid explicit ROLLING_BUFFER_DURATION_SECONDS override is ignored and resolves from the authoritative default binding",
);
expectEqual(
  resolveRollingBufferActiveDurationSeconds(
    "not-a-duration",
    ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  ),
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "non-numeric explicit ROLLING_BUFFER_DURATION_SECONDS override is ignored and resolves from the authoritative default binding",
);
expectVisibleRollingBufferDurations(
  invalidExplicitOverrideConfig,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "invalid explicit ROLLING_BUFFER_DURATION_SECONDS override fallback config",
);
expectVisibleRollingBufferDurations(
  nonNumericInvalidExplicitOverrideConfig,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "non-numeric explicit ROLLING_BUFFER_DURATION_SECONDS override fallback config",
);
expectDefaultRollingBufferDurationPinned(
  "after ignoring invalid explicit ROLLING_BUFFER_DURATION_SECONDS overrides",
);
expectEqual(
  resolveRollingBufferActiveDurationSeconds(
    undefined,
    ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  ),
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing explicit ROLLING_BUFFER_DURATION_SECONDS override resolves active duration from the authoritative default binding",
);
expectEqual(
  missingExplicitOverrideConfig[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing explicit ROLLING_BUFFER_DURATION_SECONDS override maps the default into rolling_buffer_active_duration_seconds",
);
expectEqual(
  missingExplicitOverrideConfig.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing explicit ROLLING_BUFFER_DURATION_SECONDS override maps the default into the camelCase active duration",
);
expectEqual(
  missingExplicitOverrideConfig[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing explicit ROLLING_BUFFER_DURATION_SECONDS override leaves the immutable default duration unchanged",
);
expectEqual(
  missingExplicitOverrideConfig[ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing explicit ROLLING_BUFFER_DURATION_SECONDS override exposes the deprecated duration only as the resolved active default alias",
);
expectExplicitOverrideOnlyChangesResolvedActiveDuration(
  defaultRollingConfig,
  explicitSourceRollingConfig,
  manualRollingBufferDurationSeconds,
  "explicit non-15 ROLLING_BUFFER_DURATION_SECONDS override",
);
expectEqual(
  explicitSourceRollingConfig[ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD],
  manualRollingBufferDurationSeconds,
  "explicit ROLLING_BUFFER_DURATION_SECONDS source maps to the active duration schema field",
);
expectEqual(
  explicitSourceRollingConfig[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "explicit ROLLING_BUFFER_DURATION_SECONDS source does not alter the immutable default field",
);
expectEqual(
  "ROLLING_BUFFER_DURATION_SECONDS" in explicitSourceRollingConfig,
  false,
  "explicit ROLLING_BUFFER_DURATION_SECONDS source is not exposed as a separate resolved config field",
);
expectEqual(
  explicitSourceDefaultRollingConfig[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "null explicit ROLLING_BUFFER_DURATION_SECONDS source resolves active duration from the immutable default",
);
expectEqual(
  explicitSourceDefaultRollingConfig[
    ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD
  ],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "null explicit ROLLING_BUFFER_DURATION_SECONDS source still leaves the default field immutable",
);

const customVisibleDurationBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 8,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: manualRollingBufferDurationSeconds,
  },
);
customVisibleDurationBuffer.append(Uint8Array.from([1, 2, 3, 4]), {
  timestampMs: 1000,
});
expectVisibleRollingBufferDurations(
  customVisibleDurationBuffer.getConfig(),
  manualRollingBufferDurationSeconds,
  "manual active duration customization buffer config",
);
expectVisibleRollingBufferDurations(
  customVisibleDurationBuffer.getState(),
  manualRollingBufferDurationSeconds,
  "manual active duration customization buffer state",
);
expectVisibleRollingBufferDurations(
  JSON.parse(JSON.stringify(customVisibleDurationBuffer)),
  manualRollingBufferDurationSeconds,
  "manual active duration customization serialized buffer state",
);
expectIncludes(
  inspect(customVisibleDurationBuffer),
  "rollingBufferDefaultDurationSeconds: 15",
  "manual active duration customization inspection keeps the visible default duration",
);
expectIncludes(
  inspect(customVisibleDurationBuffer),
  "rollingBufferActiveDurationSeconds: 7.5",
  "manual active duration customization inspection shows the active duration separately",
);
expectEqual(
  customVisibleDurationBuffer.capacityBytes,
  60,
  "manual active duration customization still controls runtime buffer capacity",
);

const presentValidExplicitOverrideBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 2,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    [ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME]:
      presentValidExplicitOverrideDurationSeconds,
  },
);
expectEqual(
  presentValidExplicitOverrideBuffer.getConfig()
    .rollingBufferActiveDurationSeconds,
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override initializes runtime active duration",
);
expectEqual(
  presentValidExplicitOverrideBuffer.getState()
    .rolling_buffer_active_duration_seconds,
  presentValidExplicitOverrideDurationSeconds,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override is reflected in runtime active state",
);
expectEqual(
  presentValidExplicitOverrideBuffer.capacityBytes,
  presentValidExplicitOverrideDurationSeconds * 2,
  "present valid explicit ROLLING_BUFFER_DURATION_SECONDS override sizes the rolling buffer from active duration",
);

const customizedRollingBufferDurationExposureCases = [
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  manualRollingBufferDurationSeconds,
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
];
for (
  const customizedActiveDurationSeconds of customizedRollingBufferDurationExposureCases
) {
  const customizedDurationConfig = createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds: customizedActiveDurationSeconds,
  });
  const customizedDurationBuffer = createOnDeviceCircularAudioBuffer(
    {
      sampleRateHz: 8,
      channelCount: 1,
      bytesPerSample: 1,
    },
    {
      rollingBufferActiveDurationSeconds: customizedActiveDurationSeconds,
    },
  );
  const customizedDurationSerializedState = JSON.parse(
    JSON.stringify(customizedDurationBuffer),
  );

  expectEqual(
    customizedDurationConfig.rollingBufferDefaultDurationSeconds,
    15,
    `customized active duration ${customizedActiveDurationSeconds} exposes immutable camelCase default as 15 seconds`,
  );
  expectEqual(
    customizedDurationConfig[ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD],
    15,
    `customized active duration ${customizedActiveDurationSeconds} exposes immutable schema default as 15 seconds`,
  );
  expectEqual(
    customizedDurationConfig.rollingBufferActiveDurationSeconds,
    customizedActiveDurationSeconds,
    `customized active duration ${customizedActiveDurationSeconds} stays separate from the immutable default`,
  );
  expectVisibleRollingBufferDurations(
    customizedDurationBuffer.getState(),
    customizedActiveDurationSeconds,
    `customized active duration ${customizedActiveDurationSeconds} buffer state`,
  );
  expectVisibleRollingBufferDurations(
    customizedDurationSerializedState,
    customizedActiveDurationSeconds,
    `customized active duration ${customizedActiveDurationSeconds} serialized buffer state`,
  );
  expectEqual(
    resolveRollingBufferNoOverrideActiveDurationSeconds(),
    15,
    `customized active duration ${customizedActiveDurationSeconds} leaves the no-override resolver pinned to the immutable default`,
  );
  expectEqual(
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
    15,
    `customized active duration ${customizedActiveDurationSeconds} leaves the authoritative default binding unchanged`,
  );
}

const focusedConfiguredDurationSeconds = 2;
const focusedConfiguredDurationBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 1,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: focusedConfiguredDurationSeconds,
  },
);
expectEqual(
  focusedConfiguredDurationBuffer.getConfig().rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "focused configured-duration initialization keeps the immutable 15-second default visible",
);
expectEqual(
  focusedConfiguredDurationBuffer.getConfig().rollingBufferActiveDurationSeconds,
  focusedConfiguredDurationSeconds,
  "focused configured-duration initialization uses the configured active duration",
);
expectEqual(
  focusedConfiguredDurationBuffer.capacityBytes,
  focusedConfiguredDurationSeconds,
  "focused configured-duration initialization sizes capacity from the configured active duration",
);
expectEqual(
  focusedConfiguredDurationBuffer.capacityBytes ===
    ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  false,
  "focused configured-duration initialization does not size capacity from the 15-second default",
);
focusedConfiguredDurationBuffer.append(Uint8Array.from([1, 2]), {
  timestampMs: 2000,
});
focusedConfiguredDurationBuffer.append(Uint8Array.from([3]), {
  timestampMs: 3000,
});
expectArrayEqual(
  focusedConfiguredDurationBuffer.read(),
  [2, 3],
  "focused configured-duration initialization evicts with the configured active duration instead of the default duration",
);
expectEqual(
  focusedConfiguredDurationBuffer.getState().availableDurationSeconds,
  focusedConfiguredDurationSeconds,
  "focused configured-duration initialization reports the configured active duration at runtime",
);

const focusedRuntimeConfiguredDurationSeconds = 4;
const focusedRuntimeConfiguredDurationBuffer =
  createOnDeviceCircularAudioBuffer({
    sampleRateHz: 1,
    channelCount: 1,
    bytesPerSample: 1,
  });
focusedRuntimeConfiguredDurationBuffer.append(
  Uint8Array.from(
    { length: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS },
    (_, index) => index + 1,
  ),
  {
    timestampMs: ROLLING_BUFFER_DEFAULT_DURATION_SECONDS * 1000,
  },
);
const focusedRuntimeConfiguredDurationConfig =
  focusedRuntimeConfiguredDurationBuffer.updateActiveRollingBufferDurationSeconds(
    focusedRuntimeConfiguredDurationSeconds,
  );
expectEqual(
  focusedRuntimeConfiguredDurationConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "focused runtime duration update keeps the immutable 15-second default visible",
);
expectEqual(
  focusedRuntimeConfiguredDurationConfig.rollingBufferActiveDurationSeconds,
  focusedRuntimeConfiguredDurationSeconds,
  "focused runtime duration update applies the configured active duration",
);
expectEqual(
  focusedRuntimeConfiguredDurationBuffer.capacityBytes,
  focusedRuntimeConfiguredDurationSeconds,
  "focused runtime duration update recalculates capacity from the configured active duration",
);
expectArrayEqual(
  focusedRuntimeConfiguredDurationBuffer.read(),
  [12, 13, 14, 15],
  "focused runtime duration update prunes retained audio to the configured active duration instead of the 15-second default",
);
expectEqual(
  focusedRuntimeConfiguredDurationBuffer.pruneToActiveRollingWindow(16000),
  1,
  "focused runtime pruning uses the configured active duration window",
);
expectArrayEqual(
  focusedRuntimeConfiguredDurationBuffer.read(),
  [13, 14, 15],
  "focused runtime pruning keeps only audio inside the configured active duration",
);

const runtimeUpdatedDurationBuffer = createOnDeviceCircularAudioBuffer({
  sampleRateHz: 4,
  channelCount: 1,
  bytesPerSample: 1,
});
runtimeUpdatedDurationBuffer.append(
  Uint8Array.from({ length: 20 }, (_, index) => index + 1),
  {
    timestampMs: 5000,
  },
);
const runtimeUpdatedDurationConfig =
  runtimeUpdatedDurationBuffer.updateActiveRollingBufferDurationSeconds(2);
expectEqual(
  runtimeUpdatedDurationConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "runtime rolling buffer duration update preserves the immutable default duration",
);
expectEqual(
  runtimeUpdatedDurationConfig.rollingBufferActiveDurationSeconds,
  2,
  "runtime rolling buffer duration update applies the configured active duration",
);
expectEqual(
  runtimeUpdatedDurationConfig.rollingBufferDurationSeconds,
  2,
  "runtime rolling buffer duration update keeps the deprecated alias tied to active duration",
);
expectEqual(
  runtimeUpdatedDurationBuffer.capacityBytes,
  8,
  "runtime rolling buffer duration update recalculates capacity from the active duration",
);
expectEqual(
  runtimeUpdatedDurationBuffer.getState().availableDurationSeconds,
  2,
  "runtime rolling buffer duration update immediately reports the active duration window",
);
expectArrayEqual(
  runtimeUpdatedDurationBuffer.read(),
  [13, 14, 15, 16, 17, 18, 19, 20],
  "runtime rolling buffer duration update prunes audio outside the new active window",
);
runtimeUpdatedDurationBuffer.append(Uint8Array.from([21, 22, 23, 24]), {
  timestampMs: 6000,
});
expectArrayEqual(
  runtimeUpdatedDurationBuffer.read(),
  [17, 18, 19, 20, 21, 22, 23, 24],
  "runtime rolling buffer appends continue using the configured active duration",
);
runtimeUpdatedDurationBuffer.updateActiveRollingBufferDurationSeconds(3);
expectEqual(
  runtimeUpdatedDurationBuffer.capacityBytes,
  12,
  "later runtime rolling buffer duration changes do not fall back to the stale default capacity",
);
expectEqual(
  runtimeUpdatedDurationBuffer.getState().rollingBufferActiveDurationSeconds,
  3,
  "later runtime rolling buffer duration changes update active state",
);
expectArrayEqual(
  runtimeUpdatedDurationBuffer.read(),
  [17, 18, 19, 20, 21, 22, 23, 24],
  "expanding the runtime rolling buffer window preserves already retained local audio",
);

expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
  "rollingBufferActiveDurationSeconds",
  "rolling buffer user settings document the active-duration customization key",
);
expectEqual(
  Object.isFrozen(ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION),
  true,
  "rolling buffer active-duration configuration option is immutable",
);
expectEqual(
  ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  "seconds",
  "rolling buffer duration configuration declares seconds as its unit",
);
expectEqual(
  ROLLING_BUFFER_DURATION_UNIT,
  ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  "rolling buffer duration unit alias points at the seconds unit",
);
expectEqual(
  ROLLING_BUFFER_DURATION_CONFIG_OPTION,
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION,
  "rolling buffer duration configuration option aliases the active-duration option",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.key,
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_KEY,
  "rolling buffer duration configuration option targets the active-duration key",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.source,
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE,
  "rolling buffer duration configuration option references the explicit customization source",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.unit,
  ROLLING_BUFFER_DURATION_UNIT_SECONDS,
  "rolling buffer duration configuration option exposes seconds as the unit",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.defaultValueSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer duration configuration option exposes the 15-second default value",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.sourceDefaultValueSeconds,
  ROLLING_BUFFER_DURATION_SECONDS,
  "rolling buffer duration configuration option defaults the explicit source from the authoritative default",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.mapsOnlyTo,
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  "rolling buffer duration configuration option maps the explicit source only to active duration",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  1,
  "rolling buffer duration configuration exposes the minimum valid duration in seconds",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.minValueSeconds,
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  "rolling buffer duration configuration option exposes its minimum valid value",
);
expectEqual(
  ROLLING_BUFFER_MIN_DURATION_SECONDS,
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  "rolling buffer minimum duration alias points at the active-duration range",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  60,
  "rolling buffer duration configuration exposes the maximum valid duration in seconds",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.maxValueSeconds,
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  "rolling buffer duration configuration option exposes its maximum valid value",
);
expectEqual(
  ROLLING_BUFFER_MAX_DURATION_SECONDS,
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  "rolling buffer maximum duration alias points at the active-duration range",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.customizationSource,
  ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
  "rolling buffer duration configuration option documents the explicit customization source",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_CONFIG_OPTION.customizationAllowed,
  true,
  "rolling buffer duration configuration option documents explicit customization support",
);
expectEqual(
  ROLLING_BUFFER_CUSTOMIZATION_SOURCE,
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  "rolling buffer customization source points at the explicit duration binding",
);
expectIncludes(
  projectReadmeSource,
  "ROLLING_BUFFER_CUSTOMIZATION_SOURCE",
  "README documents the rolling-buffer customization source binding",
);
expectIncludes(
  projectReadmeSource,
  "rollingBufferCustomizationSource: \"ROLLING_BUFFER_DURATION_SECONDS\"",
  "README documents the persisted active-duration customization override source",
);
expectIncludes(
  projectReadmeSource,
  "rollingBufferDefaultConfigName: \"ROLLING_BUFFER_DEFAULT_DURATION_SECONDS\"",
  "README documents the immutable default config binding separately from the override",
);
expectIncludes(
  projectReadmeSource,
  "rolling_buffer_active_duration_seconds",
  "README documents the resolved active rolling-buffer duration field",
);
expectIncludes(
  projectReadmeSource,
  "rolling_buffer_default_duration_seconds",
  "README documents the immutable default rolling-buffer duration field",
);
expectIncludes(
  projectReadmeSource,
  "활성 길이만 해당 초 수로 바뀌고",
  "README documents that customization changes only the active duration",
);
expectIncludes(
  projectReadmeSource,
  "수동 변경 소스로 사용할 수 없습니다",
  "README documents that deprecated duration aliases are not customization sources",
);
expectEqual(
  ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
  "ROLLING_BUFFER_DEFAULT_DURATION_SECONDS",
  "rolling buffer persistence names the immutable default source without storing a replacement value",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA_VERSION,
  1,
  "rolling buffer config schema exposes a pinned schema version",
);
expectEqual(
  Object.isFrozen(ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA),
  true,
  "rolling buffer config schema is immutable",
);
expectEqual(
  Object.isFrozen(ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields),
  true,
  "rolling buffer config schema fields are immutable",
);
expectEqual(
  ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
  "rolling_buffer_default_duration_seconds",
  "rolling buffer config schema names the immutable default duration field",
);
expectEqual(
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  "rolling_buffer_active_duration_seconds",
  "rolling buffer config schema names the active duration field",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD
  ].defaultValueSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config schema fixes the default duration field at 15 seconds",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD
  ].fixedValueSeconds,
  15,
  "rolling buffer config schema exposes the immutable default duration value as 15 seconds",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ].defaultValueSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config schema initializes active duration from the immutable 15-second default",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ].resolvesDefaultFrom,
  ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD,
  "rolling buffer config schema documents active duration resolution from the default duration field",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ].customizationSource,
  ROLLING_BUFFER_DURATION_CONFIG_SOURCE_NAME,
  "rolling buffer config schema documents the explicit active-duration override source",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ].customizationDefaultValueSeconds,
  ROLLING_BUFFER_DURATION_SECONDS,
  "rolling buffer config schema defaults the explicit override source from the authoritative default",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD
  ].mapsOnlyTo,
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  "rolling buffer config schema maps the explicit override source only to active duration",
);
expectEqual(
  ROLLING_AUDIO_BUFFER_CONFIG_SCHEMA.fields[
    ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD
  ].aliasFor,
  ROLLING_BUFFER_ACTIVE_DURATION_SCHEMA_FIELD,
  "deprecated snake_case duration schema field aliases the active duration only",
);

const persistedRollingBufferSettings = await persistRollingBufferUserSettings(
  createMemorySettingsStorage(),
  customRollingConfig,
  { updatedAtMs: 1700000000000 },
);
expectEqual(
  persistedRollingBufferSettings.schemaVersion,
  ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
  "rolling buffer persisted user settings expose a schema version",
);
expectEqual(
  persistedRollingBufferSettings.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer persisted user settings keep the active duration",
);
expectEqual(
  persistedRollingBufferSettings.rollingBufferDefaultConfigName,
  ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
  "rolling buffer persisted user settings reference the immutable default config name",
);
expectEqual(
  "rollingBufferDefaultDurationSeconds" in persistedRollingBufferSettings,
  false,
  "rolling buffer persisted user settings do not store an override for the default duration",
);
expectEqual(
  "rollingBufferDurationSeconds" in persistedRollingBufferSettings,
  false,
  "rolling buffer persisted user settings do not store the deprecated ambiguous duration alias",
);
expectDefaultRollingBufferDurationPinned(
  "after persisting manual active-duration customization",
);

const rollingBufferSettingsStorage = createMemorySettingsStorage();
const savedRollingBufferSettings = await saveRollingBufferUserSettings(
  rollingBufferSettingsStorage,
  customRollingConfig,
  { updatedAtMs: 1700000000123 },
);
const serializedRollingBufferSettings = rollingBufferSettingsStorage.values.get(
  ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY,
);
const savedRollingBufferSettingsRecord = JSON.parse(
  serializedRollingBufferSettings,
);

expectEqual(
  rollingBufferSettingsStorage.writes.length,
  1,
  "rolling buffer user settings save writes one storage record",
);
expectEqual(
  rollingBufferSettingsStorage.writes[0][0],
  ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY,
  "rolling buffer user settings save uses the documented storage key",
);
expectEqual(
  savedRollingBufferSettings.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer user settings save returns the active duration",
);
expectEqual(
  savedRollingBufferSettingsRecord.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer user settings serialize the active duration",
);
expectEqual(
  "rollingBufferDefaultDurationSeconds" in savedRollingBufferSettingsRecord,
  false,
  "rolling buffer user settings save never serializes a default-duration override",
);
expectDefaultRollingBufferDurationPinned(
  "after saving manual active-duration settings to storage",
);

const restoredRollingBufferSettings = await loadRollingBufferUserSettings(
  createMemorySettingsStorage({
    [ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY]: JSON.stringify({
      schemaVersion: ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
      rollingBufferDefaultDurationSeconds: 30,
      rollingBufferDurationSeconds: 4,
      rollingBufferActiveDurationSeconds: manualRollingBufferDurationSeconds,
      updatedAtMs: 1700000000456,
    }),
  }),
);
expectEqual(
  restoredRollingBufferSettings.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer user settings load restores the active duration before the deprecated alias",
);
expectEqual(
  "rollingBufferDefaultDurationSeconds" in restoredRollingBufferSettings,
  false,
  "rolling buffer user settings load discards any persisted default-duration override",
);
expectDefaultRollingBufferDurationPinned(
  "after loading settings with a persisted default-duration override",
);

const restoredRollingBufferConfig =
  await loadRollingAudioBufferConfigFromUserSettings(
    createMemorySettingsStorage({
      [ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY]:
        serializeRollingBufferUserSettings({
          rollingBufferActiveDurationSeconds:
            manualRollingBufferDurationSeconds,
          rollingBufferDefaultDurationSeconds: 30,
          updatedAtMs: 1700000000789,
        }),
    }),
  );
expectEqual(
  restoredRollingBufferConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config load preserves the immutable default duration",
);
expectEqual(
  restoredRollingBufferConfig.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer config load restores the saved active duration",
);
expectEqual(
  restoredRollingBufferConfig.rollingBufferDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer config load keeps the deprecated duration alias tied to active duration",
);
expectDefaultRollingBufferDurationPinned(
  "after loading rolling buffer config from persisted customization",
);

const legacyRollingBufferSettings = parseRollingBufferUserSettings(
  JSON.stringify({
    rollingBufferDurationSeconds: 6,
    rollingBufferDefaultDurationSeconds: 99,
    updatedAtMs: 1700000000999,
  }),
);
expectEqual(
  legacyRollingBufferSettings.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer user settings ignore the deprecated duration alias as a customization source",
);
expectEqual(
  legacyRollingBufferSettings.rollingBufferDefaultConfigName,
  ROLLING_BUFFER_DEFAULT_CONFIG_NAME,
  "rolling buffer user settings with a deprecated alias keep the immutable default source name",
);
expectDefaultRollingBufferDurationPinned(
  "after parsing deprecated duration settings with a default override",
);

const snakeCaseDeprecatedRollingBufferSettings = parseRollingBufferUserSettings(
  JSON.stringify({
    [ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD]: 8,
    updatedAtMs: 1700000001001,
  }),
);
expectEqual(
  snakeCaseDeprecatedRollingBufferSettings.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer user settings ignore direct rolling_buffer_duration_seconds edits as a customization source",
);
expectEqual(
  ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD in
    snakeCaseDeprecatedRollingBufferSettings,
  false,
  "rolling buffer user settings do not retain direct rolling_buffer_duration_seconds edits",
);
expectDefaultRollingBufferDurationPinned(
  "after parsing a direct snake_case deprecated duration edit",
);

const conflictingDeprecatedRollingBufferSettings =
  parseRollingBufferUserSettings(
    JSON.stringify({
      rollingBufferActiveDurationSeconds: manualRollingBufferDurationSeconds,
      rollingBufferDurationSeconds: 4,
      [ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD]: 8,
      updatedAtMs: 1700000001002,
    }),
  );
expectEqual(
  conflictingDeprecatedRollingBufferSettings.rollingBufferActiveDurationSeconds,
  manualRollingBufferDurationSeconds,
  "rolling buffer user settings prefer the explicit active duration over deprecated duration edits",
);
expectEqual(
  "rollingBufferDurationSeconds" in conflictingDeprecatedRollingBufferSettings,
  false,
  "rolling buffer user settings strip direct camelCase deprecated duration edits",
);
expectEqual(
  ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD in
    conflictingDeprecatedRollingBufferSettings,
  false,
  "rolling buffer user settings strip direct snake_case deprecated duration edits",
);

const configFromSnakeCaseDeprecatedRollingBufferSettings =
  await loadRollingAudioBufferConfigFromUserSettings(
    createMemorySettingsStorage({
      [ROLLING_BUFFER_USER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        [ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD]: 8,
        updatedAtMs: 1700000001003,
      }),
    }),
  );
expectEqual(
  configFromSnakeCaseDeprecatedRollingBufferSettings
    .rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "rolling buffer config load ignores direct rolling_buffer_duration_seconds storage edits",
);
expectEqual(
  configFromSnakeCaseDeprecatedRollingBufferSettings[
    ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD
  ],
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "loaded rolling buffer config exposes rolling_buffer_duration_seconds only as the resolved active-duration alias",
);

const defaultRollingBufferSettings = await loadRollingBufferUserSettings(
  createMemorySettingsStorage(),
);
expectEqual(
  defaultRollingBufferSettings.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "missing rolling buffer user settings resolve active duration from the immutable default",
);
expectDefaultRollingBufferDurationPinned(
  "after resolving missing rolling-buffer user settings",
);

const initialRollingBufferConfig =
  await loadRollingAudioBufferConfigFromUserSettings(
    createMemorySettingsStorage(),
  );
expectEqual(
  initialRollingBufferConfig.rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "initial rolling buffer config resolves the immutable default duration to 15 seconds",
);
expectEqual(
  initialRollingBufferConfig.rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "initial active rolling buffer duration is set to the 15-second default",
);
expectEqual(
  initialRollingBufferConfig.rollingBufferDurationSeconds,
  initialRollingBufferConfig.rollingBufferActiveDurationSeconds,
  "initial rolling buffer legacy duration alias is tied to the active default",
);

const monoPcm16Capacity = deriveCircularAudioBufferCapacity(
  {
    sampleRateHz: 16000,
    channelCount: 1,
    bytesPerSample: 2,
  },
  15,
);

expectEqual(monoPcm16Capacity.capacityFrames, 240000, "mono frame capacity");
expectEqual(monoPcm16Capacity.frameSizeBytes, 2, "mono frame byte size");
expectEqual(monoPcm16Capacity.bytesPerSecond, 32000, "mono byte rate");
expectEqual(monoPcm16Capacity.capacityBytes, 480000, "mono byte capacity");

const stereoFloatCapacity = deriveCircularAudioBufferCapacity(
  {
    sampleRateHz: 48000,
    channelCount: 2,
    bytesPerSample: 4,
  },
  2,
);

expectEqual(stereoFloatCapacity.capacityFrames, 96000, "stereo frame capacity");
expectEqual(stereoFloatCapacity.frameSizeBytes, 8, "stereo frame byte size");
expectEqual(stereoFloatCapacity.bytesPerSecond, 384000, "stereo byte rate");
expectEqual(stereoFloatCapacity.capacityBytes, 768000, "stereo byte capacity");

const circularConfig = createCircularAudioBufferConfig(
  {
    sampleRateHz: 8000,
    channelCount: 1,
    bytesPerSample: 2,
  },
  {
    rollingBufferActiveDurationSeconds: 3,
  },
);

expectEqual(
  circularConfig.circularBufferCapacity.capacityBytes,
  48000,
  "circular buffer capacity uses active format and configured duration",
);
expectEqual(
  circularConfig.bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "circular buffer config keeps audio in ephemeral memory",
);
expectEqual(
  "persistenceAdapter" in circularConfig,
  false,
  "circular buffer config exposes no automatic persistence adapter",
);

const configuredDurationBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1.5,
  },
);

expectEqual(
  configuredDurationBuffer.capacityBytes,
  6,
  "configured duration controls over-capacity byte window",
);
expectEqual(
  configuredDurationBuffer.getState().rollingBufferDefaultDurationSeconds,
  ROLLING_BUFFER_DEFAULT_DURATION_SECONDS,
  "configured rolling buffer state preserves the immutable default duration",
);
expectEqual(
  configuredDurationBuffer.getState().rollingBufferActiveDurationSeconds,
  1.5,
  "configured rolling buffer state reports the manually resolved active duration",
);
expectEqual(
  configuredDurationBuffer.getState().rollingBufferDurationSeconds,
  configuredDurationBuffer.getState().rollingBufferActiveDurationSeconds,
  "configured rolling buffer state keeps the deprecated duration alias tied to active duration",
);
configuredDurationBuffer.append(Uint8Array.from([1, 2, 3, 4]));
configuredDurationBuffer.append(Uint8Array.from([5, 6, 7, 8]));
expectArrayEqual(
  configuredDurationBuffer.read(),
  [3, 4, 5, 6, 7, 8],
  "over-capacity audio discards samples older than the configured duration",
);
expectArrayEqual(
  configuredDurationBuffer.read(8),
  [3, 4, 5, 6, 7, 8],
  "over-capacity read exposes only retained configured duration",
);
expectEqual(
  configuredDurationBuffer.getState().availableDurationSeconds,
  1.5,
  "over-capacity state reports only the retained configured duration",
);
configuredDurationBuffer.append(
  Uint8Array.from([9, 10, 11, 12, 13, 14, 15, 16]),
);
expectArrayEqual(
  configuredDurationBuffer.read(),
  [11, 12, 13, 14, 15, 16],
  "oversized append retains only most recent configured duration",
);

const onDeviceBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);

expectEqual(onDeviceBuffer.capacityBytes, 4, "on-device buffer byte capacity");
expectEqual(
  onDeviceBuffer.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "on-device buffer advertises local storage",
);
expectEqual(
  onDeviceBuffer.getState().bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "on-device buffer state advertises ephemeral memory storage",
);
expectArrayEqual(onDeviceBuffer.read(), [], "new buffer reads empty");

expectEqual(
  onDeviceBuffer.append(Uint8Array.from([1, 2])),
  2,
  "append returns accepted byte length",
);
expectArrayEqual(onDeviceBuffer.read(), [1, 2], "append preserves new samples");

onDeviceBuffer.append(Uint8Array.from([3, 4]));
expectArrayEqual(
  onDeviceBuffer.read(),
  [1, 2, 3, 4],
  "read returns samples oldest to newest before wrap",
);

const mutableRead = onDeviceBuffer.read();
mutableRead[0] = 99;
expectArrayEqual(
  onDeviceBuffer.read(),
  [1, 2, 3, 4],
  "read returns a copy rather than mutable storage",
);

onDeviceBuffer.append(Uint8Array.from([5, 6]));
expectArrayEqual(
  onDeviceBuffer.read(),
  [3, 4, 5, 6],
  "append overwrites oldest samples after wrap",
);
expectArrayEqual(
  onDeviceBuffer.read(2),
  [5, 6],
  "bounded read returns newest requested samples",
);
expectEqual(
  onDeviceBuffer.getState().sizeBytes,
  4,
  "state reports retained byte count",
);
expectEqual(
  onDeviceBuffer.getState().availableDurationSeconds,
  1,
  "state reports retained duration",
);

onDeviceBuffer.append(Uint8Array.from([7, 8, 9, 10, 11]));
expectArrayEqual(
  onDeviceBuffer.read(),
  [8, 9, 10, 11],
  "oversized append keeps only newest capacity window",
);

onDeviceBuffer.clear();
expectArrayEqual(onDeviceBuffer.read(), [], "clear discards retained audio");
expectEqual(onDeviceBuffer.byteLength, 0, "clear resets retained byte length");

const subarraySource = Uint8Array.from([99, 12, 13, 14, 98]).subarray(1, 4);
onDeviceBuffer.append(subarraySource);
expectArrayEqual(
  onDeviceBuffer.read(),
  [12, 13, 14],
  "append respects ArrayBufferView byte offsets",
);

const privacyBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
privacyBuffer.append(Uint8Array.from([201, 202, 203]), {
  timestampMs: 5000,
});

expectEqual(
  Object.keys(privacyBuffer).includes("storage"),
  false,
  "rolling buffer storage is not enumerable for logs or telemetry",
);
expectNotIncludes(
  JSON.stringify(privacyBuffer),
  "201",
  "rolling buffer JSON serialization redacts buffered audio",
);
expectNotIncludes(
  inspect(privacyBuffer),
  "201",
  "rolling buffer inspection redacts buffered audio",
);
expectIncludes(
  JSON.stringify(privacyBuffer),
  "persistenceSafeguards",
  "rolling buffer serialization exposes persistence safeguards",
);
expectEqual(
  privacyBuffer.getState().persistenceSafeguards.bufferStorageKind,
  AUDIO_BUFFER_STORAGE_KIND_EPHEMERAL_MEMORY,
  "persistence safeguards identify only ephemeral in-memory storage",
);
expectEqual(
  privacyBuffer.getState().persistenceSafeguards.automaticPersistenceEnabled,
  false,
  "persistence safeguards disable automatic persistence by default",
);
expectEqual(
  privacyBuffer.getState().persistenceSafeguards.automaticRetentionEnabled,
  false,
  "persistence safeguards disable automatic retention by default",
);
expectEqual(
  "persistenceAdapter" in privacyBuffer.getState().persistenceSafeguards,
  false,
  "persistence safeguards expose no persistence hook",
);

const privacyRead = privacyBuffer.read();
expectArrayEqual(
  privacyRead,
  [201, 202, 203],
  "local reads still return buffered audio for in-memory processing",
);
expectEqual(
  JSON.stringify(privacyRead),
  JSON.stringify(BUFFERED_AUDIO_REDACTION_LABEL),
  "read audio bytes redact during JSON serialization",
);
expectEqual(
  String(privacyRead),
  BUFFERED_AUDIO_REDACTION_LABEL,
  "read audio bytes redact during string coercion",
);
expectEqual(
  inspect(privacyRead),
  BUFFERED_AUDIO_REDACTION_LABEL,
  "read audio bytes redact during inspection",
);

const protectedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "privacy",
    timestampMs: 360,
    embedding: [0.7, 0.2, 0.1],
  },
  Uint8Array.from([201, 202, 203]),
);
expectEqual(
  Object.keys(protectedFrame).includes("audioBytes"),
  false,
  "captured frame audio bytes are not enumerable for logs or telemetry",
);
expectNotIncludes(
  JSON.stringify(protectedFrame),
  "201",
  "captured frame serialization excludes audio bytes",
);
expectEqual(
  JSON.stringify(protectedFrame.audioBytes),
  JSON.stringify(BUFFERED_AUDIO_REDACTION_LABEL),
  "direct audio byte serialization is redacted",
);

expectDoesNotThrow(
  () =>
    assertLogPayloadExcludesCapturedAudio({
      content: "approved transcript only",
    }),
  "application log guard allows transcript-only payloads",
);
expectThrows(
  () => assertLogPayloadExcludesCapturedAudio({ frame: protectedFrame }),
  "application log guard rejects captured audio frames",
);
expectThrows(
  () =>
    assertTelemetryPayloadExcludesCapturedAudio({
      audioBytes: Uint8Array.from([1, 2, 3]),
    }),
  "telemetry guard rejects explicit raw audio bytes",
);
try {
  assertLogPayloadExcludesCapturedAudio({ frame: protectedFrame });
  throw new Error("diagnostics guard error was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    BUFFERED_AUDIO_DIAGNOSTICS_GUARD_ERROR,
    "diagnostics guard explains log and telemetry raw audio policy",
  );
}
const logSafePayload = createLogSafePayload({
  content: "captured frame",
  frame: protectedFrame,
});
expectNotIncludes(
  JSON.stringify(logSafePayload),
  "201",
  "application log sanitizer removes captured audio byte values",
);
expectIncludes(
  JSON.stringify(logSafePayload),
  BUFFERED_AUDIO_REDACTION_LABEL,
  "application log sanitizer keeps only a redacted audio placeholder",
);
const directAudioLogArgs = createAudioSafeLogArgs(
  "direct buffered audio",
  privacyRead,
);
expectEqual(
  directAudioLogArgs[1],
  BUFFERED_AUDIO_REDACTION_LABEL,
  "application log args redact direct buffered audio arguments",
);
expectThrows(
  () => assertLogPayloadExcludesCapturedAudio([231, 232, 233]),
  "application log guard rejects direct byte-array log arguments",
);
const rejectedSaveDiagnosticsPayload = {
  event: "save rejected",
  rollingAudioBuffer: privacyBuffer,
  capturedFrame: protectedFrame,
  context: {
    audioBytes: Uint8Array.from([231, 232, 233]),
    clipId: "rejected-save-clip",
  },
};
expectThrows(
  () => assertLogPayloadExcludesCapturedAudio(rejectedSaveDiagnosticsPayload),
  "application log guard rejects rejected-save diagnostics with captured audio",
);
const rejectedSaveLogPayload = createLogSafePayload(
  rejectedSaveDiagnosticsPayload,
);
const rejectedSaveLogJson = JSON.stringify(rejectedSaveLogPayload);
expectNotIncludes(
  rejectedSaveLogJson,
  "231",
  "application log sanitizer removes nested rejected-save audio byte values",
);
expectIncludes(
  rejectedSaveLogJson,
  BUFFERED_AUDIO_REDACTION_LABEL,
  "application log sanitizer redacts nested rejected-save audio buffers",
);
expectIncludes(
  rejectedSaveLogJson,
  "rejected-save-clip",
  "application log sanitizer preserves non-audio rejection metadata",
);
const encodedCapturedAudio = "Q0FTRV9BVURJTX0JBU0U2NA==";
const encodedCapturedAudioPayload = {
  event: "captured-audio-diagnostics",
  audioBase64: encodedCapturedAudio,
  encodedAudio: "AAAA/3////8=",
  capturedAudioBytes: [241, 242, 243],
  context: {
    rawAudioBase64: "UkFXX0FVRElP",
  },
};
expectThrows(
  () => assertLogPayloadExcludesCapturedAudio(encodedCapturedAudioPayload),
  "application log guard rejects encoded captured audio fields",
);
expectThrows(
  () => assertDebugTracePayloadExcludesCapturedAudio(encodedCapturedAudioPayload),
  "debug trace guard rejects encoded captured audio fields",
);
expectThrows(
  () => assertTelemetryPayloadExcludesCapturedAudio(encodedCapturedAudioPayload),
  "telemetry guard rejects encoded captured audio fields",
);
expectThrows(
  () => assertAnalyticsPayloadExcludesCapturedAudio(encodedCapturedAudioPayload),
  "analytics guard rejects encoded captured audio fields",
);
expectThrows(
  () =>
    createNetworkSafeJsonBody({
      content: "encoded captured audio",
      audioBase64: encodedCapturedAudio,
    }),
  "network JSON body rejects encoded captured audio fields",
);
const debugTraceJson = createDebugTraceSafeJsonBody(
  encodedCapturedAudioPayload,
);
expectNotIncludes(
  debugTraceJson,
  encodedCapturedAudio,
  "debug trace sanitizer removes encoded captured audio",
);
expectNotIncludes(
  debugTraceJson,
  "241",
  "debug trace sanitizer removes raw captured audio bytes",
);
expectIncludes(
  debugTraceJson,
  BUFFERED_AUDIO_REDACTION_LABEL,
  "debug trace sanitizer keeps only redacted captured audio placeholders",
);
const debugTraceArgs = createAudioSafeDebugTraceArgs(
  "captured audio trace",
  encodedCapturedAudioPayload,
);
expectNotIncludes(
  inspect(debugTraceArgs),
  encodedCapturedAudio,
  "debug trace args remove encoded captured audio",
);
const analyticsBody = createAnalyticsSafeJsonBody(encodedCapturedAudioPayload);
expectNotIncludes(
  analyticsBody,
  encodedCapturedAudio,
  "analytics body sanitizer removes encoded captured audio",
);
expectNotIncludes(
  analyticsBody,
  "241",
  "analytics body sanitizer removes captured audio bytes",
);
const crashReportError = new Error("microphone capture failed");
Object.defineProperty(crashReportError, "capturedAudioBytes", {
  value: Uint8Array.from([221, 222, 223]),
  enumerable: true,
  configurable: true,
});
expectThrows(
  () => assertCrashReportPayloadExcludesCapturedAudio({ crashReportError }),
  "crash report guard rejects raw captured audio on errors",
);
const crashReportJson = createCrashReportSafeJsonBody({
  crashReportError,
  rawAudioBase64: encodedCapturedAudio,
});
expectNotIncludes(
  crashReportJson,
  encodedCapturedAudio,
  "crash report sanitizer removes encoded captured audio",
);
expectNotIncludes(
  crashReportJson,
  "221",
  "crash report sanitizer removes raw captured audio bytes",
);
expectIncludes(
  crashReportJson,
  "microphone capture failed",
  "crash report sanitizer preserves non-audio error metadata",
);
const safeTelemetryBody = createTelemetrySafeJsonBody({
  content: "captured frame",
  frame: protectedFrame,
});
expectNotIncludes(
  safeTelemetryBody,
  "201",
  "telemetry body sanitizer removes captured audio byte values",
);

const safeNetworkBody = createNetworkSafeJsonBody({
  content: "approved transcript only",
});
expectEqual(
  safeNetworkBody,
  JSON.stringify({ content: "approved transcript only" }),
  "network JSON body allows transcript-only payloads",
);
expectNotIncludes(
  safeNetworkBody,
  BUFFERED_AUDIO_REDACTION_LABEL,
  "network JSON body does not carry redacted buffered audio placeholders",
);
assertNetworkPayloadExcludesBufferedAudio({
  content: "approved transcript only",
});
expectThrows(
  () =>
    createNetworkSafeJsonBody({
      content: "raw buffered audio",
      audioBytes: Uint8Array.from([1, 2, 3]),
    }),
  "network JSON body rejects explicit audio bytes",
);
expectThrows(
  () =>
    createNetworkSafeJsonBody({
      content: "captured frame",
      frame: protectedFrame,
    }),
  "network JSON body rejects non-enumerable captured audio frames",
);
expectThrows(
  () =>
    createNetworkSafeJsonBody({
      content: "rolling buffer",
      rollingAudioBuffer: privacyBuffer,
    }),
  "network JSON body rejects rolling audio buffers",
);
try {
  createNetworkSafeJsonBody({ audioBytes: Uint8Array.from([4]) });
  throw new Error("network guard error was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    BUFFERED_AUDIO_NETWORK_GUARD_ERROR,
    "network guard error explains buffered audio upload policy",
  );
}

const approvedAudioSaveRequest = createApprovedAudioSaveRequest(
  createApprovedAudioSaveRequestInput(),
);
expectEqual(
  approvedAudioSaveRequest.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "audio save request requires an explicit captured-audio save intent",
);
expectEqual(
  approvedAudioSaveRequest.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "audio save request requires an explicit save action marker",
);
expectEqual(
  approvedAudioSaveRequest.approvedVoiceMatch.accepted,
  true,
  "audio save request records that an approved voice was accepted",
);
expectEqual(
  approvedAudioSaveRequest.approvedVoiceMatch.matchedVoiceId,
  "voice-alice",
  "audio save request carries the matched approved voice identity",
);
expectEqual(
  approvedAudioSaveRequest.approvedVoiceMatch.recognitionLatencyMs,
  120,
  "audio save request keeps match evidence under the latency limit",
);
const approvedAudioProfileSaveRequest = createApprovedAudioSaveRequest(
  createApprovedAudioSaveRequestInput({
    approvedVoiceMatch: {
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
    },
  }),
);
expectEqual(
  approvedAudioProfileSaveRequest.approvedVoiceMatch
    .matchedApprovedVoiceProfileId,
  "alice-profile",
  "audio save request surfaces the matched approved voice profile id",
);
expectEqual(
  approvedAudioProfileSaveRequest.approvedVoiceMatch
    .matchedApprovedVoiceLabel,
  "Alice voice",
  "audio save request surfaces the matched approved voice profile label",
);
expectEqual(
  approvedAudioProfileSaveRequest.approvedVoiceMatch
    .matchedApprovedVoiceProfileMetadata.profileId,
  "alice-profile",
  "audio save request preserves matched approved voice profile metadata",
);
expectEqual(
  approvedAudioSaveRequest.approvedUserIdentity.approvedVoiceId,
  "voice-alice",
  "audio save request records the approved voice identity",
);
expectEqual(
  approvedAudioSaveRequest.approvedUserIdentity.approvedUserId,
  "user-alice",
  "audio save request can carry the approved app user identity",
);
expectEqual(
  approvedAudioSaveRequest.userVisiblePurpose,
  "Save this audio clip for playback in the note",
  "audio save request requires a user-visible later-use purpose",
);
expectEqual(
  approvedAudioSaveRequest.purposeMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "audio save request requires explicit later-use purpose metadata",
);
expectEqual(
  approvedAudioSaveRequest.purposeMetadata.userVisiblePurpose,
  approvedAudioSaveRequest.userVisiblePurpose,
  "audio save request purpose metadata binds to the visible purpose",
);
expectEqual(
  approvedAudioSaveRequest.purposeMetadata.requestedAtMs,
  approvedAudioSaveRequest.retentionMetadata.requestedAtMs,
  "audio save request purpose metadata binds to the retention request time",
);
expectEqual(
  approvedAudioSaveRequest.retentionMetadata.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "audio save request retention is constrained to on-device storage",
);
expectEqual(
  approvedAudioSaveRequest.retentionMetadata.retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "audio save request keeps the discard-by-default retention policy",
);
expectEqual(
  Object.isFrozen(approvedAudioSaveRequest),
  true,
  "audio save request contract is immutable after validation",
);
expectDoesNotThrow(
  () => assertApprovedAudioSaveRequest(approvedAudioSaveRequest),
  "validated audio save request can pass the persistence contract guard",
);
expectDoesNotThrow(
  () => createNetworkSafeJsonBody({ saveRequest: approvedAudioSaveRequest }),
  "audio save request metadata is safe to serialize without captured audio",
);
expectThrows(
  () =>
    createNetworkSafeJsonBody({
      saveRequest: approvedAudioSaveRequest,
      audioBytes: Uint8Array.from([91, 92]),
    }),
  "audio save request metadata does not bypass network audio guards",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest({
      ...createApprovedAudioSaveRequestInput(),
      capturedAudioSaveIntent: undefined,
    }),
  "audio save request rejects missing explicit captured-audio save intent",
  "capturedAudioSaveIntent must be true",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        capturedAudioSaveIntent: false,
      }),
    ),
  "audio save request rejects false captured-audio save intent",
  "capturedAudioSaveIntent must be true",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest({
      ...createApprovedAudioSaveRequestInput(),
      saveActionKind: undefined,
    }),
  "audio save request rejects missing explicit save action",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        saveActionKind: "automatic-background-save",
      }),
    ),
  "audio save request rejects non-explicit save actions",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest({
      ...createApprovedAudioSaveRequestInput(),
      approvedVoiceMatch: undefined,
    }),
  "audio save request rejects missing approved voice match",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        approvedVoiceMatch: { accepted: false },
      }),
    ),
  "audio save request rejects non-accepted voice matches",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        approvedVoiceMatch: { matchedVoiceId: "voice-bob" },
      }),
    ),
  "audio save request rejects match identity that differs from the approved user identity",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        approvedVoiceMatch: {
          recognitionLatencyMs: APPROVED_AUDIO_SAVE_MATCH_LATENCY_LIMIT_MS,
        },
      }),
    ),
  "audio save request rejects voice matches that are not under the persistence latency limit",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        approvedUserIdentity: { approvedVoiceId: "" },
      }),
    ),
  "audio save request rejects missing approved voice identity",
);
for (const userVisiblePurpose of [undefined, null, "", " ", "\n\t"]) {
  expectThrows(
    () =>
      createApprovedAudioSaveRequest(
        createApprovedAudioSaveRequestInput({
          userVisiblePurpose,
        }),
      ),
    "audio save request rejects missing or empty user-visible later-use purpose",
    "userVisiblePurpose must be a non-empty user-visible later-use purpose",
  );
}
expectThrows(
  () =>
    createApprovedAudioSaveRequest({
      ...createApprovedAudioSaveRequestInput(),
      purposeMetadata: undefined,
    }),
  "audio save request rejects missing purpose metadata",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        purposeMetadata: { kind: "background-retention" },
      }),
    ),
  "audio save request rejects non-later-use purpose metadata",
);
for (const userVisiblePurpose of [undefined, null, "", " "]) {
  expectThrows(
    () =>
      createApprovedAudioSaveRequest(
        createApprovedAudioSaveRequestInput({
          purposeMetadata: { userVisiblePurpose },
        }),
      ),
    "audio save request rejects missing or empty visible later-use purpose metadata",
    "purposeMetadata.userVisiblePurpose must be a non-empty user-visible later-use purpose",
  );
}
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        purposeMetadata: { userVisiblePurpose: "Save for hidden analytics" },
      }),
    ),
  "audio save request rejects purpose metadata that does not match the visible purpose",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        purposeMetadata: { requestedAtMs: 1700000000001 },
      }),
    ),
  "audio save request rejects purpose metadata not bound to the retention request time",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest({
      ...createApprovedAudioSaveRequestInput(),
      retentionMetadata: undefined,
    }),
  "audio save request rejects missing retention metadata",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        retentionMetadata: { storageLocation: "cloud" },
      }),
    ),
  "audio save request rejects non-local retention storage",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        retentionMetadata: { retentionPolicy: "retain-automatically" },
      }),
    ),
  "audio save request rejects automatic retention policy metadata",
);
expectThrows(
  () =>
    createApprovedAudioSaveRequest(
      createApprovedAudioSaveRequestInput({
        retentionMetadata: {
          retentionDurationSeconds: 5,
          expiresAtMs: 1700000010000,
        },
      }),
    ),
  "audio save request rejects expiration beyond declared retention duration",
);
try {
  assertApprovedAudioSaveRequest({
    approvedUserIdentity: { approvedVoiceId: "voice-alice" },
    userVisiblePurpose: "Save for later playback",
  });
  throw new Error("audio save request contract guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "audio save request guard explains required identity purpose and retention",
  );
}

const explicitSaveAction = createApprovedAudioSaveAction(
  createApprovedAudioSaveRequestInput(),
);
const explicitSaveAuthorization =
  createApprovedAudioSaveAuthorization(explicitSaveAction);

expectEqual(
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA.schemaVersion,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  "saved audio record storage schema exposes a pinned schema version",
);
expectEqual(
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA.ownerIdentityField,
  "ownerIdentity",
  "saved audio record storage schema names the owner identity field",
);
expectEqual(
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA.userVisibleMetadataField,
  "userVisibleMetadata",
  "saved audio record storage schema names the user-visible metadata field",
);
expectEqual(
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA.retentionTimestampMsField,
  "retentionTimestampMs",
  "saved audio record storage schema names the retention timestamp field",
);
expectEqual(
  SAVED_APPROVED_AUDIO_RECORD_STORAGE_SCHEMA.retentionPurposeMetadataField,
  "retentionPurposeMetadata",
  "saved audio record storage schema names the retention purpose metadata field",
);

const defaultWindowProcessingAndRetentionBuffer =
  createOnDeviceCircularAudioBuffer({
    sampleRateHz: 1,
    channelCount: 1,
    bytesPerSample: 1,
  });
defaultWindowProcessingAndRetentionBuffer.append(Uint8Array.from([1]), {
  timestampMs: 1000,
});
defaultWindowProcessingAndRetentionBuffer.append(Uint8Array.from([2]), {
  timestampMs: 1500,
});
defaultWindowProcessingAndRetentionBuffer.append(
  Uint8Array.from([41, 42, 43]),
  {
    timestampMs: (DEFAULT_ROLLING_BUFFER_DURATION_SECONDS + 2) * 1000,
  },
);

expectEqual(
  defaultWindowProcessingAndRetentionBuffer.getConfig()
    .rollingBufferDurationSeconds,
  DEFAULT_ROLLING_BUFFER_DURATION_SECONDS,
  "processing and retention validation uses the default 15-second rolling window",
);
expectArrayEqual(
  defaultWindowProcessingAndRetentionBuffer
    .readChunks()
    .map((chunk) => chunk.timestampMs),
  [(DEFAULT_ROLLING_BUFFER_DURATION_SECONDS + 2) * 1000],
  "chunks older than the default 15-second rolling window are evicted",
);
expectEqual(
  defaultWindowProcessingAndRetentionBuffer.getState()
    .oldestRetainedAudioTimestampMs >= 2000,
  true,
  "retained audio starts after the 15-second eviction floor",
);
const defaultWindowProcessingRead =
  defaultWindowProcessingAndRetentionBuffer.read(undefined, {
    sink: "local-processing",
  });
expectArrayEqual(
  defaultWindowProcessingRead,
  [41, 42, 43],
  "processing reads cannot access chunks older than 15 seconds",
);
expectEqual(
  Array.from(defaultWindowProcessingRead).includes(1) ||
    Array.from(defaultWindowProcessingRead).includes(2),
  false,
  "stale chunk bytes are unavailable to processing after eviction",
);
const defaultWindowEvictionStore = createLocalApprovedAudioClipStore();
const defaultWindowSavedClip = saveApprovedAudioClipFromExplicitSaveAction(
  defaultWindowEvictionStore,
  {
    saveAction: explicitSaveAction,
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: defaultWindowProcessingAndRetentionBuffer,
    clipId: "default-window-retained-only-clip",
    savedAtMs: 1700000001000,
  },
);
expectArrayEqual(
  defaultWindowSavedClip.audioBytes,
  [41, 42, 43],
  "explicit retention can save only audio still inside the default 15-second window",
);
expectEqual(
  Array.from(defaultWindowSavedClip.audioBytes).includes(1) ||
    Array.from(defaultWindowSavedClip.audioBytes).includes(2),
  false,
  "stale chunk bytes are unavailable to retention after eviction",
);
expectArrayEqual(
  defaultWindowProcessingAndRetentionBuffer.read(),
  [],
  "explicit retention clears the rolling buffer after saving retained-window audio",
);

expectEqual(
  explicitSaveAction.kind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "audio save workflow marks intentional user save actions explicitly",
);
expectEqual(
  explicitSaveAction.request.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "audio save action carries the explicit captured-audio save intent",
);
expectEqual(
  explicitSaveAction.request.saveActionKind,
  explicitSaveAction.kind,
  "audio save action binds the request contract to the explicit action",
);
expectEqual(
  explicitSaveAction.request.userVisiblePurpose,
  "Save this audio clip for playback in the note",
  "audio save action carries the declared later-use purpose",
);
expectEqual(
  explicitSaveAction.request.purposeMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "audio save action carries validated purpose metadata",
);
expectEqual(
  Object.isFrozen(explicitSaveAction),
  true,
  "audio save action is immutable after validation",
);
expectDoesNotThrow(
  () => assertApprovedAudioSaveAction(explicitSaveAction),
  "explicit audio save action passes the save workflow guard",
);
expectDoesNotThrow(
  () =>
    assertApprovedAudioSaveAuthorization(
      explicitSaveAuthorization,
      explicitSaveAction,
    ),
  "explicit audio save authorization passes the raw audio persistence guard",
);
expectDoesNotThrow(
  () =>
    assertApprovedAudioClipSaveAuthorized({
      saveAction: explicitSaveAction,
      saveAuthorization: explicitSaveAuthorization,
  }),
  "explicit action plus authorization passes the clip persistence gate",
);
expectEqual(
  explicitSaveAuthorization.purposeKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "explicit save authorization binds the purpose metadata kind",
);
expectEqual(
  explicitSaveAuthorization.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "explicit save authorization carries the captured-audio save intent",
);
expectEqual(
  explicitSaveAuthorization.purposeRequestedAtMs,
  explicitSaveAction.request.purposeMetadata.requestedAtMs,
  "explicit save authorization binds the purpose metadata request time",
);
try {
  assertApprovedAudioSaveAction({
    kind: "automatic-background-save",
    request: approvedAudioSaveRequest,
  });
  throw new Error("audio save action contract guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
    "audio save action guard rejects non-explicit persistence",
  );
}

const explicitSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
explicitSaveBuffer.append(Uint8Array.from([101, 102, 103, 104]));
const approvedAudioClipStore = createLocalApprovedAudioClipStore();
expectEqual(
  approvedAudioClipStore.list().length,
  0,
  "local approved audio clip store does not persist buffered audio implicitly",
);
const savedClip = saveApprovedAudioClipFromExplicitSaveAction(
  approvedAudioClipStore,
  {
    saveAction: explicitSaveAction,
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: explicitSaveBuffer,
    clipId: "note-playback-clip",
    savedAtMs: 1700000001000,
  },
);
expectEqual(
  savedClip.clipId,
  "note-playback-clip",
  "explicit save workflow stores the requested clip id",
);
expectEqual(
  savedClip.recordSchemaVersion,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  "explicit save workflow stores the saved audio record schema version",
);
expectEqual(
  savedClip.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "explicit save workflow stores the captured-audio save intent with the clip",
);
expectEqual(
  savedClip.userVisiblePurpose,
  "Save this audio clip for playback in the note",
  "explicit save workflow stores the declared later-use purpose with the clip",
);
expectEqual(
  savedClip.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "explicit save workflow stores the explicit save action marker with the clip",
);
expectEqual(
  savedClip.purposeMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "explicit save workflow stores the validated purpose metadata with the clip",
);
expectEqual(
  savedClip.purposeMetadata.userVisiblePurpose,
  savedClip.userVisiblePurpose,
  "explicit save workflow stores purpose metadata bound to the visible purpose",
);
expectEqual(
  savedClip.purposeMetadata.requestedAtMs,
  savedClip.retentionMetadata.requestedAtMs,
  "explicit save workflow stores purpose metadata bound to the retention request",
);
expectEqual(
  savedClip.userVisibleMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "explicit save workflow stores user-visible metadata with the saved audio",
);
expectEqual(
  savedClip.userVisibleMetadata.userVisiblePurpose,
  savedClip.userVisiblePurpose,
  "explicit save workflow associates user-visible metadata with the visible purpose",
);
expectEqual(
  savedClip.userVisibleMetadata.laterUsePurpose,
  savedClip.userVisiblePurpose,
  "explicit save workflow stores the later-use purpose as user-visible saved audio metadata",
);
expectEqual(
  savedClip.userVisibleMetadata.requestedAtMs,
  savedClip.retentionMetadata.requestedAtMs,
  "explicit save workflow binds user-visible metadata to the retention request",
);
expectEqual(
  savedClip.approvedUserIdentity.approvedVoiceId,
  "voice-alice",
  "explicit save workflow keeps the approved voice identity with the clip",
);
expectEqual(
  savedClip.ownerIdentity.approvedVoiceId,
  "voice-alice",
  "explicit save workflow persists the saved audio owner voice identity",
);
expectEqual(
  savedClip.ownerIdentity.approvedUserId,
  "user-alice",
  "explicit save workflow persists the saved audio owner user identity",
);
expectEqual(
  savedClip.approvedVoiceMatch.matchedVoiceId,
  "voice-alice",
  "explicit save workflow stores the validated approved voice match with the clip",
);
expectEqual(
  savedClip.retentionTimestampMs,
  savedClip.retentionMetadata.requestedAtMs,
  "explicit save workflow persists a retention timestamp with the clip",
);
expectEqual(
  savedClip.retentionPurposeMetadata.userVisiblePurpose,
  savedClip.userVisiblePurpose,
  "explicit save workflow persists retention purpose metadata with the clip",
);
expectEqual(
  savedClip.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "explicit save workflow keeps saved audio on-device",
);
expectEqual(
  savedClip.retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "explicit save workflow preserves the discard-unless-saved policy",
);
expectEqual(
  savedClip.byteLength,
  4,
  "explicit save workflow persists the approved rolling buffer bytes",
);
expectArrayEqual(
  savedClip.audioBytes,
  [101, 102, 103, 104],
  "explicit save workflow returns a local copy of the saved audio",
);
expectArrayEqual(
  explicitSaveBuffer.read(),
  [],
  "explicit save workflow clears the rolling buffer after successful save",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "explicit save action is the only path that adds clips to the store",
);
const [listedSavedAudioRecord] = approvedAudioClipStore.list();
expectEqual(
  listedSavedAudioRecord.recordSchemaVersion,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  "saved audio records include the storage schema version",
);
expectEqual(
  listedSavedAudioRecord.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "saved audio records include the explicit save action marker",
);
expectEqual(
  listedSavedAudioRecord.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "saved audio records include the captured-audio save intent",
);
expectEqual(
  listedSavedAudioRecord.userVisiblePurpose,
  "Save this audio clip for playback in the note",
  "saved audio records include the declared visible later-use purpose",
);
expectEqual(
  listedSavedAudioRecord.purposeMetadata.kind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "saved audio records include required visible-purpose metadata kind",
);
expectEqual(
  listedSavedAudioRecord.purposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "saved audio records bind purpose metadata to the visible purpose",
);
expectEqual(
  listedSavedAudioRecord.purposeMetadata.requestedAtMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "saved audio records bind purpose metadata to the retention request time",
);
expectEqual(
  listedSavedAudioRecord.userVisibleMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "saved audio records retain the visible purpose as user-visible metadata",
);
expectEqual(
  listedSavedAudioRecord.userVisibleMetadata.laterUsePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "saved audio records retain the later-use purpose as user-visible metadata",
);
expectEqual(
  listedSavedAudioRecord.userVisibleMetadata.requestedAtMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "saved audio records bind user-visible metadata to the retention request time",
);
expectEqual(
  listedSavedAudioRecord.ownerIdentity.approvedUserId,
  "user-alice",
  "saved audio records persist the owner identity",
);
expectEqual(
  listedSavedAudioRecord.savedAtMs,
  1700000001000,
  "saved audio records persist the save timestamp",
);
expectEqual(
  listedSavedAudioRecord.retentionTimestampMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "saved audio records persist the retention timestamp",
);
expectEqual(
  listedSavedAudioRecord.retentionPurposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "saved audio records persist retention purpose metadata",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("ownerIdentity"),
  true,
  "saved audio record serialization includes owner identity",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("savedAtMs"),
  true,
  "saved audio record serialization includes the save timestamp",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("retentionTimestampMs"),
  true,
  "saved audio record serialization includes the retention timestamp",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("retentionPurposeMetadata"),
  true,
  "saved audio record serialization includes retention purpose metadata",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("userVisiblePurpose"),
  true,
  "saved audio record serialization includes the visible purpose",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("purposeMetadata"),
  true,
  "saved audio record serialization includes visible-purpose metadata",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("userVisibleMetadata"),
  true,
  "saved audio record serialization includes user-visible later-use metadata",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("saveActionKind"),
  true,
  "saved audio record serialization includes the explicit save action marker",
);
expectEqual(
  Object.keys(listedSavedAudioRecord).includes("capturedAudioSaveIntent"),
  true,
  "saved audio record serialization includes the captured-audio save intent",
);
const serializedSavedAudioRecord = JSON.parse(
  JSON.stringify(listedSavedAudioRecord),
);
expectEqual(
  serializedSavedAudioRecord.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "serialized saved audio records retain the captured-audio save intent",
);
expectEqual(
  serializedSavedAudioRecord.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "serialized saved audio records retain the explicit save action marker",
);
expectEqual(
  serializedSavedAudioRecord.ownerIdentity.approvedUserId,
  "user-alice",
  "serialized saved audio records retain owner identity",
);
expectEqual(
  serializedSavedAudioRecord.savedAtMs,
  listedSavedAudioRecord.savedAtMs,
  "serialized saved audio records retain the save timestamp",
);
expectEqual(
  serializedSavedAudioRecord.retentionTimestampMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "serialized saved audio records retain the retention timestamp",
);
expectEqual(
  serializedSavedAudioRecord.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "serialized saved audio records retain the visible purpose",
);
expectEqual(
  serializedSavedAudioRecord.purposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "serialized saved audio records retain visible purpose metadata",
);
expectEqual(
  serializedSavedAudioRecord.userVisibleMetadata.laterUsePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "serialized saved audio records retain user-visible later-use metadata",
);
expectEqual(
  serializedSavedAudioRecord.retentionPurposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "serialized saved audio records retain retention purpose metadata",
);
const retrievedSavedClip = approvedAudioClipStore.get("note-playback-clip");
expectEqual(
  retrievedSavedClip.ownerIdentity.approvedUserId,
  "user-alice",
  "retrieved saved audio records include owner identity",
);
expectEqual(
  retrievedSavedClip.savedAtMs,
  listedSavedAudioRecord.savedAtMs,
  "retrieved saved audio records include the save timestamp",
);
expectEqual(
  retrievedSavedClip.retentionTimestampMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "retrieved saved audio records include the retention timestamp",
);
expectEqual(
  retrievedSavedClip.saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "retrieved saved audio records include the explicit save action marker",
);
expectEqual(
  retrievedSavedClip.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "retrieved saved audio records include the captured-audio save intent",
);
expectEqual(
  retrievedSavedClip.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "retrieved saved audio records include the visible purpose",
);
expectEqual(
  retrievedSavedClip.purposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "retrieved saved audio records include visible-purpose metadata",
);
expectEqual(
  retrievedSavedClip.userVisibleMetadata.laterUsePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "retrieved saved audio records include user-visible later-use metadata",
);
expectEqual(
  retrievedSavedClip.retentionPurposeMetadata.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "retrieved saved audio records include retention purpose metadata",
);
expectArrayEqual(
  retrievedSavedClip.audioBytes,
  [101, 102, 103, 104],
  "saved clip can be retrieved locally for the declared later use",
);
retrievedSavedClip.audioBytes[0] = 0;
expectArrayEqual(
  approvedAudioClipStore.get("note-playback-clip").audioBytes,
  [101, 102, 103, 104],
  "saved clip retrieval returns copies instead of exposing mutable store bytes",
);
const savedAudioRecordView =
  createSavedApprovedAudioRecordView(listedSavedAudioRecord);
expectEqual(
  savedAudioRecordView.clipId,
  "note-playback-clip",
  "saved audio record view identifies the retained clip",
);
expectEqual(
  savedAudioRecordView.retentionReason,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
  "saved audio record view explains that retention came from an explicit later-use save",
);
expectEqual(
  savedAudioRecordView.capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "saved audio record view exposes the captured-audio save intent",
);
expectIncludes(
  savedAudioRecordView.retainedBecause,
  savedAudioRecordView.userVisiblePurpose,
  "saved audio record view includes the user-visible retention purpose",
);
expectEqual(
  savedAudioRecordView.userVisiblePurpose,
  listedSavedAudioRecord.userVisiblePurpose,
  "saved audio record view carries the visible purpose users use to identify why audio was retained",
);
expectEqual(
  savedAudioRecordView.userVisibleMetadata.userVisiblePurpose,
  savedAudioRecordView.userVisiblePurpose,
  "saved audio record view exposes user-visible metadata associated with the saved audio",
);
expectEqual(
  savedAudioRecordView.userVisibleMetadata.laterUsePurpose,
  savedAudioRecordView.userVisiblePurpose,
  "saved audio record view exposes the later-use purpose as user-visible metadata",
);
expectEqual(
  savedAudioRecordView.ownerIdentity.approvedUserId,
  "user-alice",
  "saved audio record view exposes the approved owner identity",
);
expectEqual(
  savedAudioRecordView.approvedVoiceMatch.matchedVoiceId,
  "voice-alice",
  "saved audio record view exposes the approved voice match metadata",
);
expectEqual(
  savedAudioRecordView.retentionTimestampMs,
  listedSavedAudioRecord.retentionMetadata.requestedAtMs,
  "saved audio record view exposes the retention request timestamp",
);
expectEqual(
  savedAudioRecordView.retentionExpiresAtMs,
  listedSavedAudioRecord.retentionMetadata.expiresAtMs,
  "saved audio record view exposes the retention expiration timestamp",
);
expectEqual(
  savedAudioRecordView.storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "saved audio record view exposes local-only storage metadata",
);
expectEqual(
  savedAudioRecordView.byteLength,
  listedSavedAudioRecord.byteLength,
  "saved audio record view exposes clip size metadata without raw audio",
);
expectEqual(
  "audioBytes" in savedAudioRecordView,
  false,
  "saved audio record view excludes raw audio bytes",
);
expectEqual(
  Object.keys(savedAudioRecordView).includes("audioBytes"),
  false,
  "saved audio record view serialization excludes raw audio bytes",
);
expectDoesNotThrow(
  () =>
    createNetworkSafeJsonBody({
      savedAudioRecordViews: [savedAudioRecordView],
    }),
  "saved audio record view is safe for user-facing metadata APIs",
);
expectDoesNotThrow(
  () =>
    assertLogPayloadExcludesCapturedAudio({
      savedAudioRecordView,
    }),
  "saved audio record view is safe for user-facing record diagnostics",
);
const [listedSavedAudioRecordView] =
  listSavedApprovedAudioRecordViews(approvedAudioClipStore);
expectEqual(
  listedSavedAudioRecordView.retainedBecause,
  savedAudioRecordView.retainedBecause,
  "saved audio record list API exposes why each retained audio item was kept",
);
expectEqual(
  listedSavedAudioRecordView.retentionReason,
  savedAudioRecordView.retentionReason,
  "saved audio record list API exposes the explicit retention reason",
);
expectEqual(
  listedSavedAudioRecordView.userVisiblePurpose,
  savedAudioRecordView.userVisiblePurpose,
  "saved audio record list API exposes the visible later-use purpose",
);
expectEqual(
  listedSavedAudioRecordView.userVisibleMetadata.laterUsePurpose,
  savedAudioRecordView.userVisiblePurpose,
  "saved audio record list API exposes user-visible later-use metadata",
);
const retrievedSavedAudioRecordView = getSavedApprovedAudioRecordView(
  approvedAudioClipStore,
  "note-playback-clip",
);
expectEqual(
  retrievedSavedAudioRecordView.retentionReason,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
  "saved audio record get API exposes the explicit retention reason",
);
expectEqual(
  getSavedApprovedAudioRecordView(approvedAudioClipStore, "missing-clip"),
  null,
  "saved audio record get API returns null for missing records",
);
expectThrows(
  () =>
    createSavedApprovedAudioRecordView({
      ...listedSavedAudioRecord,
      userVisibleMetadata: {
        ...listedSavedAudioRecord.userVisibleMetadata,
        laterUsePurpose: "Save for hidden analytics",
      },
    }),
  "saved audio record view rejects user-visible metadata that is not associated with the saved purpose",
  APPROVED_AUDIO_CLIP_STORE_CONTRACT_ERROR,
);
expectNotIncludes(
  JSON.stringify(savedAudioRecordView),
  "audioBytes",
  "serialized saved audio record view contains only metadata",
);
expectEqual(
  Object.keys(savedClip).includes("audioBytes"),
  false,
  "saved clip keeps audio bytes out of default serialization",
);
expectThrows(
  () => createNetworkSafeJsonBody({ savedClip }),
  "saved clip audio remains local-only and is rejected from network payloads",
);
expectThrows(
  () => assertLogPayloadExcludesCapturedAudio({ savedClip }),
  "application log guard rejects saved clip raw audio without diagnostics authorization",
);
expectThrows(
  () => assertTelemetryPayloadExcludesCapturedAudio({ savedClip }),
  "telemetry guard rejects saved clip raw audio without diagnostics authorization",
);
const savedClipTelemetryPayload = createTelemetrySafePayload({ savedClip });
expectNotIncludes(
  JSON.stringify(savedClipTelemetryPayload),
  "101",
  "telemetry sanitizer removes saved clip audio bytes",
);
expectIncludes(
  JSON.stringify(savedClipTelemetryPayload),
  "byteLength",
  "telemetry sanitizer preserves non-audio saved clip metadata",
);
const durableApprovedAudioWrites = [];
const durableApprovedAudioClipStore = createDurableApprovedAudioClipStore({
  write(clip) {
    assertDurableApprovedAudioClipWriteAllowed(clip);
    durableApprovedAudioWrites.push({
      recordSchemaVersion: clip.recordSchemaVersion,
      clipId: clip.clipId,
      audioBytes: Array.from(clip.audioBytes),
      capturedAudioSaveIntent: clip.capturedAudioSaveIntent,
      saveActionKind: clip.saveActionKind,
      savedAtMs: clip.savedAtMs,
      ownerUserId: clip.ownerIdentity.approvedUserId,
      approvedVoiceId: clip.approvedUserIdentity.approvedVoiceId,
      matchedVoiceId: clip.approvedVoiceMatch.matchedVoiceId,
      userVisiblePurpose: clip.userVisiblePurpose,
      userVisibleMetadataPurpose: clip.userVisibleMetadata.userVisiblePurpose,
      userVisibleMetadataLaterUsePurpose:
        clip.userVisibleMetadata.laterUsePurpose,
      purposeKind: clip.purposeMetadata.kind,
      userVisibleMetadataKind: clip.userVisibleMetadata.kind,
      retentionPurposeKind: clip.retentionPurposeMetadata.kind,
      purposeRequestedAtMs: clip.purposeMetadata.requestedAtMs,
      userVisibleMetadataRequestedAtMs: clip.userVisibleMetadata.requestedAtMs,
      retentionPurposeRequestedAtMs:
        clip.retentionPurposeMetadata.requestedAtMs,
      retentionRequestedAtMs: clip.retentionMetadata.requestedAtMs,
      retentionTimestampMs: clip.retentionTimestampMs,
      storageLocation: clip.storageLocation,
      retentionPolicy: clip.retentionPolicy,
    });
  },
});
const durableExplicitSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
durableExplicitSaveBuffer.append(Uint8Array.from([131, 132, 133]));
const durableSavedClip = saveApprovedAudioClipFromExplicitSaveAction(
  durableApprovedAudioClipStore,
  {
    saveAction: explicitSaveAction,
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: durableExplicitSaveBuffer,
    clipId: "durable-note-playback-clip",
    savedAtMs: 1700000002000,
  },
);
expectEqual(
  durableApprovedAudioWrites.length,
  1,
  "durable approved audio path writes exactly once for a validated explicit save",
);
expectArrayEqual(
  durableApprovedAudioWrites[0].audioBytes,
  [131, 132, 133],
  "durable approved audio path writes captured audio only after validation",
);
expectEqual(
  durableApprovedAudioWrites[0].recordSchemaVersion,
  SAVED_APPROVED_AUDIO_RECORD_SCHEMA_VERSION,
  "durable approved audio write includes the saved audio record schema version",
);
expectEqual(
  durableApprovedAudioWrites[0].capturedAudioSaveIntent,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  "durable approved audio write includes the captured-audio save intent",
);
expectEqual(
  durableApprovedAudioWrites[0].saveActionKind,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  "durable approved audio write includes the validated explicit save action",
);
expectEqual(
  durableApprovedAudioWrites[0].savedAtMs,
  1700000002000,
  "durable approved audio write includes the save timestamp",
);
expectEqual(
  durableApprovedAudioWrites[0].ownerUserId,
  "user-alice",
  "durable approved audio write includes the owner user identity",
);
expectEqual(
  durableApprovedAudioWrites[0].approvedVoiceId,
  "voice-alice",
  "durable approved audio write includes the approved user voice identity",
);
expectEqual(
  durableApprovedAudioWrites[0].matchedVoiceId,
  "voice-alice",
  "durable approved audio write includes the approved voice match",
);
expectEqual(
  durableApprovedAudioWrites[0].userVisiblePurpose,
  "Save this audio clip for playback in the note",
  "durable approved audio write includes the user-visible later-use purpose",
);
expectEqual(
  durableApprovedAudioWrites[0].userVisibleMetadataPurpose,
  durableApprovedAudioWrites[0].userVisiblePurpose,
  "durable approved audio write includes user-visible saved audio metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].userVisibleMetadataLaterUsePurpose,
  durableApprovedAudioWrites[0].userVisiblePurpose,
  "durable approved audio write associates the later-use purpose with the saved audio",
);
expectEqual(
  durableApprovedAudioWrites[0].purposeKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "durable approved audio write includes validated purpose metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].userVisibleMetadataKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "durable approved audio write includes a user-visible metadata purpose kind",
);
expectEqual(
  durableApprovedAudioWrites[0].retentionPurposeKind,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  "durable approved audio write includes retention purpose metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].purposeRequestedAtMs,
  durableApprovedAudioWrites[0].retentionRequestedAtMs,
  "durable approved audio write binds purpose metadata to retention metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].userVisibleMetadataRequestedAtMs,
  durableApprovedAudioWrites[0].retentionRequestedAtMs,
  "durable approved audio write binds user-visible metadata to retention metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].retentionPurposeRequestedAtMs,
  durableApprovedAudioWrites[0].retentionRequestedAtMs,
  "durable approved audio write binds retention purpose metadata to retention metadata",
);
expectEqual(
  durableApprovedAudioWrites[0].retentionTimestampMs,
  durableApprovedAudioWrites[0].retentionRequestedAtMs,
  "durable approved audio write includes the retention timestamp",
);
expectEqual(
  durableApprovedAudioWrites[0].storageLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "durable approved audio write remains on-device",
);
expectEqual(
  durableApprovedAudioWrites[0].retentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "durable approved audio write keeps discard-unless-saved retention metadata",
);
expectArrayEqual(
  durableSavedClip.audioBytes,
  [131, 132, 133],
  "durable approved audio path returns the saved local clip",
);
expectArrayEqual(
  durableExplicitSaveBuffer.read(),
  [],
  "durable approved audio path clears the rolling buffer after the durable write",
);
expectEqual(
  durableApprovedAudioClipStore.list().length,
  1,
  "durable approved audio path adds a saved clip only after the durable write succeeds",
);
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClip,
      audioBytes: Uint8Array.from([]),
      byteLength: 0,
    }),
  "durable approved audio write guard rejects empty captured audio",
  APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR,
);
const durableSavedClipWriteRecord = {
  ...durableSavedClip,
  audioBytes: durableSavedClip.audioBytes,
};
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClipWriteRecord,
      ownerIdentity: undefined,
    }),
  "durable approved audio write guard rejects records missing owner identity",
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
);
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClipWriteRecord,
      retentionTimestampMs: durableSavedClip.retentionTimestampMs + 1,
    }),
  "durable approved audio write guard rejects records with mismatched retention timestamp",
  APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR,
);
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClipWriteRecord,
      retentionPurposeMetadata: undefined,
    }),
  "durable approved audio write guard rejects records missing retention purpose metadata",
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
);
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClipWriteRecord,
      userVisibleMetadata: undefined,
    }),
  "durable approved audio write guard rejects records missing user-visible metadata",
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
);
expectThrows(
  () =>
    assertDurableApprovedAudioClipWriteAllowed({
      ...durableSavedClipWriteRecord,
      userVisibleMetadata: {
        ...durableSavedClip.userVisibleMetadata,
        laterUsePurpose: "Save for hidden analytics",
      },
    }),
  "durable approved audio write guard rejects user-visible metadata not associated with the saved purpose",
  APPROVED_AUDIO_DURABLE_STORAGE_CONTRACT_ERROR,
);
let rejectedDurableWriteCalled = false;
let rejectedDurableReadCalled = false;
const rejectedDurableBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
rejectedDurableBuffer.append(Uint8Array.from([141, 142]));
const rejectedDurableStore = createDurableApprovedAudioClipStore({
  write() {
    rejectedDurableWriteCalled = true;
  },
});
try {
  rejectedDurableStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        purposeMetadata: undefined,
      },
    },
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        rejectedDurableReadCalled = true;
        return rejectedDurableBuffer.read();
      },
      clear() {
        rejectedDurableBuffer.clear();
      },
    },
    clipId: "rejected-durable-purpose-clip",
  });
  throw new Error("durable missing-purpose save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "durable approved audio path rejects writes without validated purpose metadata",
  );
}
expectEqual(
  rejectedDurableReadCalled,
  false,
  "durable approved audio path rejects invalid purpose metadata before reading captured audio",
);
expectEqual(
  rejectedDurableWriteCalled,
  false,
  "durable approved audio path rejects invalid purpose metadata before writing captured audio",
);
expectArrayEqual(
  rejectedDurableBuffer.read(),
  [],
  "durable approved audio path clears buffered audio after rejecting invalid purpose metadata",
);
let rejectedDurableMissingIntentWriteCalled = false;
let rejectedDurableMissingIntentReadCalled = false;
const rejectedDurableMissingIntentBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
rejectedDurableMissingIntentBuffer.append(Uint8Array.from([143, 144]));
const rejectedDurableMissingIntentStore = createDurableApprovedAudioClipStore({
  write() {
    rejectedDurableMissingIntentWriteCalled = true;
  },
});
try {
  rejectedDurableMissingIntentStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        capturedAudioSaveIntent: undefined,
      },
    },
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        rejectedDurableMissingIntentReadCalled = true;
        return rejectedDurableMissingIntentBuffer.read();
      },
      clear() {
        rejectedDurableMissingIntentBuffer.clear();
      },
    },
    clipId: "rejected-durable-missing-save-intent-clip",
  });
  throw new Error("durable missing-save-intent guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "durable approved audio path rejects writes without explicit save intent",
  );
}
expectEqual(
  rejectedDurableMissingIntentReadCalled,
  false,
  "durable approved audio path rejects missing save intent before reading captured audio",
);
expectEqual(
  rejectedDurableMissingIntentWriteCalled,
  false,
  "durable approved audio path rejects missing save intent before writing captured audio",
);
expectArrayEqual(
  rejectedDurableMissingIntentBuffer.read(),
  [],
  "durable approved audio path clears buffered audio after rejecting missing save intent",
);
let unauthorizedReadCalled = false;
let unauthorizedClearCalled = false;
try {
  approvedAudioClipStore.save({
    saveAction: explicitSaveAction,
    rollingAudioBuffer: {
      read() {
        unauthorizedReadCalled = true;
        return Uint8Array.from([91, 92, 93]);
      },
      clear() {
        unauthorizedClearCalled = true;
      },
    },
    clipId: "missing-authorization-clip",
  });
  throw new Error("missing save authorization guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR,
    "clip store rejects raw audio persistence without explicit save authorization",
  );
}
expectEqual(
  unauthorizedReadCalled,
  false,
  "missing save authorization is rejected before reading raw rolling audio",
);
expectEqual(
  unauthorizedClearCalled,
  true,
  "missing save authorization clears pending rolling audio after rejection",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "missing authorization attempt does not add a saved clip",
);
let unbrandedAuthorizationReadCalled = false;
try {
  saveApprovedAudioClipFromExplicitSaveAction(approvedAudioClipStore, {
    saveAction: explicitSaveAction,
    saveAuthorization: {
      ...explicitSaveAuthorization,
    },
    rollingAudioBuffer: {
      read() {
        unbrandedAuthorizationReadCalled = true;
        return Uint8Array.from([94, 95]);
      },
      clear() {},
    },
    clipId: "unbranded-authorization-clip",
  });
  throw new Error("unbranded save authorization guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR,
    "save wrapper rejects copied authorization metadata before store persistence",
  );
}
expectEqual(
  unbrandedAuthorizationReadCalled,
  false,
  "save wrapper rejects unbranded authorization before raw audio can be read",
);
const unauthorizedVoiceSaveAction = createApprovedAudioSaveAction(
  createApprovedAudioSaveRequestInput({
    approvedVoiceMatch: {
      matchedVoiceId: "voice-bob",
    },
    approvedUserIdentity: {
      approvedVoiceId: "voice-bob",
      approvedUserId: "user-bob",
      displayName: "Bob",
    },
  }),
);
const unauthorizedVoiceSaveAuthorization =
  createApprovedAudioSaveAuthorization(unauthorizedVoiceSaveAction);
const mismatchedAuthorizationBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
mismatchedAuthorizationBuffer.append(Uint8Array.from([96, 97]));
let mismatchedAuthorizationReadCalled = false;
try {
  saveApprovedAudioClipFromExplicitSaveAction(approvedAudioClipStore, {
    saveAction: explicitSaveAction,
    saveAuthorization: unauthorizedVoiceSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        mismatchedAuthorizationReadCalled = true;
        return mismatchedAuthorizationBuffer.read();
      },
      clear() {
        mismatchedAuthorizationBuffer.clear();
      },
    },
    clipId: "mismatched-authorization-clip",
  });
  throw new Error("mismatched save authorization guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_AUTHORIZATION_CONTRACT_ERROR,
    "save wrapper rejects authorization for a different approved voice",
  );
}
expectEqual(
  mismatchedAuthorizationReadCalled,
  false,
  "mismatched save authorization is rejected before reading raw audio",
);
expectArrayEqual(
  mismatchedAuthorizationBuffer.read(),
  [],
  "mismatched save authorization clears pending audio after rejection",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "mismatched authorization attempt does not persist a clip",
);
const automaticSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
automaticSaveBuffer.append(Uint8Array.from([111]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: "automatic-background-save",
      request: approvedAudioSaveRequest,
    },
    rollingAudioBuffer: automaticSaveBuffer,
  });
  throw new Error("automatic audio persistence guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
    "clip store rejects persistence without an explicit save action",
  );
}
expectArrayEqual(
  automaticSaveBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting background persistence",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "background persistence attempt does not add a saved clip",
);
let missingRequestSaveActionReadCalled = false;
const missingRequestSaveActionBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
missingRequestSaveActionBuffer.append(Uint8Array.from([109, 110]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        saveActionKind: undefined,
      },
    },
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        missingRequestSaveActionReadCalled = true;
        return missingRequestSaveActionBuffer.read();
      },
      clear() {
        missingRequestSaveActionBuffer.clear();
      },
    },
    clipId: "missing-request-save-action-clip",
  });
  throw new Error("missing request save action guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects persistence when the request contract lacks an explicit save action",
  );
}
expectEqual(
  missingRequestSaveActionReadCalled,
  false,
  "missing request save action is rejected before reading raw rolling audio",
);
expectArrayEqual(
  missingRequestSaveActionBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting a request without explicit save action",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "missing request save action attempt does not persist a clip",
);
let missingSaveIntentReadCalled = false;
const missingSaveIntentBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
missingSaveIntentBuffer.append(Uint8Array.from([123, 124]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        capturedAudioSaveIntent: undefined,
      },
    },
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        missingSaveIntentReadCalled = true;
        return missingSaveIntentBuffer.read();
      },
      clear() {
        missingSaveIntentBuffer.clear();
      },
    },
    clipId: "missing-save-intent-clip",
  });
  throw new Error("missing captured-audio save intent guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects captured audio writes without explicit save intent",
  );
}
expectEqual(
  missingSaveIntentReadCalled,
  false,
  "missing save intent is rejected before reading raw rolling audio",
);
expectArrayEqual(
  missingSaveIntentBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting missing save intent",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "missing-save-intent attempt does not persist a clip",
);
const unapprovedVoiceSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
unapprovedVoiceSaveBuffer.append(Uint8Array.from([116, 117, 118]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: createApprovedAudioSaveRequestInput({
        approvedVoiceMatch: {
          accepted: false,
          matchedVoiceId: "voice-eve",
          reason: "not_an_approved_voice",
        },
        approvedUserIdentity: {
          approvedVoiceId: "voice-eve",
          approvedUserId: "user-eve",
          displayName: "Eve",
        },
      }),
    },
    rollingAudioBuffer: unapprovedVoiceSaveBuffer,
    clipId: "unapproved-voice-clip",
  });
  throw new Error("unapproved voice save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects saves for voices that were not approved by the gate",
  );
}
expectArrayEqual(
  unapprovedVoiceSaveBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting an unapproved voice save",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "unapproved voice save attempt does not persist a clip",
);
const unmatchedVoiceSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
unmatchedVoiceSaveBuffer.append(Uint8Array.from([112, 113]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: createApprovedAudioSaveRequestInput({
        approvedVoiceMatch: { matchedVoiceId: "voice-bob" },
      }),
    },
    rollingAudioBuffer: unmatchedVoiceSaveBuffer,
    clipId: "unmatched-voice-clip",
  });
  throw new Error("unmatched approved voice save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects saves without a valid approved voice match",
  );
}
expectArrayEqual(
  unmatchedVoiceSaveBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting an unmatched voice save",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "unmatched voice save attempt does not persist a clip",
);
const missingPurposeSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
missingPurposeSaveBuffer.append(Uint8Array.from([114, 115]));
let missingPurposeSaveReadCalled = false;
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        userVisiblePurpose: " ",
      },
    },
    rollingAudioBuffer: {
      read() {
        missingPurposeSaveReadCalled = true;
        return missingPurposeSaveBuffer.read();
      },
      clear() {
        missingPurposeSaveBuffer.clear();
      },
    },
    clipId: "missing-purpose-clip",
  });
  throw new Error("missing later-use purpose save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects saves without an explicit later-use purpose",
  );
}
expectEqual(
  missingPurposeSaveReadCalled,
  false,
  "clip store rejects missing-purpose save requests before reading rolling audio",
);
expectArrayEqual(
  missingPurposeSaveBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting a missing-purpose save",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "missing-purpose save attempt does not persist a clip",
);
let missingPurposeMetadataReadCalled = false;
const missingPurposeMetadataBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
missingPurposeMetadataBuffer.append(Uint8Array.from([119, 120]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        purposeMetadata: undefined,
      },
    },
    rollingAudioBuffer: {
      read() {
        missingPurposeMetadataReadCalled = true;
        return missingPurposeMetadataBuffer.read();
      },
      clear() {
        missingPurposeMetadataBuffer.clear();
      },
    },
    clipId: "missing-purpose-metadata-clip",
  });
  throw new Error("missing purpose metadata save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects saves without validated purpose metadata",
  );
}
expectEqual(
  missingPurposeMetadataReadCalled,
  false,
  "missing purpose metadata is rejected before reading raw rolling audio",
);
expectArrayEqual(
  missingPurposeMetadataBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting missing purpose metadata",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "missing-purpose-metadata save attempt does not persist a clip",
);
let incompletePurposeMetadataReadCalled = false;
const incompletePurposeMetadataBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
incompletePurposeMetadataBuffer.append(Uint8Array.from([121, 122]));
try {
  approvedAudioClipStore.save({
    saveAction: {
      kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
      request: {
        ...createApprovedAudioSaveRequestInput(),
        purposeMetadata: {
          userVisiblePurpose: "Save this audio clip for playback in the note",
        },
      },
    },
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: {
      read() {
        incompletePurposeMetadataReadCalled = true;
        return incompletePurposeMetadataBuffer.read();
      },
      clear() {
        incompletePurposeMetadataBuffer.clear();
      },
    },
    clipId: "incomplete-purpose-metadata-clip",
  });
  throw new Error("incomplete purpose metadata save guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
    "clip store rejects saves with incomplete purpose metadata",
  );
}
expectEqual(
  incompletePurposeMetadataReadCalled,
  false,
  "incomplete purpose metadata is rejected before reading raw rolling audio",
);
expectArrayEqual(
  incompletePurposeMetadataBuffer.read(),
  [],
  "clip store discards buffered audio after rejecting incomplete purpose metadata",
);
expectEqual(
  approvedAudioClipStore.list().length,
  1,
  "incomplete-purpose-metadata save attempt does not persist a clip",
);
const emptyExplicitSaveBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
try {
  approvedAudioClipStore.save({
    saveAction: explicitSaveAction,
    saveAuthorization: explicitSaveAuthorization,
    rollingAudioBuffer: emptyExplicitSaveBuffer,
    clipId: "empty-clip",
  });
  throw new Error("empty audio clip guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    APPROVED_AUDIO_CLIP_STORE_CONTRACT_ERROR,
    "clip store rejects empty explicit saves",
  );
}
expectEqual(
  approvedAudioClipStore.pruneExpired(1700003600000),
  1,
  "clip store discards saved audio when its declared retention window expires",
);
expectEqual(
  approvedAudioClipStore.list().length,
  0,
  "expired saved clips are removed from the local store",
);

assertBufferedAudioSinkAllowed("local-memory");
assertBufferedAudioSinkAllowed("local-processing");
for (const sink of PROHIBITED_BUFFERED_AUDIO_SINKS) {
  expectThrows(
    () => assertBufferedAudioSinkAllowed(sink),
    `buffered audio sink ${sink} is rejected`,
  );
  expectThrows(
    () => privacyBuffer.read(undefined, { sink }),
    `buffered audio read to ${sink} is rejected`,
  );
}
for (const downstreamPath of PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS) {
  expectThrows(
    () =>
      assertApprovedVoiceVerifiedForBufferedAudioDownstream({
        downstreamPath,
        recognitionResult: {
          accepted: false,
          matchedVoiceId: null,
        },
      }),
    `pre-approval buffered audio cannot invoke ${downstreamPath}`,
  );
  expectThrows(
    () => privacyBuffer.read(undefined, { sink: downstreamPath }),
    `pre-approval rolling buffer cannot be read into ${downstreamPath}`,
  );
  expectThrows(
    () =>
      assertApprovedVoiceVerifiedForBufferedAudioDownstream({
        downstreamPath,
        recognitionResult: {
          accepted: true,
          matchedVoiceId: "voice-alice",
        },
      }),
    `approved voice verification without threshold evidence cannot invoke ${downstreamPath}`,
  );
  expectThrows(
    () =>
      assertApprovedVoiceVerifiedForBufferedAudioDownstream({
        downstreamPath,
        recognitionResult: {
          accepted: true,
          matchedVoiceId: "voice-alice",
          downstreamAuthorization: {
            authorized: true,
            matchedVoiceId: "voice-alice",
            score: 0.94,
            threshold: 0.95,
          },
        },
      }),
    `approved voice verification below the configured threshold cannot invoke ${downstreamPath}`,
  );
  expectDoesNotThrow(
    () =>
      assertApprovedVoiceVerifiedForBufferedAudioDownstream({
        downstreamPath,
        recognitionResult: {
          accepted: true,
          matchedVoiceId: "voice-alice",
          downstreamAuthorization: {
            authorized: true,
            matchedVoiceId: "voice-alice",
            score: 0.96,
            threshold: 0.95,
            decisionRule: "high_confidence_match",
          },
        },
      }),
    `threshold-authorized approved voice verification unlocks ${downstreamPath} invocation checks`,
  );
}
try {
  assertApprovedVoiceVerifiedForBufferedAudioDownstream({
    downstreamPath: "transcription",
    recognitionResult: {
      accepted: false,
      matchedVoiceId: null,
    },
  });
  throw new Error("downstream guard error was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR,
    "downstream guard explains approved voice verification requirement",
  );
}

const approvedSpeechSegmentBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 10,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 2,
  },
);
approvedSpeechSegmentBuffer.append(Uint8Array.from([1, 2]), {
  timestampMs: 100,
});
approvedSpeechSegmentBuffer.append(Uint8Array.from([3, 4]), {
  timestampMs: 700,
});
approvedSpeechSegmentBuffer.append(Uint8Array.from([5, 6]), {
  timestampMs: 1100,
});

const approvedSpeechAudioSegment =
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: approvedSpeechSegmentBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "voice-alice",
      recognizedAtMs: 1200,
      latencyMs: 600,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "voice-alice",
        score: 0.98,
        threshold: 0.95,
        decisionRule: "high_confidence_match",
      },
    },
    downstreamPath: "transcription",
    selectedAtMs: 1205,
  });

expectEqual(
  approvedSpeechAudioSegment.kind,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
  "approved speech segment declares the rolling-buffer segment kind",
);
expectEqual(
  approvedSpeechAudioSegment.source,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
  "approved speech segment declares the on-device rolling-buffer source",
);
expectEqual(
  approvedSpeechAudioSegment.matchedVoiceId,
  "voice-alice",
  "approved speech segment carries the matched approved voice id",
);
expectEqual(
  approvedSpeechAudioSegment.startedAtMs,
  500,
  "approved speech segment starts at the eligible voice-gate window boundary",
);
expectEqual(
  approvedSpeechAudioSegment.endedAtMs,
  1100,
  "approved speech segment ends at the newest buffered audio frame",
);
expectEqual(
  approvedSpeechAudioSegment.byteLength,
  4,
  "approved speech segment reports its selected byte length",
);
expectEqual(
  approvedSpeechAudioSegment.chunkCount,
  2,
  "approved speech segment includes only chunks eligible for speech processing",
);
expectArrayEqual(
  approvedSpeechAudioSegment.audioBytes,
  [3, 4, 5, 6],
  "approved speech segment passes the eligible rolling-buffer audio bytes",
);
expectEqual(
  Object.keys(approvedSpeechAudioSegment).includes("audioBytes"),
  false,
  "approved speech segment keeps raw audio non-enumerable",
);
expectEqual(
  JSON.stringify(approvedSpeechAudioSegment.audioBytes),
  JSON.stringify(BUFFERED_AUDIO_REDACTION_LABEL),
  "approved speech segment audio redacts during JSON serialization",
);
expectNotIncludes(
  JSON.stringify(approvedSpeechAudioSegment),
  "audioBytes",
  "approved speech segment metadata serialization excludes raw audio",
);
expectNotIncludes(
  inspect(approvedSpeechAudioSegment),
  "3, 4, 5, 6",
  "approved speech segment inspection excludes raw audio",
);

const approvedSpeechSegmentAudioBytes = approvedSpeechAudioSegment.audioBytes;
const approvedSpeechSegmentRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: approvedSpeechSegmentBuffer,
  rollingBufferAudioSegments: [approvedSpeechAudioSegment],
  scheduleProcessingWindowExpiry: false,
});
expectEqual(
  approvedSpeechSegmentRelease.release("processing_complete"),
  true,
  "approved speech segment release completes after downstream processing",
);
expectArrayEqual(
  approvedSpeechSegmentAudioBytes,
  [0, 0, 0, 0],
  "approved speech segment release zeroes selected rolling-buffer audio bytes",
);
expectEqual(
  "audioBytes" in approvedSpeechAudioSegment,
  false,
  "approved speech segment release removes the raw audio property",
);
expectArrayEqual(
  approvedSpeechSegmentBuffer.read(),
  [],
  "approved speech segment release clears the source rolling buffer",
);

const emptyApprovedSpeechSegmentBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 10,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 2,
  },
);
expectEqual(
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: emptyApprovedSpeechSegmentBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "voice-alice",
      recognizedAtMs: 1300,
      latencyMs: 100,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "voice-alice",
        score: 0.98,
        threshold: 0.95,
      },
    },
  }),
  null,
  "approved speech segment selection returns null when no rolling audio is available",
);
expectThrows(
  () =>
    selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
      rollingAudioBuffer: emptyApprovedSpeechSegmentBuffer,
      recognitionResult: {
        accepted: false,
        matchedVoiceId: null,
        latencyMs: 100,
        downstreamAuthorization: null,
      },
    }),
  "rejected speech cannot select a rolling-buffer segment for downstream processing",
  BUFFERED_AUDIO_DOWNSTREAM_GUARD_ERROR,
);

const capturePathBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);

const recognitionFrame = appendCapturedFrameToCircularBuffer(
  capturePathBuffer,
  {
    utteranceId: "approved",
    timestampMs: 120,
    embedding: [0.7, 0.2, 0.1],
    audioBytes: Uint8Array.from([21, 22]),
  },
);

expectArrayEqual(
  capturePathBuffer.read(),
  [21, 22],
  "capture path appends frame audio to bounded buffer",
);
expectEqual(
  "audioBytes" in recognitionFrame,
  false,
  "capture path strips audio bytes before recognition",
);
expectArrayEqual(
  recognitionFrame.embedding,
  [0.7, 0.2, 0.1],
  "capture path preserves recognition data",
);

const rejectedSpeakerPathBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
const rejectedSpeakerFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "rejected-speaker",
    timestampMs: 600,
    embedding: [0.1, 0.8, 0.1],
  },
  Uint8Array.from([31, 32, 33]),
);
const rejectedSpeakerAudioBytes = rejectedSpeakerFrame.audioBytes;
const rejectedSpeakerRecognitionFrame = appendCapturedFrameToCircularBuffer(
  rejectedSpeakerPathBuffer,
  rejectedSpeakerFrame,
);

expectArrayEqual(
  rejectedSpeakerAudioBytes,
  [0, 0, 0],
  "rejected speaker path releases captured frame audio bytes after buffering",
);
expectEqual(
  "audioBytes" in rejectedSpeakerFrame,
  false,
  "rejected speaker path removes captured audio from the frame after gating handoff",
);
expectEqual(
  "audioBytes" in rejectedSpeakerRecognitionFrame,
  false,
  "rejected speaker recognition frame does not retain captured audio",
);
rejectedSpeakerPathBuffer.clear();
expectArrayEqual(
  rejectedSpeakerPathBuffer.read(),
  [],
  "rejected speaker path clears rolling audio after voice-gating completes",
);
expectEqual(
  rejectedSpeakerPathBuffer.getState().sizeBytes,
  0,
  "rejected speaker lifecycle retains no rolling bytes after gating completes",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      gatedFrame: rejectedSpeakerFrame,
      recognitionFrame: rejectedSpeakerRecognitionFrame,
    }),
  "rejected speaker lifecycle leaves only metadata safe to pass forward",
);
expectNotIncludes(
  JSON.stringify({
    gatedFrame: rejectedSpeakerFrame,
    recognitionFrame: rejectedSpeakerRecognitionFrame,
  }),
  "audioBytes",
  "rejected speaker lifecycle serialization carries no captured buffer field",
);

const rejectedDownstreamBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
rejectedDownstreamBuffer.append(Uint8Array.from([61, 62, 63]));
const rejectedDownstreamFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "blocked-rejected-speech",
    timestampMs: 780,
    embedding: [0.05, 0.9, 0.05],
  },
  Uint8Array.from([64, 65]),
);
const rejectedDownstreamFrameAudioBytes = rejectedDownstreamFrame.audioBytes;
const rejectedSpeechBlock = discardRejectedSpeechBeforeDownstream({
  recognitionResult: {
    accepted: false,
    matchedVoiceId: null,
    rejectedVoiceId: null,
    reason: "below_threshold",
  },
  rollingAudioBuffer: rejectedDownstreamBuffer,
  capturedFrames: [rejectedDownstreamFrame],
});

expectEqual(
  rejectedSpeechBlock.accepted,
  false,
  "rejected speech boundary never converts rejection into approval",
);
expectEqual(
  rejectedSpeechBlock.discarded,
  true,
  "rejected speech boundary marks captured audio as discarded",
);
expectArrayEqual(
  rejectedSpeechBlock.blockedDownstreamSinks,
  Array.from(REJECTED_SPEECH_BLOCKED_DOWNSTREAM_SINKS),
  "rejected speech boundary blocks downstream buffered-audio paths",
);
for (const downstreamPath of PRE_APPROVAL_BUFFERED_AUDIO_BLOCKED_DOWNSTREAM_PATHS) {
  expectEqual(
    rejectedSpeechBlock.blockedDownstreamSinks.includes(downstreamPath),
    true,
    `rejected speech boundary blocks ${downstreamPath} before approved voice verification`,
  );
}
expectArrayEqual(
  rejectedDownstreamBuffer.read(),
  [],
  "rejected speech boundary clears the rolling buffer before retention",
);
expectEqual(
  rejectedSpeechBlock.rollingBufferSizeBytesAfterDiscard,
  0,
  "rejected speech boundary reports no retained rolling bytes",
);
expectArrayEqual(
  rejectedDownstreamFrameAudioBytes,
  [0, 0],
  "rejected speech boundary releases captured frame bytes before downstream use",
);
expectEqual(
  "audioBytes" in rejectedDownstreamFrame,
  false,
  "rejected speech boundary removes captured audio from frame metadata",
);
expectDoesNotThrow(
  () => assertNetworkPayloadExcludesBufferedAudio(rejectedSpeechBlock),
  "rejected speech boundary exposes only network-safe discard metadata",
);
expectNotIncludes(
  JSON.stringify(rejectedSpeechBlock),
  "audioBytes",
  "rejected speech boundary serialization carries no captured audio",
);
expectThrows(
  () =>
    discardRejectedSpeechBeforeDownstream({
      recognitionResult: {
        accepted: true,
        matchedVoiceId: "voice-alice",
        reason: "high_confidence_match",
      },
      rollingAudioBuffer: rejectedDownstreamBuffer,
  }),
  "rejected speech boundary refuses accepted speech",
);

verifyVoiceApprovalDiscardScenario({
  label: "voice approval failure",
  reason: "below_threshold",
  latencyMs: 360,
  rollingAudioBytes: [131, 132, 133],
  capturedAudioBytes: [134, 135],
});
verifyVoiceApprovalDiscardScenario({
  label: "voice approval timeout",
  reason: "latency_limit_exceeded",
  latencyMs: 1000,
  rollingAudioBytes: [141, 142, 143],
  capturedAudioBytes: [144, 145],
});
verifyVoiceApprovalDiscardScenario({
  label: "voice approval cancellation",
  reason: "voice_approval_cancelled",
  rejectedVoiceId: "cancelled-speaker",
  latencyMs: 240,
  rollingAudioBytes: [151, 152, 153],
  capturedAudioBytes: [154, 155],
});

const directTemporaryAudioPurges = [];
const directCachePurges = [];
const directExternalResourcePurge =
  purgeUnsavedCapturedAudioExternalResources({
    temporaryCapturedAudioFiles: [
      {
        filePath: "/tmp/case-direct-unsaved-capture.raw",
        deleteFile(filePath) {
          directTemporaryAudioPurges.push(filePath);
        },
      },
    ],
    unsavedCapturedAudioCaches: [
      {
        cacheKey: "case-direct-unsaved-capture-cache",
        clear(cacheKey) {
          directCachePurges.push(cacheKey);
        },
      },
    ],
  });
expectEqual(
  directExternalResourcePurge.policy,
  UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY,
  "unsaved captured-audio external resource purge uses the explicit cache/temp cleanup policy",
);
expectEqual(
  directExternalResourcePurge.temporaryCapturedAudioFileCount,
  1,
  "unsaved captured-audio external resource purge reports temporary file cleanup",
);
expectEqual(
  directExternalResourcePurge.unsavedCapturedAudioCacheCount,
  1,
  "unsaved captured-audio external resource purge reports cache cleanup",
);
expectArrayEqual(
  directTemporaryAudioPurges,
  ["/tmp/case-direct-unsaved-capture.raw"],
  "unsaved captured-audio external resource purge deletes temporary files outside the explicit save path",
);
expectArrayEqual(
  directCachePurges,
  ["case-direct-unsaved-capture-cache"],
  "unsaved captured-audio external resource purge clears caches outside the explicit save path",
);
expectThrows(
  () =>
    purgeUnsavedCapturedAudioExternalResources({
      temporaryCapturedAudioFiles: [
        {
          filePath: "/tmp/case-invalid-unsaved-capture.raw",
          deleteFile() {},
          audioBytes: Uint8Array.from([1, 2, 3]),
        },
      ],
    }),
  "unsaved captured-audio external resource purge rejects non-cleanup target fields",
  UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_CONTRACT_ERROR,
);

const directlyReleasedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "direct-release",
    timestampMs: 720,
    embedding: [0.3, 0.4, 0.5],
  },
  Uint8Array.from([41, 42]),
);
const directlyReleasedAudioBytes = directlyReleasedFrame.audioBytes;
releaseCapturedAudioFrame(directlyReleasedFrame);
expectArrayEqual(
  directlyReleasedAudioBytes,
  [0, 0],
  "captured frame release zeroes temporary audio bytes",
);
expectEqual(
  "audioBytes" in directlyReleasedFrame,
  false,
  "captured frame release drops the audio buffer property",
);

const approvalCompleteBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
approvalCompleteBuffer.append(Uint8Array.from([91, 92, 93]));
const approvalCompleteFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approval-complete",
    timestampMs: 800,
    embedding: [0.9, 0.1, 0],
  },
  Uint8Array.from([94, 95]),
);
const approvalCompleteFrameAudioBytes = approvalCompleteFrame.audioBytes;
const approvalCompleteRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: approvalCompleteBuffer,
  capturedFrames: [approvalCompleteFrame],
});

expectEqual(
  approvalCompleteRelease.release("voice_approval_complete"),
  true,
  "voice-gate approval completion immediately releases captured audio",
);
expectArrayEqual(
  approvalCompleteBuffer.read(),
  [],
  "voice-gate approval completion clears the rolling buffer before downstream retention",
);
expectEqual(
  approvalCompleteBuffer.getState().sizeBytes,
  0,
  "voice-gate approval completion leaves no retained rolling bytes",
);
expectArrayEqual(
  approvalCompleteFrameAudioBytes,
  [0, 0],
  "voice-gate approval completion zeroes captured frame bytes",
);
expectEqual(
  "audioBytes" in approvalCompleteFrame,
  false,
  "voice-gate approval completion removes captured frame audio",
);
expectEqual(
  approvalCompleteRelease.getReleaseReason(),
  "voice_approval_complete",
  "voice-gate approval completion records the immediate release reason",
);

const approvedProcessingBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
approvedProcessingBuffer.append(Uint8Array.from([51, 52, 53]));
const approvedProcessingFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approved-processing",
    timestampMs: 840,
    embedding: [0.7, 0.2, 0.1],
  },
  Uint8Array.from([54, 55]),
);
const approvedProcessingFrameAudioBytes = approvedProcessingFrame.audioBytes;
const approvedProcessingReleaseReasons = [];
const approvedProcessingRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: approvedProcessingBuffer,
  capturedFrames: [approvedProcessingFrame],
  onRelease: (reason) => approvedProcessingReleaseReasons.push(reason),
});

expectEqual(
  approvedProcessingRelease.release("processing_complete"),
  true,
  "approved speech processing completion releases captured audio once",
);
expectArrayEqual(
  approvedProcessingBuffer.read(),
  [],
  "approved speech processing completion clears rolling audio",
);
expectEqual(
  approvedProcessingBuffer.getState().sizeBytes,
  0,
  "approved speech processing completion retains no rolling bytes",
);
expectArrayEqual(
  approvedProcessingFrameAudioBytes,
  [0, 0],
  "approved speech processing completion zeroes temporary captured audio",
);
expectEqual(
  "audioBytes" in approvedProcessingFrame,
  false,
  "approved speech processing completion removes captured frame audio",
);
expectEqual(
  approvedProcessingRelease.getReleaseReason(),
  "processing_complete",
  "approved speech processing completion records release reason",
);
expectEqual(
  approvedProcessingRelease.isReleased(),
  true,
  "approved speech lifecycle marks captured buffers released after completion",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      processedFrame: approvedProcessingFrame,
      releaseReason: approvedProcessingRelease.getReleaseReason(),
    }),
  "approved speech processing completion leaves only metadata safe to pass forward",
);
expectNotIncludes(
  JSON.stringify({
    processedFrame: approvedProcessingFrame,
    releaseReason: approvedProcessingRelease.getReleaseReason(),
  }),
  "audioBytes",
  "approved speech processing completion serialization carries no captured buffer field",
);
expectEqual(
  approvedProcessingRelease.release("processing_error"),
  false,
  "approved speech cleanup is idempotent after completion",
);
expectEqual(
  approvedProcessingReleaseReasons.length,
  1,
  "approved speech cleanup callback runs once",
);

const processingWindowExpiryBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
processingWindowExpiryBuffer.append(Uint8Array.from([161, 162, 163]));
const processingWindowExpiryFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "processing-window-expiry",
    timestampMs: 1120,
    embedding: [0.8, 0.1, 0.1],
  },
  Uint8Array.from([164, 165]),
);
const processingWindowExpiryFrameAudioBytes =
  processingWindowExpiryFrame.audioBytes;
const processingWindowExpiryReleaseReasons = [];
let scheduledProcessingWindowCallback = null;
let scheduledProcessingWindowDelayMs = null;
let clearedProcessingWindowTimer = null;
const processingWindowExpiryRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: processingWindowExpiryBuffer,
  capturedFrames: [processingWindowExpiryFrame],
  processingWindowStartedAtMs: 10_000,
  processingWindowDurationSeconds:
    CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  nowMs: () => 10_000,
  setProcessingWindowExpiryTimer(callback, delayMs) {
    scheduledProcessingWindowCallback = callback;
    scheduledProcessingWindowDelayMs = delayMs;
    return "processing-window-expiry-timer";
  },
  clearProcessingWindowExpiryTimer(timer) {
    clearedProcessingWindowTimer = timer;
  },
  onRelease(reason) {
    processingWindowExpiryReleaseReasons.push(reason);
  },
});

expectEqual(
  scheduledProcessingWindowDelayMs,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS * 1000,
  "unsaved raw audio release arms a processing-window expiry timer",
);
expectEqual(
  processingWindowExpiryRelease.getProcessingWindowState(10_050).policy,
  UNSAVED_RAW_AUDIO_PROCESSING_WINDOW_DISCARD_POLICY,
  "processing-window release state exposes the unsaved raw-audio discard policy",
);
expectEqual(
  processingWindowExpiryRelease.getProcessingWindowState(10_050)
    .processingWindowExpired,
  false,
  "unsaved raw audio is not discarded before the processing window expires",
);
expectEqual(
  processingWindowExpiryRelease.expireProcessingWindow(10_099),
  false,
  "processing-window expiry does not release audio before the deadline",
);
expectArrayEqual(
  processingWindowExpiryBuffer.read(),
  [161, 162, 163],
  "unsaved raw audio remains only in memory before the processing window expires",
);
if (typeof scheduledProcessingWindowCallback !== "function") {
  throw new Error("processing-window expiry timer callback was not scheduled");
}
scheduledProcessingWindowCallback();
expectEqual(
  processingWindowExpiryRelease.getReleaseReason(),
  PROCESSING_WINDOW_EXPIRED_RELEASE_REASON,
  "processing-window expiry records the discard release reason",
);
expectEqual(
  processingWindowExpiryRelease.isReleased(),
  true,
  "processing-window expiry marks unsaved raw audio released",
);
expectEqual(
  processingWindowExpiryRelease.getProcessingWindowState(10_100)
    .unsavedRawAudioDiscarded,
  true,
  "processing-window state records that unsaved raw audio was discarded",
);
expectArrayEqual(
  processingWindowExpiryBuffer.read(),
  [],
  "processing-window expiry clears unsaved rolling audio from memory",
);
expectEqual(
  processingWindowExpiryBuffer.getState().sizeBytes,
  0,
  "processing-window expiry leaves no rolling audio bytes in memory",
);
expectArrayEqual(
  processingWindowExpiryFrameAudioBytes,
  [0, 0],
  "processing-window expiry zeroes transient captured frame bytes",
);
expectEqual(
  "audioBytes" in processingWindowExpiryFrame,
  false,
  "processing-window expiry removes captured raw audio from frame metadata",
);
expectEqual(
  processingWindowExpiryReleaseReasons.join(","),
  PROCESSING_WINDOW_EXPIRED_RELEASE_REASON,
  "processing-window expiry emits one release callback",
);
expectEqual(
  clearedProcessingWindowTimer,
  "processing-window-expiry-timer",
  "processing-window expiry clears its scheduled timer handle",
);
expectEqual(
  processingWindowExpiryRelease.release("processing_complete"),
  false,
  "processing-window expiry is idempotent after discarding unsaved raw audio",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      processingWindowState:
        processingWindowExpiryRelease.getProcessingWindowState(10_100),
      processedFrame: processingWindowExpiryFrame,
    }),
  "processing-window expiry leaves only network-safe discard metadata",
);

const transcriptionNoSaveClipStore = createLocalApprovedAudioClipStore();
const transcriptionCompletedBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
transcriptionCompletedBuffer.append(Uint8Array.from([101, 102, 103]));
const transcriptionCompletedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "transcription-complete-no-save-intent",
    timestampMs: 1040,
    embedding: [0.82, 0.1, 0.08],
  },
  Uint8Array.from([104, 105]),
);
const transcriptionCompletedFrameAudioBytes =
  transcriptionCompletedFrame.audioBytes;
const transcriptionCompletedReleaseReasons = [];
const transcriptionCompletedRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: transcriptionCompletedBuffer,
  capturedFrames: [transcriptionCompletedFrame],
  onRelease: (reason) => transcriptionCompletedReleaseReasons.push(reason),
});

expectEqual(
  transcriptionNoSaveClipStore.list().length,
  0,
  "transcription no-save path starts without retained audio records",
);
const transcriptionCleanup =
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
    releaseCapturedAudio: transcriptionCompletedRelease.release,
  });
expectEqual(
  transcriptionCleanup.transcriptionCompleted,
  true,
  "transcription cleanup records transcription completion",
);
expectEqual(
  transcriptionCleanup.saveIntentPresent,
  DEFAULT_TRANSCRIPTION_SAVE_INTENT_PRESENT,
  "transcription cleanup defaults to no save intent",
);
expectEqual(
  transcriptionCleanup.released,
  true,
  "transcription completion releases captured audio when no save intent exists",
);
expectEqual(
  transcriptionCleanup.releaseReason,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  "transcription completion records the no-save release reason",
);
expectEqual(
  transcriptionCleanup.bufferLocation,
  BUFFER_LOCATION_ON_DEVICE,
  "transcription cleanup keeps the discard decision on-device",
);
expectEqual(
  transcriptionCleanup.audioRetentionPolicy,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  "transcription cleanup uses discard-unless-saved retention",
);
expectEqual(
  transcriptionCompletedReleaseReasons.join(","),
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  "transcription cleanup releases audio synchronously before returning",
);
expectArrayEqual(
  transcriptionCompletedBuffer.read(),
  [],
  "transcription no-save path clears rolling audio after transcription completes",
);
expectEqual(
  transcriptionCompletedBuffer.getState().sizeBytes,
  0,
  "transcription no-save path retains no rolling bytes",
);
expectArrayEqual(
  transcriptionCompletedFrameAudioBytes,
  [0, 0],
  "transcription no-save path zeroes temporary captured audio bytes",
);
expectEqual(
  "audioBytes" in transcriptionCompletedFrame,
  false,
  "transcription no-save path removes captured audio from frame metadata",
);
expectEqual(
  transcriptionNoSaveClipStore.list().length,
  0,
  "transcription no-save path creates no retained audio record",
);
expectEqual(
  transcriptionNoSaveClipStore.get("transcription-complete-no-save-intent"),
  null,
  "transcription no-save path creates no retained audio artifact",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      transcriptionCleanup,
      processedFrame: transcriptionCompletedFrame,
      retainedAudioRecords: transcriptionNoSaveClipStore.list(),
    }),
  "transcription no-save path leaves only network-safe metadata after cleanup",
);

try {
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
    saveIntentPresent: true,
  });
  throw new Error("transcription save-intent guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    TRANSCRIPTION_AUDIO_NO_SAVE_INTENT_GUARD_ERROR,
    "transcription cleanup rejects retention without an explicit save workflow",
  );
}

const unsavedApprovedAudioClipStore = createLocalApprovedAudioClipStore();
const unsavedApprovedBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
unsavedApprovedBuffer.append(Uint8Array.from([81, 82, 83]));
const unsavedApprovedFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "unsaved-approved-processing",
    timestampMs: 1020,
    embedding: [0.8, 0.1, 0.1],
  },
  Uint8Array.from([84, 85]),
);
const unsavedApprovedFrameAudioBytes = unsavedApprovedFrame.audioBytes;
const unsavedApprovedRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: unsavedApprovedBuffer,
  capturedFrames: [unsavedApprovedFrame],
});

expectEqual(
  unsavedApprovedAudioClipStore.list().length,
  0,
  "unsaved approved speech starts with no retained audio records",
);
expectEqual(
  unsavedApprovedRelease.release("processing_complete"),
  true,
  "unsaved approved speech release runs after processing",
);
expectArrayEqual(
  unsavedApprovedBuffer.read(),
  [],
  "unsaved approved speech discards rolling audio after processing",
);
expectEqual(
  unsavedApprovedBuffer.getState().sizeBytes,
  0,
  "unsaved approved speech retains no rolling audio bytes",
);
expectArrayEqual(
  unsavedApprovedFrameAudioBytes,
  [0, 0],
  "unsaved approved speech zeroes temporary captured audio bytes",
);
expectEqual(
  "audioBytes" in unsavedApprovedFrame,
  false,
  "unsaved approved speech removes captured audio from frame metadata",
);
expectEqual(
  unsavedApprovedAudioClipStore.list().length,
  0,
  "unsaved approved speech creates no retained audio record",
);
expectEqual(
  unsavedApprovedAudioClipStore.get("unsaved-approved-processing"),
  null,
  "unsaved approved speech creates no retained audio artifact",
);
expectDoesNotThrow(
  () =>
    assertNetworkPayloadExcludesBufferedAudio({
      processedFrame: unsavedApprovedFrame,
      retainedAudioRecords: unsavedApprovedAudioClipStore.list(),
      releaseReason: unsavedApprovedRelease.getReleaseReason(),
    }),
  "unsaved approved speech leaves only network-safe metadata after discard",
);

const approvedErrorBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
approvedErrorBuffer.append(Uint8Array.from([61, 62]));
const approvedErrorRelease = createApprovedSpeechAudioRelease({
  rollingAudioBuffer: approvedErrorBuffer,
});
approvedErrorRelease.release("processing_error");
expectArrayEqual(
  approvedErrorBuffer.read(),
  [],
  "approved speech error path clears rolling audio",
);

const approvedCancelledFrame = attachNonPersistableAudioBytes(
  {
    utteranceId: "approved-cancelled",
    timestampMs: 960,
    embedding: [0.7, 0.2, 0.1],
  },
  Uint8Array.from([71, 72, 73]),
);
const approvedCancelledAudioBytes = approvedCancelledFrame.audioBytes;
createApprovedSpeechAudioRelease({
  capturedFrames: [approvedCancelledFrame],
}).release("processing_cancelled");
expectArrayEqual(
  approvedCancelledAudioBytes,
  [0, 0, 0],
  "approved speech cancellation path zeroes captured audio",
);
expectEqual(
  "audioBytes" in approvedCancelledFrame,
  false,
  "approved speech cancellation path removes captured frame audio",
);

appendCapturedFrameToCircularBuffer(capturePathBuffer, {
  utteranceId: "approved",
  timestampMs: 240,
  embedding: [0.7, 0.2, 0.1],
  audioBytes: Uint8Array.from([23, 24, 25]),
});
expectArrayEqual(
  capturePathBuffer.read(),
  [22, 23, 24, 25],
  "capture path retains only the newest bounded audio window",
);
expectThrows(
  () =>
    appendCapturedFrameToCircularBuffer(capturePathBuffer, {
      utteranceId: "missing-audio",
      timestampMs: 360,
      embedding: [0.7, 0.2, 0.1],
    }),
  "capture path rejects frames that cannot be buffered",
);
expectThrows(
  () =>
    appendCapturedFrameToCircularBuffer(capturePathBuffer, {
      utteranceId: "empty-audio",
      timestampMs: 480,
      embedding: [0.7, 0.2, 0.1],
      audioBytes: Uint8Array.from([]),
    }),
  "capture path rejects empty audio frames",
);

expectThrows(
  () => createRollingAudioBufferConfig({ rollingBufferActiveDurationSeconds: 0 }),
  "zero rolling buffer duration is rejected",
);
expectEqual(
  createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds:
      ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  }).rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS,
  "minimum rolling buffer active duration is accepted by the configuration layer",
);
expectEqual(
  createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds:
      ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  }).rollingBufferActiveDurationSeconds,
  ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS,
  "maximum rolling buffer active duration is accepted by the configuration layer",
);
expectThrows(
  () =>
    createRollingAudioBufferConfig({
      rollingBufferActiveDurationSeconds:
        ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS - 0.01,
    }),
  "below-minimum rolling buffer active duration is rejected",
  `between ${ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS} and ${ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS} ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
);
expectThrows(
  () =>
    createRollingAudioBufferConfig({
      rollingBufferActiveDurationSeconds:
        ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS + 0.01,
    }),
  "above-maximum rolling buffer active duration is rejected",
  `between ${ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS} and ${ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS} ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
);
expectThrows(
  () => createRollingAudioBufferConfig({ rollingBufferDurationSeconds: 6 }),
  "deprecated rolling buffer duration alias is rejected as a customization source",
  ROLLING_BUFFER_DEPRECATED_DURATION_OVERRIDE_ERROR,
);
expectThrows(
  () =>
    createRollingAudioBufferConfig({
      [ROLLING_BUFFER_DEPRECATED_DURATION_SCHEMA_FIELD]: 6,
    }),
  "deprecated snake_case rolling buffer duration alias is rejected as a customization source",
  ROLLING_BUFFER_DEPRECATED_DURATION_OVERRIDE_ERROR,
);
expectThrows(
  () =>
    parseRollingBufferUserSettings(
      JSON.stringify({
        schemaVersion: ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
        rollingBufferActiveDurationSeconds:
          ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS + 0.01,
      }),
    ),
  "parsed above-maximum active rolling buffer duration setting is rejected",
  `rollingBufferActiveDurationSeconds must be between ${ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS} and ${ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS} ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
);
expectThrows(
  () =>
    parseRollingBufferUserSettings(
      JSON.stringify({
        schemaVersion: ROLLING_BUFFER_USER_SETTINGS_SCHEMA_VERSION,
        rollingBufferActiveDurationSeconds:
          ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS - 0.01,
      }),
    ),
  "parsed below-minimum active rolling buffer duration setting is rejected",
  `rollingBufferActiveDurationSeconds must be between ${ROLLING_BUFFER_ACTIVE_DURATION_MIN_SECONDS} and ${ROLLING_BUFFER_ACTIVE_DURATION_MAX_SECONDS} ${ROLLING_BUFFER_DURATION_UNIT_SECONDS}`,
);
try {
  createRollingAudioBufferConfig({
    rollingBufferDefaultDurationSeconds: 30,
  });
  throw new Error("rolling buffer default duration override guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    ROLLING_BUFFER_DEFAULT_DURATION_IMMUTABLE_ERROR,
    "rolling buffer config rejects attempts to override the immutable default duration",
  );
}
try {
  createRollingAudioBufferConfig({
    [ROLLING_BUFFER_DEFAULT_DURATION_SCHEMA_FIELD]: 30,
  });
  throw new Error("snake_case rolling buffer default duration override guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    ROLLING_BUFFER_DEFAULT_DURATION_IMMUTABLE_ERROR,
    "rolling buffer config rejects attempts to override the immutable snake_case default duration",
  );
}
try {
  createRollingAudioBufferConfig({ audioRetentionDurationSeconds: 30 });
  throw new Error("automatic retention hook guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    AUDIO_BUFFER_CONFIG_HOOK_GUARD_ERROR,
    "rolling buffer config rejects automatic retention hooks",
  );
}
try {
  assertNoAutomaticAudioBufferConfigHooks({ persistenceAdapter: () => {} });
  throw new Error("automatic persistence hook guard was not thrown");
} catch (error) {
  expectIncludes(
    error instanceof Error ? error.message : String(error),
    AUDIO_BUFFER_CONFIG_HOOK_GUARD_ERROR,
    "rolling buffer config rejects automatic persistence hooks",
  );
}
expectThrows(
  () =>
    deriveCircularAudioBufferCapacity(
      { sampleRateHz: 16000, channelCount: 0, bytesPerSample: 2 },
      15,
    ),
  "invalid active channel count is rejected",
);
expectThrows(
  () => onDeviceBuffer.read(-1),
  "negative read length is rejected",
);
expectThrows(
  () => onDeviceBuffer.append([0, 256]),
  "invalid audio byte values are rejected",
);
