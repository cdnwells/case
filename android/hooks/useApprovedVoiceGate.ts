import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendCapturedFrameToCircularBuffer,
  createApprovedAudioSaveAuthorization,
  createApprovedAudioSaveAction,
  createLocalApprovedAudioClipStore,
  createRollingAudioBufferConfig,
  createApprovedSpeechAudioRelease,
  createOnDeviceCircularAudioBuffer,
  discardRejectedSpeechBeforeDownstream,
  getSavedApprovedAudioRecordView as getSavedApprovedAudioRecordViewFromStore,
  listSavedApprovedAudioRecordViews as listSavedApprovedAudioRecordViewsFromStore,
  CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
  assertRollingBufferDeprecatedDurationNotOverridden,
  assertRollingBufferDefaultDurationNotOverridden,
  saveApprovedAudioClipFromExplicitSaveAction,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
  type ActiveAudioFormat,
  type ApprovedAudioClipStore,
  type ApprovedAudioSaveRequestInput,
  type ApprovedAudioSaveUserIdentity,
  type ApprovedSpeechAudioReleaseReason,
  type ApprovedSpeechRollingBufferAudioSegment,
  type CapturedAudioFrame,
  type OnDeviceCircularAudioBuffer,
  type SavedApprovedAudioClip,
  type SavedApprovedAudioRecordView,
} from "@/constants/audioBuffer";
import {
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE,
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent,
  type ApprovedVoicePipelineTimingEvent,
  type ApprovedVoiceSpeechProcessingAudioSource,
} from "@/services/voice/approvedVoiceProcessingLatency";
import {
  DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT,
  type VoiceGateFrameSource as ContinuousVoiceGateFrameSource,
} from "@/services/voice/continuousMicrophoneCapture";
import { createNativeContinuousMicrophoneFrameSource } from "@/services/voice/nativeContinuousMicrophoneCapture";
import {
  toVoiceGateApprovedVoiceProfiles,
  type VoiceGateApprovedVoiceAuthorizationProfile,
} from "@/services/voice/approvedVoiceProfiles";
import {
  createApprovedVoiceGate,
  DEFAULT_VOICE_GATE_CONFIG,
  type ApprovedVoiceProfile,
  type ApprovedVoiceRecognitionEvent as ApprovedVoiceRecognitionMetadataEvent,
  type VoiceGateConfig,
  type VoiceGateFrame,
  type VoiceGateRecognitionResult,
} from "@/services/voice/voiceGate";

export { DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT };
export {
  createSavedApprovedAudioRecordView,
  getSavedApprovedAudioRecordView,
  listSavedApprovedAudioRecordViews,
  SAVED_APPROVED_AUDIO_RECORD_RETENTION_REASON_EXPLICIT_USER_VISIBLE_LATER_USE,
} from "@/constants/audioBuffer";
export type { SavedApprovedAudioRecordView };

export type VoiceGateCapturedFrame = CapturedAudioFrame<VoiceGateFrame>;
export type VoiceGateFrameSource = ContinuousVoiceGateFrameSource;
type LoadedApprovedVoiceProfile = VoiceGateApprovedVoiceAuthorizationProfile;
export type ApprovedVoiceCaptureSaveRequestInput = Omit<
  ApprovedAudioSaveRequestInput,
  "approvedVoiceMatch"
>;
export type ApprovedVoiceRecognitionEvent =
  ApprovedVoiceRecognitionMetadataEvent & {
    approvedUserIdentity: ApprovedAudioSaveUserIdentity;
    releaseCapturedAudio: (
      reason?: ApprovedSpeechAudioReleaseReason,
    ) => boolean;
    approvedSpeechAudioSegment: ApprovedSpeechRollingBufferAudioSegment | null;
    approvedSpeechProcessingAudioSource: ApprovedVoiceSpeechProcessingAudioSource;
    saveCapturedAudio: (
      request: ApprovedVoiceCaptureSaveRequestInput,
      options?: ApprovedVoiceCaptureSaveOptions,
    ) => SavedApprovedAudioClip;
  };

