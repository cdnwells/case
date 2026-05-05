import {
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
  APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE,
  APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE,
  APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE,
  createApprovedVoiceProcessingStart,
  createApprovedVoiceProcessingStartTimingEvent,
  createApprovedVoiceRecognitionTimingEvent,
  formatApprovedVoiceProcessingStartLatencyFailure,
  isApprovedVoiceProcessingStartWithinLimit,
  measureApprovedVoiceProcessingStartLatency,
  resolveApprovedVoiceSpeechProcessingAudioSource,
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent,
} from "./approvedVoiceProcessingLatency.ts";
import {
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
  APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  createOnDeviceCircularAudioBuffer,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
} from "../../constants/audioBuffer.ts";
import { createApprovedVoiceGate } from "./voiceGate.js";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectLessThan(actual, expected, message) {
  if (!(actual < expected)) {
    throw new Error(
      `${message}: expected ${actual} to be less than ${expected}`,
    );
  }
}

function createThresholdAuthorization(overrides = {}) {
  return {
    authorized: true,
    matchedVoiceId: "case-owner",
    score: 0.96,
    threshold: 0.95,
    decisionRule: "high_confidence_match",
    ...overrides,
  };
}

expectEqual(
  APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
  1000,
  "approved voice processing start latency limit is pinned to one second",
);

expectEqual(
  measureApprovedVoiceProcessingStartLatency({
    approvedVoiceRecognizedAtMs: 10_000,
    processingStartedAtMs: 10_120,
  }),
  120,
  "handoff latency is measured from approved recognition to processing start",
);

const lowLatencyStart = createApprovedVoiceProcessingStart({
  approvedVoiceRecognizedAtMs: 10_000,
  processingStartedAtMs: 10_999,
});

expectEqual(
  lowLatencyStart.withinLimit,
  true,
  "processing can start less than one second after approved recognition",
);
expectEqual(
  lowLatencyStart.latencyMs,
  999,
  "low-latency handoff reports the measured delay",
);

expectEqual(
  isApprovedVoiceProcessingStartWithinLimit(1000),
  false,
  "processing at one second is rejected because the requirement is under one second",
);
expectEqual(
  resolveApprovedVoiceSpeechProcessingAudioSource(null),
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  "missing rolling-buffer audio resolves to the live audio stream fallback",
);

const staleStart = createApprovedVoiceProcessingStart({
  approvedVoiceRecognizedAtMs: 10_000,
  processingStartedAtMs: 11_001,
});

expectEqual(
  staleStart.withinLimit,
  false,
  "stale approved voice handoffs are not eligible for processing",
);
expectEqual(
  formatApprovedVoiceProcessingStartLatencyFailure(staleStart),
  "Approved voice processing did not start within the recognition-to-processing latency limit; measuredLatencyMs=1001; latencyLimitMs=1000; approvedVoiceRecognizedAtMs=10000; processingStartedAtMs=11001",
  "latency failure output reports the measured recognition-to-processing latency",
);

const pipelineStartOrder = [];
const pipelineBuffer = createOnDeviceCircularAudioBuffer(
  {
    sampleRateHz: 4,
    channelCount: 1,
    bytesPerSample: 1,
  },
  {
    rollingBufferActiveDurationSeconds: 1,
  },
);
pipelineBuffer.append(Uint8Array.from([10, 11, 12, 13]), {
  timestampMs: 20_000,
});
const pipelineApprovedSpeechAudioSegment =
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
    rollingAudioBuffer: pipelineBuffer,
    recognitionResult: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 20_000,
      latencyMs: 500,
      downstreamAuthorization: createThresholdAuthorization(),
    },
    selectedAtMs: 20_000,
  });
const pipelineTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 20_000,
      downstreamAuthorization: createThresholdAuthorization(),
      approvedSpeechAudioSegment: pipelineApprovedSpeechAudioSegment,
    },
    processingStartedAtMs: 20_001,
    startSpeechProcessing: (approvedVoiceEvent, approvedSpeechAudioSegment) => {
      pipelineStartOrder.push(
        `pipeline-started:${approvedVoiceEvent.matchedVoiceId}`,
      );
      return {
        result: "speech-pipeline-started",
        audioBytes: Array.from(approvedSpeechAudioSegment.audioBytes),
      };
    },
  });

