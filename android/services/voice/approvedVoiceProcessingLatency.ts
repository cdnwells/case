import { RECOGNITION_LATENCY_LIMIT_SECONDS } from "./voiceGate.js";
import type {
  ApprovedVoiceRecognitionEvent,
  MatchedApprovedVoiceProfileMetadata,
} from "./voiceGate.js";
import type { ApprovedSpeechRollingBufferAudioSegment } from "../../constants/audioBuffer";

const MILLISECONDS_PER_SECOND = 1000;

export const APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS =
  RECOGNITION_LATENCY_LIMIT_SECONDS * MILLISECONDS_PER_SECOND;
export const APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE =
  "eligible-rolling-buffer-audio";
export const APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE =
  "live-audio-stream";
export const APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE =
  "approvedVoiceRecognitionTiming";
export const APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE =
  "approvedVoiceProcessingStartTiming";

export type ApprovedVoiceSpeechProcessingAudioSource =
  | typeof APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE
  | typeof APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE;

export interface ApprovedVoiceProcessingStart {
  approvedVoiceRecognizedAtMs: number;
  processingStartedAtMs: number;
  latencyMs: number;
  latencyLimitMs: number;
  withinLimit: boolean;
}

export interface ApprovedVoiceDownstreamAuthorizationForSpeechProcessing {
  authorized: true;
  matchedVoiceId: string;
  score: number;
  threshold: number;
  decisionRule?: string;
  supportingFrameCount?: number;
  requiredFrameCount?: number;
}

export interface ApprovedVoiceEventForSpeechProcessing {
  accepted: true;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId?: string;
  matchedApprovedVoiceLabel?: string;
  matchedApprovedVoiceProfileMetadata?: MatchedApprovedVoiceProfileMetadata;
  recognizedAtMs: number;
  confidence?: number;
  latencyMs?: number | null;
  evaluatedFrameCount?: number;
  reason?: string;
  downstreamAuthorization: ApprovedVoiceDownstreamAuthorizationForSpeechProcessing;
  approvedSpeechAudioSegment?: ApprovedSpeechRollingBufferAudioSegment | null;
}

export interface ApprovedVoiceRecognitionTimingEvent {
  eventType: typeof APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE;
  occurredAtMs: number;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata | null;
  recognizedAtMs: number;
  recognitionLatencyMs: number | null;
  evaluatedFrameCount: number;
  confidence: number;
  decisionRule: string;
  downstreamAuthorized: true;
}

export interface ApprovedVoiceProcessingStartTimingEvent {
  eventType: typeof APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE;
  occurredAtMs: number;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata | null;
  approvedVoiceRecognizedAtMs: number;
  processingStartedAtMs: number;
  latencyMs: number;
  latencyLimitMs: number;
  withinLimit: boolean;
  audioSource: ApprovedVoiceSpeechProcessingAudioSource;
  triggered: boolean;
  reason: "started" | "latency_limit_exceeded";
  failureMessage: string | null;
}

export type ApprovedVoicePipelineTimingEvent =
  | ApprovedVoiceRecognitionTimingEvent
  | ApprovedVoiceProcessingStartTimingEvent;

export type ApprovedVoicePipelineTimingEventListener = (
  event: ApprovedVoicePipelineTimingEvent,
) => void;

export interface ApprovedVoiceSpeechProcessingPipelineTrigger<
  TProcessingResult = void,
> {
  triggered: boolean;
  reason: "started" | "latency_limit_exceeded";
  audioSource: ApprovedVoiceSpeechProcessingAudioSource;
  processingStart: ApprovedVoiceProcessingStart;
  processingResult: TProcessingResult | null;
  failureMessage: string | null;
}

export function measureApprovedVoiceProcessingStartLatency({
  approvedVoiceRecognizedAtMs,
  processingStartedAtMs,
}: {
  approvedVoiceRecognizedAtMs: number;
  processingStartedAtMs: number;
}): number {
  return Math.max(0, processingStartedAtMs - approvedVoiceRecognizedAtMs);
}

export function isApprovedVoiceProcessingStartWithinLimit(
  latencyMs: number,
  latencyLimitMs = APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
): boolean {
  return latencyMs < latencyLimitMs;
}

export function createApprovedVoiceProcessingStart({
  approvedVoiceRecognizedAtMs,
  processingStartedAtMs = Date.now(),
  latencyLimitMs = APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
}: {
  approvedVoiceRecognizedAtMs: number;
  processingStartedAtMs?: number;
  latencyLimitMs?: number;
}): ApprovedVoiceProcessingStart {
  const latencyMs = measureApprovedVoiceProcessingStartLatency({
    approvedVoiceRecognizedAtMs,
    processingStartedAtMs,
  });

  return {
    approvedVoiceRecognizedAtMs,
    processingStartedAtMs,
    latencyMs,
    latencyLimitMs,
    withinLimit: isApprovedVoiceProcessingStartWithinLimit(
      latencyMs,
      latencyLimitMs,
    ),
  };
}