export interface ApprovedVoiceCaptureSaveOptions {
  clipId?: string;
  savedAtMs?: number;
  clipStore?: ApprovedAudioClipStore;
}

interface UseApprovedVoiceGateOptions {
  enabled: boolean;
  approvedVoices?: ApprovedVoiceProfile[];
  frameSource?: VoiceGateFrameSource | null;
  activeAudioFormat?: ActiveAudioFormat;
  rollingBufferActiveDurationSeconds?: number;
  approvedAudioClipStore?: ApprovedAudioClipStore;
  config?: Partial<VoiceGateConfig>;
  onApprovedVoiceDetected: (
    result: ApprovedVoiceRecognitionEvent,
  ) => void | Promise<void>;
  onTimingEvent?: (event: ApprovedVoicePipelineTimingEvent) => void;
}

interface UseApprovedVoiceGateReturn {
  isListening: boolean;
  lastRecognition: VoiceGateRecognitionResult | null;
  approvedVoiceCount: number;
}

const EMPTY_APPROVED_VOICES: ApprovedVoiceProfile[] = [];
const EMPTY_LOADED_APPROVED_VOICES: LoadedApprovedVoiceProfile[] = [];
const defaultApprovedAudioClipStore = createLocalApprovedAudioClipStore();
const approvedVoiceGateRuntimeConfigListeners = new Set<() => void>();
let approvedVoiceGateRuntimeConfigRevision = 0;

type ApprovedAudioRecordViewListStore = Pick<
  ApprovedAudioClipStore,
  "list"
> &
  Partial<Pick<ApprovedAudioClipStore, "subscribe">>;

type VoiceGateGlobal = typeof globalThis & {
  __CASE_APPROVED_VOICE_PROFILES__?: ApprovedVoiceProfile[];
  __CASE_VOICE_GATE_FRAME_SOURCE__?: VoiceGateFrameSource;
  __CASE_VOICE_GATE_AUDIO_FORMAT__?: ActiveAudioFormat;
  __CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__?: number;
  /**
   * @deprecated Alias for __CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__.
   */
  __CASE_ROLLING_BUFFER_DURATION_SECONDS__?: number;
};

function getConfiguredApprovedVoices(): ApprovedVoiceProfile[] {
  return (
    (globalThis as VoiceGateGlobal).__CASE_APPROVED_VOICE_PROFILES__ ||
    EMPTY_APPROVED_VOICES
  );
}

function getConfiguredFrameSource(): VoiceGateFrameSource | null {
  return (
    (globalThis as VoiceGateGlobal).__CASE_VOICE_GATE_FRAME_SOURCE__ || null
  );
}

function getConfiguredAudioFormat(): ActiveAudioFormat {
  return (
    (globalThis as VoiceGateGlobal).__CASE_VOICE_GATE_AUDIO_FORMAT__ ||
    DEFAULT_CONTINUOUS_CAPTURE_AUDIO_FORMAT
  );
}

function resolveRollingBufferActiveDurationSecondsOverride({
  rollingBufferActiveDurationSeconds,
}: {
  rollingBufferActiveDurationSeconds?: number;
}): number | undefined {
  if (rollingBufferActiveDurationSeconds === undefined) {
    return undefined;
  }

  return createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds,
  }).rollingBufferActiveDurationSeconds;
}

function getConfiguredRollingBufferActiveDurationSeconds(): number {
  const runtime = globalThis as VoiceGateGlobal;
  return createRollingAudioBufferConfig({
    rollingBufferActiveDurationSeconds:
      runtime.__CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__,
  }).rollingBufferActiveDurationSeconds;
}

function notifyApprovedVoiceGateRuntimeConfigChanged(): void {
  approvedVoiceGateRuntimeConfigRevision += 1;

  for (const listener of approvedVoiceGateRuntimeConfigListeners) {
    listener();
  }
}

function subscribeApprovedVoiceGateRuntimeConfig(
  listener: () => void,
): () => void {
  approvedVoiceGateRuntimeConfigListeners.add(listener);
  const unsubscribe = () => {
    approvedVoiceGateRuntimeConfigListeners.delete(listener);
  };
  return unsubscribe;
}