expectEqual(
  pipelineTrigger.triggered,
  true,
  "approved voice event immediately triggers the speech processing pipeline",
);
expectEqual(
  pipelineTrigger.audioSource,
  APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE,
  "pipeline trigger uses the eligible rolling-buffer audio source when available",
);
expectEqual(
  pipelineTrigger.processingResult.result,
  "speech-pipeline-started",
  "pipeline trigger returns the synchronous processing start result",
);
expectEqual(
  pipelineTrigger.processingResult.audioBytes.join(","),
  "10,11,12,13",
  "pipeline trigger passes the eligible rolling-buffer segment to downstream speech processing",
);
expectEqual(
  pipelineStartOrder.join(","),
  "pipeline-started:case-owner",
  "speech processing starts synchronously before the trigger returns",
);
expectEqual(
  pipelineTrigger.processingStart.latencyMs,
  1,
  "approved event handoff records near-immediate processing start latency",
);

let liveFallbackStarted = false;
const liveFallbackTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 25_000,
      downstreamAuthorization: createThresholdAuthorization(),
      approvedSpeechAudioSegment: null,
    },
    processingStartedAtMs: 25_100,
    startSpeechProcessing: (
      approvedVoiceEvent,
      approvedSpeechAudioSegment,
      audioSource,
    ) => {
      liveFallbackStarted = true;
      return {
        matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
        approvedSpeechAudioSegment,
        audioSource,
      };
    },
  });

expectEqual(
  liveFallbackTrigger.triggered,
  true,
  "approved voice event still starts speech processing without eligible rolling-buffer audio",
);
expectEqual(
  liveFallbackStarted,
  true,
  "live audio fallback starts downstream speech processing",
);
expectEqual(
  liveFallbackTrigger.audioSource,
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  "pipeline trigger falls back to the live audio stream when no rolling-buffer segment is eligible",
);
expectEqual(
  liveFallbackTrigger.processingResult.approvedSpeechAudioSegment,
  null,
  "live audio fallback does not synthesize or retain buffered audio",
);
expectEqual(
  liveFallbackTrigger.processingResult.audioSource,
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  "downstream speech processing receives the live audio fallback source",
);

let zeroByteSegmentStarted = false;
const zeroByteSegmentTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 26_000,
      downstreamAuthorization: createThresholdAuthorization(),
      approvedSpeechAudioSegment: {
        kind: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_KIND,
        source: APPROVED_SPEECH_ROLLING_BUFFER_AUDIO_SEGMENT_SOURCE,
        matchedVoiceId: "case-owner",
        recognizedAtMs: 26_000,
        selectedAtMs: 26_001,
        startedAtMs: 26_000,
        endedAtMs: 26_000,
        byteLength: 0,
        chunkCount: 0,
        audioBytes: Uint8Array.from([]),
        bufferLocation: BUFFER_LOCATION_ON_DEVICE,
        audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
      },
    },
    processingStartedAtMs: 26_050,
    startSpeechProcessing: (
      approvedVoiceEvent,
      approvedSpeechAudioSegment,
      audioSource,
    ) => {
      zeroByteSegmentStarted = true;
      return {
        matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
        approvedSpeechAudioSegment,
        audioSource,
      };
    },
  });

expectEqual(
  zeroByteSegmentTrigger.triggered,
  true,
  "approved voice event starts processing when only live audio is eligible",
);
expectEqual(
  zeroByteSegmentStarted,
  true,
  "zero-byte rolling-buffer metadata does not block live audio fallback",
);
expectEqual(
  zeroByteSegmentTrigger.audioSource,
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  "zero-byte rolling-buffer metadata resolves to the live audio stream fallback",
);
expectEqual(
  zeroByteSegmentTrigger.processingResult.approvedSpeechAudioSegment,
  null,
  "zero-byte rolling-buffer metadata is not passed as retained buffered audio",
);

const approvedRecognitionEvents = [];
const approvedGate = createApprovedVoiceGate({
  approvedVoices: [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
  ],
  nowMs: () => 50_000,
  onApprovedVoiceRecognized: (event) => {
    approvedRecognitionEvents.push(event);
  },
});

const approvedRecognition = approvedGate.observeFrame({
  utteranceId: "approved-processing-start-validation",
  timestampMs: 0,
  embedding: [1, 0, 0],
});

expectEqual(
  approvedRecognition.accepted,
  true,
  "approved voice recognition succeeds before processing starts",
);
expectEqual(
  approvedRecognitionEvents.length,
  1,
  "approved voice gate emits one recognition event for processing validation",
);

const approvedRecognitionTimingEvent =
  createApprovedVoiceRecognitionTimingEvent(approvedRecognitionEvents[0]);

