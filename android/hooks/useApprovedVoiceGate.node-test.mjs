import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`${message}: expected ${first} before ${second}`);
  }
}

const useApprovedVoiceGateSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "useApprovedVoiceGate.ts"),
  "utf8",
);
const frameHandlerStart = useApprovedVoiceGateSource.indexOf(
  "onFrame: (frame) => {",
);
const frameHandlerSource = useApprovedVoiceGateSource.slice(
  frameHandlerStart,
  useApprovedVoiceGateSource.indexOf("onError: () => {", frameHandlerStart),
);
const cleanupSource = useApprovedVoiceGateSource.slice(
  useApprovedVoiceGateSource.indexOf("return () => {"),
);
const approvedVoiceProcessingHandlerStart =
  useApprovedVoiceGateSource.indexOf(
    "const triggerApprovedVoiceSpeechProcessing",
  );
const approvedVoiceProcessingHandlerSource = useApprovedVoiceGateSource.slice(
  approvedVoiceProcessingHandlerStart,
  useApprovedVoiceGateSource.indexOf(
    "const gate = createApprovedVoiceGate",
    approvedVoiceProcessingHandlerStart,
  ),
);
const processingCompletionCleanupSource =
  approvedVoiceProcessingHandlerSource.slice(
    approvedVoiceProcessingHandlerSource.indexOf(
      "void Promise.resolve(trigger.processingResult)",
    ),
    approvedVoiceProcessingHandlerSource.indexOf(
      "void Promise.resolve(resolvedFrameSource.stop())",
    ),
  );
const configuredRollingBufferResolverSource = useApprovedVoiceGateSource.slice(
  useApprovedVoiceGateSource.indexOf(
    "function getConfiguredRollingBufferActiveDurationSeconds",
  ),
  useApprovedVoiceGateSource.indexOf(
    "function notifyApprovedVoiceGateRuntimeConfigChanged",
  ),
);
const runtimeConfigMutationSource = useApprovedVoiceGateSource.slice(
  useApprovedVoiceGateSource.indexOf(
    "export function configureApprovedVoiceGateRuntime",
  ),
  useApprovedVoiceGateSource.indexOf(
    "export function getDefaultApprovedAudioClipStore",
  ),
);
const nativeFrameSourceStartupSource = useApprovedVoiceGateSource.slice(
  useApprovedVoiceGateSource.indexOf("const resolvedRollingBufferActiveDurationSeconds"),
  useApprovedVoiceGateSource.indexOf("const [isListening"),
);
const useApprovedVoiceGateHookSource = useApprovedVoiceGateSource.slice(
  useApprovedVoiceGateSource.indexOf("export function useApprovedVoiceGate"),
);

expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDeprecatedDurationNotOverridden",
  ),
  true,
  "approved voice gate imports the deprecated rolling-buffer override guard",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDefaultDurationNotOverridden(config);",
  ),
  true,
  "approved voice gate runtime customization rejects immutable default duration overrides",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDeprecatedDurationNotOverridden(config);",
  ),
  true,
  "approved voice gate runtime customization rejects deprecated duration aliases as override sources",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDefaultDurationNotOverridden(options);",
  ),
  true,
  "approved voice gate hook customization rejects immutable default duration overrides",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDeprecatedDurationNotOverridden(options);",
  ),
  true,
  "approved voice gate hook customization rejects deprecated duration aliases as override sources",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "rollingBufferActiveDurationSeconds?: number;",
  ),
  true,
  "approved voice gate exposes active rolling-buffer duration as the customization field",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "createRollingAudioBufferConfig({",
  ),
  true,
  "approved voice gate parses active rolling-buffer duration overrides through shared config validation",
);
expectEqual(
  configuredRollingBufferResolverSource.includes(
    "runtime.__CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__",
  ),
  true,
  "approved voice gate resolves runtime active rolling-buffer duration from the active field",
);
expectEqual(
  configuredRollingBufferResolverSource.includes(
    "runtime.__CASE_ROLLING_BUFFER_DURATION_SECONDS__",
  ),
  false,
  "approved voice gate does not resolve runtime active duration from the deprecated alias",
);
expectEqual(
  configuredRollingBufferResolverSource.includes("createRollingAudioBufferConfig({"),
  true,
  "approved voice gate no-override rolling-buffer duration resolves through shared config resolution",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "runtime.__CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__ =\n      resolvedRollingBufferActiveDurationSeconds;",
  ),
  true,
  "approved voice gate runtime customization writes only the active rolling-buffer duration",
);
expectBefore(
  runtimeConfigMutationSource,
  "runtime.__CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__ =\n      resolvedRollingBufferActiveDurationSeconds;",
  "notifyApprovedVoiceGateRuntimeConfigChanged();",
  "approved voice gate publishes the changed active duration before notifying app listeners",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "delete runtime.__CASE_ROLLING_BUFFER_DURATION_SECONDS__;",
  ),
  true,
  "approved voice gate runtime customization clears stale deprecated duration aliases",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "runtime.__CASE_ROLLING_BUFFER_DURATION_SECONDS__ =",
  ),
  false,
  "approved voice gate runtime customization does not write the deprecated ambiguous duration alias",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "const approvedVoiceGateRuntimeConfigListeners = new Set<() => void>();",
  ),
  true,
  "approved voice gate tracks runtime configuration subscribers",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "notifyApprovedVoiceGateRuntimeConfigChanged();",
  ),
  true,
  "approved voice gate notifies listeners after runtime configuration changes",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "const runtimeConfigRevision = useApprovedVoiceGateRuntimeConfigRevision();",
  ),
  true,
  "approved voice gate subscribes hook state to runtime configuration revisions",
);
expectBefore(
  useApprovedVoiceGateHookSource,
  "const runtimeConfigRevision = useApprovedVoiceGateRuntimeConfigRevision();",
  "const resolvedRollingBufferActiveDurationSeconds",
  "approved voice gate refreshes runtime config before resolving active rolling-buffer duration",
);
expectBefore(
  useApprovedVoiceGateHookSource,
  "getConfiguredRollingBufferActiveDurationSeconds();",
  "createNativeContinuousMicrophoneFrameSource({",
  "approved voice gate applies changed runtime configuration before native capture is constructed",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "assertRollingBufferDeprecatedDurationNotOverridden(options);",
  ),
  true,
  "approved voice gate rejects deprecated-alias customization before resolving active duration",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "rollingBufferActiveDurationSeconds:\n          resolvedRollingBufferActiveDurationSeconds",
  ),
  true,
  "approved voice gate initializes the on-device rolling buffer with the resolved active duration",
);
expectBefore(
  useApprovedVoiceGateHookSource,
  "getConfiguredRollingBufferActiveDurationSeconds();",
  "rollingBufferActiveDurationSeconds:\n          resolvedRollingBufferActiveDurationSeconds",
  "approved voice gate uses changed runtime configuration when creating the app rolling buffer",
);
expectBefore(
  nativeFrameSourceStartupSource,
  "const resolvedRollingBufferActiveDurationSeconds",
  "createNativeContinuousMicrophoneFrameSource({",
  "approved voice gate resolves the active rolling-buffer duration before native continuous capture startup",
);
expectEqual(
  nativeFrameSourceStartupSource.includes(
    "rollingBufferActiveDurationSeconds:\n          resolvedRollingBufferActiveDurationSeconds,",
  ),
  true,
  "approved voice gate passes the configured active duration into native continuous capture startup",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "rollingAudioBuffer.getConfig().rollingBufferActiveDurationSeconds * 1000",
  ),
  true,
  "approved voice gate derives rolling-buffer maintenance from the buffer's active duration",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "rollingAudioBufferRef.current?.updateActiveRollingBufferDurationSeconds(\n      resolvedRollingBufferActiveDurationSeconds,",
  ),
  true,
  "approved voice gate propagates runtime active-duration changes to the active rolling buffer",
);
expectBefore(
  useApprovedVoiceGateHookSource,
  "rollingAudioBufferRef.current?.updateActiveRollingBufferDurationSeconds(\n      resolvedRollingBufferActiveDurationSeconds,",
  "}, [resolvedRollingBufferActiveDurationSeconds, runtimeConfigRevision]);",
  "approved voice gate verifies a changed configuration value updates the active app buffer duration",
);
expectEqual(
  useApprovedVoiceGateSource.includes("let rollingBufferExpiryTimer"),
  true,
  "approved voice gate tracks a rolling-buffer expiry timer",
);
expectEqual(
  useApprovedVoiceGateSource.includes("evictExpiredUnsavedAudio"),
  true,
  "approved voice gate actively evicts expired unsaved raw audio",
);
expectEqual(
  useApprovedVoiceGateSource.includes("export function deleteApprovedAudioRecord"),
  true,
  "approved voice gate exposes retained-recording deletion",
);
expectEqual(
  useApprovedVoiceGateSource.includes("return clipStore.delete(clipId);"),
  true,
  "approved voice gate retained-recording deletion removes clips through the subscribed store",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "setRecords(listApprovedAudioRecordViews(clipStore));",
  ),
  true,
  "approved audio record hook refreshes retained-recording surface state from the clip store",
);
expectEqual(
  useApprovedVoiceGateSource.includes("return clipStore.subscribe(refreshRecords);"),
  true,
  "approved audio record hook updates surface state after clip store changes",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "newestRetainedAudioTimestampAtScheduleMs + elapsedWallClockMs",
  ),
  true,
  "approved voice gate maps timer elapsed time onto the buffer timestamp clock",
);
expectBefore(
  frameHandlerSource,
  "scheduleRollingBufferExpiry();",
  "const result = gate.observeFrame(recognitionFrame);",
  "rolling-buffer expiry is scheduled immediately after buffering a frame",
);
expectBefore(
  frameHandlerSource,
  "appendCapturedFrameToCircularBuffer(",
  "rollingAudioBuffer.evictExpiredUnsavedAudio(",
  "continuous capture applies active-window eviction immediately after audio ingestion",
);
expectBefore(
  frameHandlerSource,
  "rollingAudioBuffer.evictExpiredUnsavedAudio(",
  "const result = gate.observeFrame(recognitionFrame);",
  "continuous capture enforces active-window eviction before downstream voice-gate processing",
);
expectBefore(
  cleanupSource,
  "clearRollingBufferExpiryTimer();",
  "stopListening();",
  "listener cleanup clears the rolling-buffer expiry timer before dropping the source",
);
expectEqual(
  approvedVoiceProcessingHandlerStart >= 0,
  true,
  "approved voice gate declares a recognition-event processing handoff",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "selectEligibleRollingBufferAudioSegmentForSpeechProcessing({",
  ),
  true,
  "approved voice gate selects an eligible rolling-buffer segment after approved recognition",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "rollingBufferAudioSegments: approvedSpeechAudioSegment",
  ),
  true,
  "approved voice gate attaches the selected rolling-buffer segment to no-save release cleanup",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes("approvedSpeechAudioSegment,"),
  true,
  "approved voice gate passes the selected rolling-buffer segment on the approved event",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE",
  ),
  true,
  "approved voice gate marks the live audio stream fallback when no rolling-buffer segment is eligible",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "approvedSpeechProcessingAudioSource,",
  ),
  true,
  "approved voice gate passes the selected speech-processing audio source on the approved event",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "type ApprovedAudioSaveUserIdentity",
  ),
  true,
  "approved voice gate imports the approved-audio save user identity contract",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "approvedUserIdentity: ApprovedAudioSaveUserIdentity;",
  ),
  true,
  "approved voice recognition events expose save-ready approved user identity metadata",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "recognitionEvent.matchedApprovedVoiceProfileMetadata",
  ),
  true,
  "approved voice gate reads matched approved profile metadata from recognition events",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "matchedProfileMetadata?.profileId",
  ),
  true,
  "approved voice gate uses matched profile metadata when populating approved user identity",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "approvedUserIdentity:\n          createApprovedAudioSaveUserIdentityFromRecognitionEvent(",
  ),
  true,
  "approved voice gate attaches approved identity metadata before downstream save flow use",
);
expectBefore(
  approvedVoiceProcessingHandlerSource,
  "approvedUserIdentity:\n          createApprovedAudioSaveUserIdentityFromRecognitionEvent(",
  "saveCapturedAudio: (request, options = {}) => {",
  "approved voice gate exposes the approved identity before captured audio can be saved",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "matchedApprovedVoiceProfileId:\n                  recognitionEvent.matchedApprovedVoiceProfileId",
  ),
  true,
  "approved voice gate carries the matched voice profile id into explicit save metadata",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "matchedApprovedVoiceLabel:\n                  recognitionEvent.matchedApprovedVoiceLabel",
  ),
  true,
  "approved voice gate carries the matched voice profile label into explicit save metadata",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "matchedApprovedVoiceProfileMetadata:\n                  recognitionEvent.matchedApprovedVoiceProfileMetadata",
  ),
  true,
  "approved voice gate carries the matched voice profile metadata into explicit save metadata",
);
expectBefore(
  approvedVoiceProcessingHandlerSource,
  "try {\n            const approvedUserIdentity =",
  "createApprovedAudioSaveAction({",
  "approved voice gate validates explicit save identity inside the cleanup-guarded persistence path",
);
expectBefore(
  approvedVoiceProcessingHandlerSource,
  "createApprovedAudioSaveAction({",
  "saveApprovedAudioClipFromExplicitSaveAction(",
  "approved voice gate validates the explicit save request before captured audio persistence",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "approved audio save request identity must match the recognized approved voice",
  ),
  true,
  "approved voice gate rejects save attempts whose request identity differs from the recognized approved voice",
);
expectEqual(
  useApprovedVoiceGateSource.includes("type ApprovedVoicePipelineTimingEvent"),
  true,
  "approved voice gate imports approved voice pipeline timing event metadata",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "onTimingEvent?: (event: ApprovedVoicePipelineTimingEvent) => void;",
  ),
  true,
  "approved voice gate exposes a timing instrumentation callback",
);
expectEqual(
  useApprovedVoiceGateSource.includes(
    "const onTimingEventRef = useRef(onTimingEvent);",
  ),
  true,
  "approved voice gate keeps timing instrumentation on the current callback ref",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "triggerSpeechProcessingPipelineFromApprovedVoiceEvent({",
  ),
  true,
  "approved voice gate starts downstream speech processing from approved recognition events",
);
expectEqual(
  approvedVoiceProcessingHandlerSource.includes(
    "onTimingEvent: onTimingEventRef.current,",
  ),
  true,
  "approved voice gate threads timing instrumentation into the speech-processing trigger",
);
expectBefore(
  approvedVoiceProcessingHandlerSource,
  "selectEligibleRollingBufferAudioSegmentForSpeechProcessing({",
  "triggerSpeechProcessingPipelineFromApprovedVoiceEvent({",
  "approved voice gate selects rolling-buffer audio before downstream speech processing starts",
);
expectBefore(
  approvedVoiceProcessingHandlerSource,
  "triggerSpeechProcessingPipelineFromApprovedVoiceEvent({",
  "void Promise.resolve(resolvedFrameSource.stop()).catch(() => {",
  "approved voice gate attempts downstream speech processing before stopping continuous capture",
);
expectEqual(
  processingCompletionCleanupSource.includes(
    "void Promise.resolve(trigger.processingResult).then(",
  ),
  true,
  "approved voice gate observes processing completion for no-save cleanup",
);
expectEqual(
  processingCompletionCleanupSource.includes(
    "approvedSpeechAudioRelease.release(\"processing_complete\");",
  ),
  true,
  "approved voice gate automatically discards transient audio after successful processing with no save request",
);
expectEqual(
  processingCompletionCleanupSource.includes(
    "approvedSpeechAudioRelease.release(\"processing_error\");",
  ),
  true,
  "approved voice gate discards transient audio when approved processing fails",
);