function getApprovedVoiceGateRuntimeConfigRevision(): number {
  return approvedVoiceGateRuntimeConfigRevision;
}

function useApprovedVoiceGateRuntimeConfigRevision(): number {
  const [runtimeConfigRevision, setRuntimeConfigRevision] = useState(
    getApprovedVoiceGateRuntimeConfigRevision,
  );

  useEffect(
    () =>
      subscribeApprovedVoiceGateRuntimeConfig(() => {
        setRuntimeConfigRevision(getApprovedVoiceGateRuntimeConfigRevision());
      }),
    [],
  );

  return runtimeConfigRevision;
}

function isRejectedVoiceGateWindowComplete(
  result: VoiceGateRecognitionResult,
  config: VoiceGateConfig,
): boolean {
  if (result.accepted) return false;
  if (
    result.reason === "empty_embedding" ||
    result.reason === "latency_limit_exceeded" ||
    result.reason === "no_approved_voices"
  ) {
    return true;
  }

  return (
    result.latencyMs !== null &&
    result.latencyMs >= config.maxRecognitionLatencyMs
  );
}

function createApprovedAudioSaveUserIdentityFromRecognitionEvent(
  recognitionEvent: ApprovedVoiceRecognitionMetadataEvent,
  approvedVoices: readonly LoadedApprovedVoiceProfile[],
): ApprovedAudioSaveUserIdentity {
  const matchedProfileMetadata =
    recognitionEvent.matchedApprovedVoiceProfileMetadata;
  const matchedApprovedVoiceProfile = approvedVoices.find(
    (profile) =>
      profile.id === recognitionEvent.matchedVoiceId ||
      profile.identityId === recognitionEvent.matchedVoiceId ||
      profile.profileId === matchedProfileMetadata?.profileId,
  );
  const identity: ApprovedAudioSaveUserIdentity = {
    approvedVoiceId: recognitionEvent.matchedVoiceId,
    approvedUserId:
      matchedProfileMetadata?.profileId ??
      matchedApprovedVoiceProfile?.profileId ??
      matchedApprovedVoiceProfile?.identityId ??
      recognitionEvent.matchedVoiceId,
  };

  if (matchedProfileMetadata?.displayName) {
    identity.displayName = matchedProfileMetadata.displayName;
  } else if (matchedApprovedVoiceProfile?.displayName) {
    identity.displayName = matchedApprovedVoiceProfile.displayName;
  }

  return identity;
}

interface ApprovedVoiceGateRuntimeConfig {
  approvedVoices?: ApprovedVoiceProfile[];
  frameSource?: VoiceGateFrameSource | null;
  activeAudioFormat?: ActiveAudioFormat;
  rollingBufferActiveDurationSeconds?: number;
}

export function configureApprovedVoiceGateRuntime(
  config: ApprovedVoiceGateRuntimeConfig,
) {
  assertRollingBufferDefaultDurationNotOverridden(config);
  assertRollingBufferDeprecatedDurationNotOverridden(config);

  const {
    approvedVoices,
    frameSource,
    activeAudioFormat,
    rollingBufferActiveDurationSeconds,
  } = config;
  const runtime = globalThis as VoiceGateGlobal;

  if (approvedVoices) {
    runtime.__CASE_APPROVED_VOICE_PROFILES__ = approvedVoices;
  }

  if (frameSource !== undefined) {
    if (frameSource) {
      runtime.__CASE_VOICE_GATE_FRAME_SOURCE__ = frameSource;
    } else {
      delete runtime.__CASE_VOICE_GATE_FRAME_SOURCE__;
    }
  }

  if (activeAudioFormat) {
    runtime.__CASE_VOICE_GATE_AUDIO_FORMAT__ = activeAudioFormat;
  }

  const resolvedRollingBufferActiveDurationSeconds =
    resolveRollingBufferActiveDurationSecondsOverride({
      rollingBufferActiveDurationSeconds,
    });

  if (resolvedRollingBufferActiveDurationSeconds !== undefined) {
    runtime.__CASE_ROLLING_BUFFER_ACTIVE_DURATION_SECONDS__ =
      resolvedRollingBufferActiveDurationSeconds;
    delete runtime.__CASE_ROLLING_BUFFER_DURATION_SECONDS__;
  }

  notifyApprovedVoiceGateRuntimeConfigChanged();
}