export function formatApprovedVoiceProcessingStartLatencyFailure(
  processingStart: ApprovedVoiceProcessingStart,
): string {
  return [
    "Approved voice processing did not start within the recognition-to-processing latency limit",
    `measuredLatencyMs=${processingStart.latencyMs}`,
    `latencyLimitMs=${processingStart.latencyLimitMs}`,
    `approvedVoiceRecognizedAtMs=${processingStart.approvedVoiceRecognizedAtMs}`,
    `processingStartedAtMs=${processingStart.processingStartedAtMs}`,
  ].join("; ");
}

export function resolveApprovedVoiceSpeechProcessingAudioSource(
  approvedSpeechAudioSegment?: ApprovedSpeechRollingBufferAudioSegment | null,
): ApprovedVoiceSpeechProcessingAudioSource {
  return approvedSpeechAudioSegment?.byteLength
    ? APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE
    : APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE;
}

export function createApprovedVoiceRecognitionTimingEvent(
  approvedVoiceEvent:
    | ApprovedVoiceRecognitionEvent
    | ApprovedVoiceEventForSpeechProcessing,
  occurredAtMs = approvedVoiceEvent.recognizedAtMs,
): ApprovedVoiceRecognitionTimingEvent {
  assertApprovedVoiceEventForSpeechProcessing(approvedVoiceEvent);
  const downstreamAuthorization = approvedVoiceEvent.downstreamAuthorization;
  const matchedVoiceProfile =
    createMatchedApprovedVoiceProfileTimingMetadata(approvedVoiceEvent);

  return Object.freeze({
    eventType: APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE,
    occurredAtMs,
    matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
    ...matchedVoiceProfile,
    recognizedAtMs: approvedVoiceEvent.recognizedAtMs,
    recognitionLatencyMs: normalizeOptionalFiniteNumber(
      approvedVoiceEvent.latencyMs,
    ),
    evaluatedFrameCount: normalizeOptionalFiniteInteger(
      approvedVoiceEvent.evaluatedFrameCount,
    ),
    confidence:
      normalizeOptionalFiniteNumber(approvedVoiceEvent.confidence, 0) ?? 0,
    decisionRule:
      typeof downstreamAuthorization.decisionRule === "string"
        ? downstreamAuthorization.decisionRule
        : "approved_voice_match",
    downstreamAuthorized: true,
  });
}

export function createApprovedVoiceProcessingStartTimingEvent({
  approvedVoiceEvent,
  processingStart,
  audioSource,
  triggered = processingStart.withinLimit,
  reason = triggered ? "started" : "latency_limit_exceeded",
}: {
  approvedVoiceEvent:
    | ApprovedVoiceRecognitionEvent
    | ApprovedVoiceEventForSpeechProcessing;
  processingStart: ApprovedVoiceProcessingStart;
  audioSource: ApprovedVoiceSpeechProcessingAudioSource;
  triggered?: boolean;
  reason?: "started" | "latency_limit_exceeded";
}): ApprovedVoiceProcessingStartTimingEvent {
  assertApprovedVoiceEventForSpeechProcessing(approvedVoiceEvent);
  const matchedVoiceProfile =
    createMatchedApprovedVoiceProfileTimingMetadata(approvedVoiceEvent);

  return Object.freeze({
    eventType: APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE,
    occurredAtMs: processingStart.processingStartedAtMs,
    matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
    ...matchedVoiceProfile,
    approvedVoiceRecognizedAtMs: processingStart.approvedVoiceRecognizedAtMs,
    processingStartedAtMs: processingStart.processingStartedAtMs,
    latencyMs: processingStart.latencyMs,
    latencyLimitMs: processingStart.latencyLimitMs,
    withinLimit: processingStart.withinLimit,
    audioSource,
    triggered,
    reason,
    failureMessage: triggered
      ? null
      : formatApprovedVoiceProcessingStartLatencyFailure(processingStart),
  });
}

export function triggerSpeechProcessingPipelineFromApprovedVoiceEvent<
  TApprovedVoiceEvent extends ApprovedVoiceEventForSpeechProcessing,
  TProcessingResult = void,