expectEqual(
  approvedRecognitionTimingEvent.eventType,
  APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE,
  "approved voice recognition timing uses a stable event type",
);
expectEqual(
  approvedRecognitionTimingEvent.recognizedAtMs,
  50_000,
  "approved voice recognition timing records the approved recognition timestamp",
);
expectEqual(
  approvedRecognitionTimingEvent.matchedVoiceId,
  "case-owner",
  "approved voice recognition timing records the matched approved voice id",
);
expectEqual(
  approvedRecognitionTimingEvent.matchedApprovedVoiceProfileId,
  "case-owner",
  "approved voice recognition timing records the matched voice profile id",
);
expectEqual(
  approvedRecognitionTimingEvent.matchedApprovedVoiceLabel,
  "case-owner",
  "approved voice recognition timing records the matched voice profile label",
);
expectEqual(
  approvedRecognitionTimingEvent.matchedApprovedVoiceProfileMetadata.profileId,
  "case-owner",
  "approved voice recognition timing surfaces matched voice profile metadata",
);
expectEqual(
  approvedRecognitionTimingEvent.decisionRule,
  "high_confidence_match",
  "approved voice recognition timing records the authorization decision rule",
);
expectEqual(
  "approvedSpeechAudioSegment" in approvedRecognitionTimingEvent,
  false,
  "approved voice recognition timing does not include captured audio metadata",
);
expectEqual(
  "audioBytes" in approvedRecognitionTimingEvent,
  false,
  "approved voice recognition timing does not include raw audio bytes",
);

const expectedProcessingStartTimingEvent =
  createApprovedVoiceProcessingStartTimingEvent({
    approvedVoiceEvent: approvedRecognitionEvents[0],
    processingStart: createApprovedVoiceProcessingStart({
      approvedVoiceRecognizedAtMs: 50_000,
      processingStartedAtMs: 50_750,
    }),
    audioSource: APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  });

expectEqual(
  expectedProcessingStartTimingEvent.eventType,
  APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE,
  "approved voice processing-start timing uses a stable event type",
);
expectEqual(
  expectedProcessingStartTimingEvent.latencyMs,
  750,
  "approved voice processing-start timing records the handoff latency",
);
expectEqual(
  expectedProcessingStartTimingEvent.triggered,
  true,
  "approved voice processing-start timing marks eligible handoffs as triggered",
);
expectEqual(
  expectedProcessingStartTimingEvent.matchedApprovedVoiceProfileId,
  "case-owner",
  "approved voice processing-start timing records the matched voice profile id",
);

const approvedPipelineTimingEvents = [];
let simulatedProcessingStartedAtMs = null;
const approvedProcessingStartValidation =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: approvedRecognitionEvents[0],
    onTimingEvent: (event) => {
      approvedPipelineTimingEvents.push(event);
    },
    processingStartedAtMs: 50_750,
    startSpeechProcessing: (approvedVoiceEvent) => {
      simulatedProcessingStartedAtMs = 50_750;
      return {
        matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
        processingStarted: true,
        processingStartedAtMs: simulatedProcessingStartedAtMs,
      };
    },
  });

expectEqual(
  approvedProcessingStartValidation.triggered,
  true,
  "approved recognition event starts speech processing within the latency limit",
);
expectLessThan(
  approvedProcessingStartValidation.processingStart.latencyMs,
  APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
  "processing starts within one second of approved voice recognition",
);
expectEqual(
  simulatedProcessingStartedAtMs,
  50_750,
  "simulated approved voice recognition starts downstream speech processing",
);
expectLessThan(
  simulatedProcessingStartedAtMs - approvedRecognitionEvents[0].recognizedAtMs,
  APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
  "simulated approved voice processing callback starts within one second",
);
expectEqual(
  approvedProcessingStartValidation.processingStart.withinLimit,
  true,
  "processing-start validation passes the one-second handoff limit",
);
expectEqual(
  approvedProcessingStartValidation.processingResult.matchedVoiceId,
  "case-owner",
  "processing receives the matched approved voice identity",
);
expectEqual(
  approvedPipelineTimingEvents.length,
  2,
  "approved voice pipeline emits recognition and processing-start timing events",
);
expectEqual(
  approvedPipelineTimingEvents[0].eventType,
  APPROVED_VOICE_RECOGNITION_TIMING_EVENT_TYPE,
  "approved voice pipeline emits recognition timing before processing-start timing",
);
expectEqual(
  approvedPipelineTimingEvents[1].eventType,
  APPROVED_VOICE_PROCESSING_START_TIMING_EVENT_TYPE,
  "approved voice pipeline emits processing-start timing after recognition timing",
);
expectEqual(
  approvedPipelineTimingEvents[1].latencyMs,
  750,
  "approved voice pipeline timing records the measured processing-start latency",
);
expectEqual(
  approvedPipelineTimingEvents[1].withinLimit,
  true,
  "approved voice pipeline timing records that processing started within the limit",
);
expectEqual(
  "audioBytes" in approvedPipelineTimingEvents[1],
  false,
  "approved voice processing-start timing omits captured audio bytes",
);