export function getDefaultApprovedAudioClipStore(): ApprovedAudioClipStore {
  return defaultApprovedAudioClipStore;
}

export function listApprovedAudioRecordViews(
  clipStore: Pick<
    ApprovedAudioClipStore,
    "list"
  > = defaultApprovedAudioClipStore,
): SavedApprovedAudioRecordView[] {
  return listSavedApprovedAudioRecordViewsFromStore(clipStore);
}

export function getApprovedAudioRecordView(
  clipId: string,
  clipStore: Pick<
    ApprovedAudioClipStore,
    "get"
  > = defaultApprovedAudioClipStore,
): SavedApprovedAudioRecordView | null {
  return getSavedApprovedAudioRecordViewFromStore(clipStore, clipId);
}

export function deleteApprovedAudioRecord(
  clipId: string,
  clipStore: Pick<
    ApprovedAudioClipStore,
    "delete"
  > = defaultApprovedAudioClipStore,
): boolean {
  return clipStore.delete(clipId);
}

export function useApprovedAudioRecordViews(
  clipStore: ApprovedAudioRecordViewListStore = defaultApprovedAudioClipStore,
): SavedApprovedAudioRecordView[] {
  const [records, setRecords] = useState<SavedApprovedAudioRecordView[]>(() =>
    listApprovedAudioRecordViews(clipStore),
  );

  useEffect(() => {
    const refreshRecords = () => {
      setRecords(listApprovedAudioRecordViews(clipStore));
    };

    refreshRecords();

    if (typeof clipStore.subscribe !== "function") {
      return undefined;
    }

    return clipStore.subscribe(refreshRecords);
  }, [clipStore]);

  return records;
}