>({
  approvedVoiceEvent,
  startSpeechProcessing,
  onTimingEvent,
  processingStartedAtMs = Date.now(),
  latencyLimitMs = APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
}: {
  approvedVoiceEvent: TApprovedVoiceEvent;
  startSpeechProcessing: (
    approvedVoiceEvent: TApprovedVoiceEvent,
    approvedSpeechAudioSegment: ApprovedSpeechRollingBufferAudioSegment | null,
    audioSource: ApprovedVoiceSpeechProcessingAudioSource,
  ) => TProcessingResult;
  onTimingEvent?: ApprovedVoicePipelineTimingEventListener;
  processingStartedAtMs?: number;
  latencyLimitMs?: number;
}): ApprovedVoiceSpeechProcessingPipelineTrigger<TProcessingResult> {
  assertApprovedVoiceEventForSpeechProcessing(approvedVoiceEvent);
  emitApprovedVoicePipelineTimingEvent(
    onTimingEvent,
    createApprovedVoiceRecognitionTimingEvent(approvedVoiceEvent),
  );
  const approvedSpeechAudioSegment =
    approvedVoiceEvent.approvedSpeechAudioSegment?.byteLength
      ? approvedVoiceEvent.approvedSpeechAudioSegment
      : null;
  const audioSource = resolveApprovedVoiceSpeechProcessingAudioSource(
    approvedSpeechAudioSegment,
  );

  const processingStart = createApprovedVoiceProcessingStart({
    approvedVoiceRecognizedAtMs: approvedVoiceEvent.recognizedAtMs,
    processingStartedAtMs,
    latencyLimitMs,
  });
  const triggerReason = processingStart.withinLimit
    ? "started"
    : "latency_limit_exceeded";
  emitApprovedVoicePipelineTimingEvent(
    onTimingEvent,
    createApprovedVoiceProcessingStartTimingEvent({
      approvedVoiceEvent,
      processingStart,
      audioSource,
      triggered: processingStart.withinLimit,
      reason: triggerReason,
    }),
  );

  if (!processingStart.withinLimit) {
    return {
      triggered: false,
      reason: "latency_limit_exceeded",
      audioSource,
      processingStart,
      processingResult: null,
      failureMessage:
        formatApprovedVoiceProcessingStartLatencyFailure(processingStart),
    };
  }

  return {
    triggered: true,
    reason: "started",
    audioSource,
    processingStart,
    processingResult: startSpeechProcessing(
      approvedVoiceEvent,
      approvedSpeechAudioSegment,
      audioSource,
    ),
    failureMessage: null,
  };
}

function createMatchedApprovedVoiceProfileTimingMetadata(
  approvedVoiceEvent:
    | ApprovedVoiceRecognitionEvent
    | ApprovedVoiceEventForSpeechProcessing,
): {
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata | null;
} {
  const matchedApprovedVoiceProfileMetadata =
    approvedVoiceEvent.matchedApprovedVoiceProfileMetadata || null;
  const matchedApprovedVoiceProfileId =
    normalizeOptionalString(approvedVoiceEvent.matchedApprovedVoiceProfileId) ??
    normalizeOptionalString(matchedApprovedVoiceProfileMetadata?.profileId) ??
    approvedVoiceEvent.matchedVoiceId;
  const matchedApprovedVoiceLabel =
    normalizeOptionalString(approvedVoiceEvent.matchedApprovedVoiceLabel) ??
    normalizeOptionalString(matchedApprovedVoiceProfileMetadata?.label) ??
    matchedApprovedVoiceProfileId;

  return {
    matchedApprovedVoiceProfileId,
    matchedApprovedVoiceLabel,
    matchedApprovedVoiceProfileMetadata,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeOptionalFiniteNumber(
  value: unknown,
  fallback: number | null = null,
): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeOptionalFiniteInteger(
  value: unknown,
  fallback = 0,
): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? Math.max(0, Math.trunc(numberValue))
    : fallback;
}

function emitApprovedVoicePipelineTimingEvent(
  onTimingEvent: ApprovedVoicePipelineTimingEventListener | undefined,
  event: ApprovedVoicePipelineTimingEvent,
): void {
  if (!onTimingEvent) return;

  try {
    onTimingEvent(event);
  } catch {
    // Timing instrumentation must not block approved speech processing.
  }
}

function assertApprovedVoiceEventForSpeechProcessing(
  event: ApprovedVoiceEventForSpeechProcessing,
): void {
  const downstreamAuthorization = event?.downstreamAuthorization;
  if (
    !event ||
    event.accepted !== true ||
    typeof event.matchedVoiceId !== "string" ||
    event.matchedVoiceId.trim().length === 0 ||
    !Number.isFinite(Number(event.recognizedAtMs)) ||
    !downstreamAuthorization ||
    downstreamAuthorization.authorized !== true ||
    typeof downstreamAuthorization.matchedVoiceId !== "string" ||
    downstreamAuthorization.matchedVoiceId.trim() !==
      event.matchedVoiceId.trim() ||
    !Number.isFinite(Number(downstreamAuthorization.score)) ||
    !Number.isFinite(Number(downstreamAuthorization.threshold)) ||
    Number(downstreamAuthorization.score) <
      Number(downstreamAuthorization.threshold)
  ) {
    throw new Error(
      "speech processing requires an approved voice recognition event",
    );
  }
}