let stalePipelineStarted = false;
const stalePipelineTimingEvents = [];
const stalePipelineTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 30_000,
      downstreamAuthorization: createThresholdAuthorization(),
    },
    onTimingEvent: (event) => {
      stalePipelineTimingEvents.push(event);
    },
    processingStartedAtMs: 31_000,
    startSpeechProcessing: () => {
      stalePipelineStarted = true;
    },
  });

expectEqual(
  stalePipelineTrigger.triggered,
  false,
  "stale approved voice events do not trigger speech processing",
);
expectEqual(
  stalePipelineStarted,
  false,
  "speech processing is not started once the approved-event handoff is stale",
);
expectEqual(
  stalePipelineTimingEvents.length,
  2,
  "stale approved voice handoffs still emit timing diagnostics",
);
expectEqual(
  stalePipelineTimingEvents[1].triggered,
  false,
  "stale approved voice timing marks processing as not triggered",
);
expectEqual(
  stalePipelineTimingEvents[1].reason,
  "latency_limit_exceeded",
  "stale approved voice timing records the latency-limit reason",
);
expectEqual(
  stalePipelineTimingEvents[1].failureMessage,
  "Approved voice processing did not start within the recognition-to-processing latency limit; measuredLatencyMs=1000; latencyLimitMs=1000; approvedVoiceRecognizedAtMs=30000; processingStartedAtMs=31000",
  "stale approved voice timing failure output reports the measured recognition-to-processing latency",
);
expectEqual(
  stalePipelineTrigger.failureMessage,
  stalePipelineTimingEvents[1].failureMessage,
  "failed processing trigger exposes the same measured latency as instrumentation output",
);

let instrumentationFailurePipelineStarted = false;
const instrumentationFailureTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 34_000,
      downstreamAuthorization: createThresholdAuthorization(),
    },
    onTimingEvent: () => {
      throw new Error("timing sink unavailable");
    },
    processingStartedAtMs: 34_100,
    startSpeechProcessing: () => {
      instrumentationFailurePipelineStarted = true;
      return "started";
    },
  });

expectEqual(
  instrumentationFailureTrigger.triggered,
  true,
  "timing instrumentation failures do not block approved speech processing",
);
expectEqual(
  instrumentationFailurePipelineStarted,
  true,
  "approved speech processing still starts when timing instrumentation fails",
);

let staleBufferedPipelineStarted = false;
const staleBufferedPipelineTrigger =
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 32_000,
      downstreamAuthorization: createThresholdAuthorization(),
      approvedSpeechAudioSegment: pipelineApprovedSpeechAudioSegment,
    },
    processingStartedAtMs: 33_000,
    startSpeechProcessing: () => {
      staleBufferedPipelineStarted = true;
    },
  });

expectEqual(
  staleBufferedPipelineTrigger.triggered,
  false,
  "buffered approved speech does not override the under-one-second trigger timing requirement",
);
expectEqual(
  staleBufferedPipelineTrigger.audioSource,
  APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE,
  "stale buffered approved speech still reports the selected buffer source for diagnostics",
);
expectEqual(
  staleBufferedPipelineStarted,
  false,
  "speech processing is not started at the one-second boundary even when buffered audio is available",
);

try {
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: false,
      matchedVoiceId: null,
      recognizedAtMs: 40_000,
      downstreamAuthorization: null,
    },
    processingStartedAtMs: 40_001,
    startSpeechProcessing: () => {
      throw new Error("non-approved speech must not reach processing");
    },
  });
  throw new Error("non-approved speech unexpectedly reached processing");
} catch (error) {
  expectEqual(
    error.message,
    "speech processing requires an approved voice recognition event",
    "speech processing rejects events that are not approved voice recognitions",
  );
}

try {
  triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
    approvedVoiceEvent: {
      accepted: true,
      matchedVoiceId: "case-owner",
      recognizedAtMs: 45_000,
      downstreamAuthorization: {
        authorized: true,
        matchedVoiceId: "case-owner",
        score: 0.94,
        threshold: 0.95,
      },
    },
    processingStartedAtMs: 45_001,
    startSpeechProcessing: () => {
      throw new Error("below-threshold speech must not reach processing");
    },
  });
  throw new Error("below-threshold approved speech unexpectedly reached processing");
} catch (error) {
  expectEqual(
    error.message,
    "speech processing requires an approved voice recognition event",
    "speech processing requires an approved voice match at or above the configured threshold",
  );
}