export function useApprovedVoiceGate(
  options: UseApprovedVoiceGateOptions,
): UseApprovedVoiceGateReturn {
  assertRollingBufferDefaultDurationNotOverridden(options);
  assertRollingBufferDeprecatedDurationNotOverridden(options);
  const runtimeConfigRevision = useApprovedVoiceGateRuntimeConfigRevision();

  const {
    enabled,
    approvedVoices,
    frameSource,
    activeAudioFormat,
    rollingBufferActiveDurationSeconds,
    approvedAudioClipStore = defaultApprovedAudioClipStore,
    config,
    onApprovedVoiceDetected,
    onTimingEvent,
  } = options;
  const resolvedApprovedVoices =
    approvedVoices || getConfiguredApprovedVoices() || EMPTY_APPROVED_VOICES;
  const loadedApprovedVoices = useMemo(
    () =>
      resolvedApprovedVoices.length === 0
        ? EMPTY_LOADED_APPROVED_VOICES
        : toVoiceGateApprovedVoiceProfiles(resolvedApprovedVoices),
    [resolvedApprovedVoices, runtimeConfigRevision],
  );
  const resolvedActiveAudioFormat =
    activeAudioFormat || getConfiguredAudioFormat();
  const resolvedRollingBufferActiveDurationSeconds =
    resolveRollingBufferActiveDurationSecondsOverride({
      rollingBufferActiveDurationSeconds,
    }) ?? getConfiguredRollingBufferActiveDurationSeconds();
  const nativeFrameSource = useMemo(
    () =>
      createNativeContinuousMicrophoneFrameSource({
        activeAudioFormat: resolvedActiveAudioFormat,
        rollingBufferActiveDurationSeconds:
          resolvedRollingBufferActiveDurationSeconds,
      }),
    [
      resolvedActiveAudioFormat.sampleRateHz,
      resolvedActiveAudioFormat.channelCount,
      resolvedActiveAudioFormat.bytesPerSample,
      resolvedRollingBufferActiveDurationSeconds,
    ],
  );
  const [isListening, setIsListening] = useState(false);
  const [lastRecognition, setLastRecognition] =
    useState<VoiceGateRecognitionResult | null>(null);
  const onApprovedVoiceDetectedRef = useRef(onApprovedVoiceDetected);
  const onTimingEventRef = useRef(onTimingEvent);
  const sourceRef = useRef<VoiceGateFrameSource | null>(null);
  const rollingAudioBufferRef = useRef<OnDeviceCircularAudioBuffer | null>(
    null,
  );

  onApprovedVoiceDetectedRef.current = onApprovedVoiceDetected;
  onTimingEventRef.current = onTimingEvent;

  const resolvedFrameSource =
    frameSource === undefined
      ? getConfiguredFrameSource() || nativeFrameSource
      : frameSource;

  const stopListening = useCallback(async () => {
    const source = sourceRef.current;
    const rollingAudioBuffer = rollingAudioBufferRef.current;
    sourceRef.current = null;
    rollingAudioBufferRef.current = null;
    rollingAudioBuffer?.clear();
    setIsListening(false);

    if (!source) return;
    try {
      await source.stop();
    } catch {
      // The gate owns only local embeddings; no captured speech is retained here.
    }
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      !resolvedFrameSource ||
      loadedApprovedVoices.length === 0
    ) {
      stopListening();
      return;
    }

    let disposed = false;
    const rollingAudioBuffer = createOnDeviceCircularAudioBuffer(
      resolvedActiveAudioFormat,
      {
        rollingBufferActiveDurationSeconds:
          resolvedRollingBufferActiveDurationSeconds,
      },
    );
    rollingAudioBufferRef.current = rollingAudioBuffer;
    const rollingBufferActiveDurationMs =
      rollingAudioBuffer.getConfig().rollingBufferActiveDurationSeconds * 1000;

    const voiceGateConfig = {
      ...DEFAULT_VOICE_GATE_CONFIG,
      ...config,
    };
    let activeUtteranceId: string | null = null;
    let approvedVoiceProcessingStarted = false;
    let rollingBufferExpiryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRollingBufferExpiryTimer = () => {
      if (rollingBufferExpiryTimer !== null) {
        clearTimeout(rollingBufferExpiryTimer);
        rollingBufferExpiryTimer = null;
      }
    };

    const scheduleRollingBufferExpiry = () => {
      if (disposed) return;

      clearRollingBufferExpiryTimer();

      const state = rollingAudioBuffer.getState();
      if (
        state.sizeBytes === 0 ||
        state.oldestRetainedAudioTimestampMs === null ||
        state.newestRetainedAudioTimestampMs === null
      ) {
        activeUtteranceId = null;
        return;
      }

      const oldestRetainedAudioExpiresAtMs =
        state.oldestRetainedAudioTimestampMs +
        rollingBufferActiveDurationMs;
      const delayMs = Math.max(
        1,
        oldestRetainedAudioExpiresAtMs - state.newestRetainedAudioTimestampMs,
      );
      const scheduledAtWallClockMs = Date.now();
      const newestRetainedAudioTimestampAtScheduleMs =
        state.newestRetainedAudioTimestampMs;

      rollingBufferExpiryTimer = setTimeout(() => {
        rollingBufferExpiryTimer = null;
        if (disposed) return;

        const elapsedWallClockMs = Math.max(
          0,
          Date.now() - scheduledAtWallClockMs,
        );
        const bufferClockNowMs =
          newestRetainedAudioTimestampAtScheduleMs + elapsedWallClockMs;
        rollingAudioBuffer.evictExpiredUnsavedAudio(bufferClockNowMs);
        if (rollingAudioBuffer.getState().sizeBytes === 0) {
          activeUtteranceId = null;
          gate.reset();
        }
        scheduleRollingBufferExpiry();
      }, delayMs);
    };

    const clearRejectedVoiceGateAudio = (
      recognitionResult: Partial<VoiceGateRecognitionResult> = {
        accepted: false,
        reason: "voice_gate_window_replaced",
      },
    ) => {
      discardRejectedSpeechBeforeDownstream({
        recognitionResult,
        rollingAudioBuffer,
      });
      clearRollingBufferExpiryTimer();
      gate.reset();
      activeUtteranceId = null;
    };

    const triggerApprovedVoiceSpeechProcessing = (
      recognitionEvent: ApprovedVoiceRecognitionMetadataEvent,
    ) => {
      if (disposed || approvedVoiceProcessingStarted) return;

      approvedVoiceProcessingStarted = true;
      clearRollingBufferExpiryTimer();
      const approvedSpeechAudioSegment =
        selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
          rollingAudioBuffer,
          recognitionResult: recognitionEvent,
          downstreamPath: "transcription",
        });
      const approvedSpeechProcessingAudioSource = approvedSpeechAudioSegment
        ? APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE
        : APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE;
      const approvedSpeechAudioRelease =
        createApprovedSpeechAudioRelease({
          rollingAudioBuffer,
          rollingBufferAudioSegments: approvedSpeechAudioSegment
            ? [approvedSpeechAudioSegment]
            : [],
          processingWindowDurationSeconds:
            CAPTURE_PROCESSING_WINDOW_DEFAULT_DURATION_SECONDS,
          processingWindowStartedAtMs: recognitionEvent.recognizedAtMs,
          onRelease: () => {
            if (rollingAudioBufferRef.current === rollingAudioBuffer) {
              rollingAudioBufferRef.current = null;
            }
            clearRollingBufferExpiryTimer();
          },
        });
      const approvedVoiceEvent: ApprovedVoiceRecognitionEvent = {
        ...recognitionEvent,
        approvedUserIdentity:
          createApprovedAudioSaveUserIdentityFromRecognitionEvent(
            recognitionEvent,
            loadedApprovedVoices,
          ),
        releaseCapturedAudio: approvedSpeechAudioRelease.release,
        approvedSpeechAudioSegment,
        approvedSpeechProcessingAudioSource,
        saveCapturedAudio: (request, options = {}) => {
          try {
            const approvedUserIdentity =
              createApprovedAudioSaveUserIdentityFromRecognitionEvent(
                recognitionEvent,
                loadedApprovedVoices,
              );
            if (
              !recognitionEvent.matchedVoiceId ||
              request.approvedUserIdentity.approvedVoiceId !==
                recognitionEvent.matchedVoiceId ||
              request.approvedUserIdentity.approvedUserId !==
                approvedUserIdentity.approvedUserId ||
              request.approvedUserIdentity.displayName !==
                approvedUserIdentity.displayName
            ) {
              throw new Error(
                "approved audio save request identity must match the recognized approved voice",
              );
            }

            const saveAction = createApprovedAudioSaveAction({
              ...request,
              approvedVoiceMatch: {
                accepted: true,
                matchedVoiceId: recognitionEvent.matchedVoiceId,
                matchedApprovedVoiceProfileId:
                  recognitionEvent.matchedApprovedVoiceProfileId,
                matchedApprovedVoiceLabel:
                  recognitionEvent.matchedApprovedVoiceLabel,
                matchedApprovedVoiceProfileMetadata:
                  recognitionEvent.matchedApprovedVoiceProfileMetadata,
                confidence: recognitionEvent.confidence,
                recognizedAtMs: recognitionEvent.recognizedAtMs,
                recognitionLatencyMs: recognitionEvent.latencyMs ?? 0,
                reason: recognitionEvent.reason,
              },
            });
            const savedClip = saveApprovedAudioClipFromExplicitSaveAction(
              options.clipStore ?? approvedAudioClipStore,
              {
                saveAction,
                saveAuthorization:
                  createApprovedAudioSaveAuthorization(saveAction),
                rollingAudioBuffer,
                approvedSpeechAudioSegment,
                clipId: options.clipId,
                savedAtMs: options.savedAtMs,
              },
            );
            approvedSpeechAudioRelease.release("processing_complete");
            return savedClip;
          } catch (error) {
            approvedSpeechAudioRelease.release("processing_error");
            throw error;
          }
        },
      };

      disposed = true;
      activeUtteranceId = null;
      rollingAudioBufferRef.current = null;
      sourceRef.current = null;
      setIsListening(false);

      try {
        const trigger = triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
          approvedVoiceEvent,
          onTimingEvent: onTimingEventRef.current,
          startSpeechProcessing: onApprovedVoiceDetectedRef.current,
        });

        if (!trigger.triggered) {
          approvedSpeechAudioRelease.release("processing_start_failed");
        } else {
          // Downstream may explicitly save before completion; otherwise
          // successful completion discards unsaved raw audio immediately.
          void Promise.resolve(trigger.processingResult).then(
            () => {
              approvedSpeechAudioRelease.release("processing_complete");
            },
            () => {
              approvedSpeechAudioRelease.release("processing_error");
            },
          );
        }
      } catch {
        approvedSpeechAudioRelease.release("processing_error");
      }

      void Promise.resolve(resolvedFrameSource.stop()).catch(() => {
        // The next voice-gate cycle will request a fresh local source.
      });
    };

    const gate = createApprovedVoiceGate({
      approvedVoices: loadedApprovedVoices,
      config: voiceGateConfig,
      onApprovedVoiceRecognized: triggerApprovedVoiceSpeechProcessing,
    });

    const start = async () => {
      try {
        sourceRef.current = resolvedFrameSource;
        await resolvedFrameSource.start({
          onFrame: (frame) => {
            if (disposed) return;
            const frameUtteranceId = frame.utteranceId || null;
            if (
              activeUtteranceId &&
              frameUtteranceId &&
              frameUtteranceId !== activeUtteranceId
            ) {
              clearRejectedVoiceGateAudio();
            }
            activeUtteranceId = frameUtteranceId || activeUtteranceId;
            let recognitionFrame: VoiceGateFrame;

            try {
              recognitionFrame = appendCapturedFrameToCircularBuffer(
                rollingAudioBuffer,
                frame,
              );
              rollingAudioBuffer.evictExpiredUnsavedAudio(
                frame.timestampMs ?? Date.now(),
              );
              scheduleRollingBufferExpiry();
            } catch {
              disposed = true;
              clearRollingBufferExpiryTimer();
              rollingAudioBuffer.clear();
              rollingAudioBufferRef.current = null;
              sourceRef.current = null;
              setIsListening(false);
              void Promise.resolve(resolvedFrameSource.stop()).catch(() => {
                // A malformed capture frame is discarded locally.
              });
              return;
            }

            const result = gate.observeFrame(recognitionFrame);
            setLastRecognition(result);

            if (!result.accepted) {
              if (isRejectedVoiceGateWindowComplete(result, voiceGateConfig)) {
                clearRejectedVoiceGateAudio(result);
              }
              return;
            }
          },
          onError: () => {
            if (disposed) return;
            clearRollingBufferExpiryTimer();
            rollingAudioBuffer.clear();
            rollingAudioBufferRef.current = null;
            setIsListening(false);
          },
        });
        if (!disposed) {
          setIsListening(true);
        }
      } catch {
        sourceRef.current = null;
        clearRollingBufferExpiryTimer();
        rollingAudioBuffer.clear();
        rollingAudioBufferRef.current = null;
        setIsListening(false);
      }
    };

    start();

    return () => {
      disposed = true;
      clearRollingBufferExpiryTimer();
      stopListening();
    };
  }, [
    enabled,
    loadedApprovedVoices,
    resolvedFrameSource,
    resolvedActiveAudioFormat,
    resolvedRollingBufferActiveDurationSeconds,
    approvedAudioClipStore,
    config,
    stopListening,
  ]);

  useEffect(() => {
    rollingAudioBufferRef.current?.updateActiveRollingBufferDurationSeconds(
      resolvedRollingBufferActiveDurationSeconds,
    );
  }, [resolvedRollingBufferActiveDurationSeconds, runtimeConfigRevision]);

  return {
    isListening,
    lastRecognition,
    approvedVoiceCount: loadedApprovedVoices.length,
  };
}
