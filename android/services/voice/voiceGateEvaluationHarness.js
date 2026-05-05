"use strict";

const {
  createApprovedVoiceGate,
} = require("./voiceGate");
const {
  QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT,
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  loadNonApprovedVoiceEvaluationFixture,
} = require("./nonApprovedVoiceEvaluationFixture");

const VOICE_GATE_EVALUATION_HARNESS_ID =
  "voice-gate-fixture-evaluation-harness-v1";
const VOICE_GATE_EVALUATION_DECISION_PATH = "voice_gate_only";
const DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID =
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID;
const DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT =
  QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT;
const VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES = Object.freeze([
  "transcription",
  "nlu",
  "storage",
  "rollingBufferRetention",
]);
const VOICE_GATE_PRE_DECISION_DOWNSTREAM_GUARD_ERROR =
  "downstream speech processing or retention invoked before voice-gate decision";

function loadVoiceGateEvaluationFixture(
  fixtureId = DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID,
) {
  return loadNonApprovedVoiceEvaluationFixture(fixtureId);
}

function runVoiceGateEvaluationHarness(options = {}) {
  const evaluationFixture = resolveVoiceGateEvaluationFixture(options);
  const utterances = normalizeEvaluationFixtureUtterances(evaluationFixture);
  const expectedUtteranceCount =
    options.expectedUtteranceCount ??
    getDefaultExpectedUtteranceCount(evaluationFixture);

  if (
    expectedUtteranceCount !== null &&
    utterances.length !== expectedUtteranceCount
  ) {
    throw new Error(
      `voice gate evaluation fixture must contain ${expectedUtteranceCount} utterances; received ${utterances.length}`,
    );
  }

  const approvedVoices = resolveApprovedVoices(evaluationFixture, options);
  const createGate = normalizeVoiceGateFactory(options.createGate);
  const approvedRecognitionEvents = [];
  const utteranceEvaluations = [];
  const falseAcceptances = [];
  const downstreamGuard = createVoiceGateEvaluationDownstreamGuard();
  let observedFrameCount = 0;

  for (let utteranceIndex = 0; utteranceIndex < utterances.length; utteranceIndex += 1) {
    const utterance = utterances[utteranceIndex];
    const frames = getEvaluationUtteranceFrames(utterance);
    const utteranceId = getEvaluationUtteranceId(
      utterance,
      frames,
      utteranceIndex,
    );
    const expectedApprovedVoiceLabels =
      getEvaluationUtteranceExpectedApprovedVoiceLabels(utterance);
    const utteranceRecognitionEvents = [];
    const downstreamInvocationGuard =
      downstreamGuard.startEvaluatedUtterance({
        utteranceIndex,
        utteranceId,
      });
    const gate = createGate({
      approvedVoices,
      config: options.config,
      nowMs: options.nowMs,
      downstreamInvocationGuard,
      onApprovedVoiceRecognized: (event) => {
        downstreamInvocationGuard.markVoiceGateDecision(event, {
          source: "approvedVoiceRecognized",
        });
        utteranceRecognitionEvents.push(event);
        approvedRecognitionEvents.push(event);
      },
    });

    assertVoiceGateInstance(gate);

    let latestResult = null;
    let acceptedResult = null;
    let firstAcceptedFrameIndex = null;

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
      latestResult = gate.observeFrame(frames[frameIndex]);
      observedFrameCount += 1;

      if (latestResult.accepted === true && acceptedResult === null) {
        acceptedResult = latestResult;
        firstAcceptedFrameIndex = frameIndex;
        downstreamInvocationGuard.markVoiceGateDecision(latestResult, {
          source: "acceptedRecognitionResult",
          frameIndex,
        });
      }
    }

    const result = acceptedResult || latestResult || createNoFramesResult();
    downstreamInvocationGuard.markVoiceGateDecision(result, {
      source: "utteranceEvaluationResult",
      frameIndex: firstAcceptedFrameIndex ?? Math.max(0, frames.length - 1),
    });
    const matchedApprovedVoiceProfile =
      createMatchedApprovedVoiceProfileResultFields(result);
    const matchedExpectedApprovedVoiceLabel =
      result.accepted === true &&
      acceptedRecognitionMatchesExpectedApprovedVoiceLabels(
        result,
        expectedApprovedVoiceLabels,
      );
    const falseAccepted =
      result.accepted === true && !matchedExpectedApprovedVoiceLabel;
    const utteranceEvaluation = Object.freeze({
      utteranceIndex,
      utteranceId,
      speakerId: getEvaluationUtteranceSpeakerId(utterance),
      approved: getEvaluationUtteranceApproval(utterance),
      expectedApprovedVoiceLabels,
      expectedVoiceGateDecision:
        getEvaluationUtteranceExpectedDecision(utterance),
      decisionPath: VOICE_GATE_EVALUATION_DECISION_PATH,
      frameCount: frames.length,
      observedFrameCount: frames.length,
      firstAcceptedFrameIndex,
      accepted: result.accepted,
      matchedExpectedApprovedVoiceLabel,
      falseAccepted,
      matchedVoiceId: result.matchedVoiceId,
      ...matchedApprovedVoiceProfile,
      rejectedVoiceId: result.rejectedVoiceId,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
      reason: result.reason,
      evaluatedFrameCount: result.evaluatedFrameCount,
      downstreamAuthorization: result.downstreamAuthorization,
      recognitionEventCount: utteranceRecognitionEvents.length,
      downstreamInvocationCounts:
        downstreamInvocationGuard.getDownstreamInvocationCounts(),
    });

    utteranceEvaluations.push(utteranceEvaluation);
    downstreamInvocationGuard.completeUtterance();

    if (falseAccepted) {
      falseAcceptances.push(
        Object.freeze({
          utteranceIndex: utteranceEvaluation.utteranceIndex,
          utteranceId: utteranceEvaluation.utteranceId,
          speakerId: utteranceEvaluation.speakerId,
          expectedApprovedVoiceLabels,
          matchedVoiceId: result.matchedVoiceId,
          ...matchedApprovedVoiceProfile,
          confidence: result.confidence,
          latencyMs: result.latencyMs,
          reason: result.reason,
          evaluatedFrameCount: result.evaluatedFrameCount,
        }),
      );
    }
  }

  const downstreamInvocationCounts =
    downstreamGuard.getDownstreamInvocationCounts();
  const falseAcceptCount = falseAcceptances.length;

  return Object.freeze({
    harnessId: VOICE_GATE_EVALUATION_HARNESS_ID,
    fixtureId: getEvaluationFixtureId(evaluationFixture, options),
    testEnvironment: copyRecord(evaluationFixture.testEnvironment),
    decisionPath: VOICE_GATE_EVALUATION_DECISION_PATH,
    approvedVoiceCount: Array.isArray(approvedVoices) ? approvedVoices.length : 0,
    utteranceTotal: utterances.length,
    evaluatedUtteranceCount: utteranceEvaluations.length,
    observedFrameCount,
    skippedDownstreamStages:
      getSkippedDownstreamStages(downstreamInvocationCounts),
    downstreamInvocationCounts,
    downstreamInvoked: Object.values(downstreamInvocationCounts).some(
      (count) => count > 0,
    ),
    downstreamInvocationEvents:
      downstreamGuard.getDownstreamInvocationEvents(),
    approvedRecognitionEventCount: approvedRecognitionEvents.length,
    falseAcceptCount,
    falseAccepted: falseAcceptCount,
    falseAcceptanceCount: falseAcceptCount,
    falseAcceptances: Object.freeze(falseAcceptances),
    utteranceEvaluations: Object.freeze(utteranceEvaluations),
  });
}

function resolveVoiceGateEvaluationFixture(options) {
  if (options.fixture) return options.fixture;

  return loadVoiceGateEvaluationFixture(
    options.fixtureId || DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID,
  );
}

function normalizeEvaluationFixtureUtterances(evaluationFixture) {
  if (!evaluationFixture || !Array.isArray(evaluationFixture.utterances)) {
    throw new Error("voice gate evaluation fixture must include utterances");
  }

  return evaluationFixture.utterances;
}

function getDefaultExpectedUtteranceCount(evaluationFixture) {
  return evaluationFixture &&
    evaluationFixture.id === DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID
    ? DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT
    : null;
}

function resolveApprovedVoices(evaluationFixture, options) {
  if (options.approvedVoices) return options.approvedVoices;
  if (options.approvedReferenceVoices) return options.approvedReferenceVoices;
  if (evaluationFixture.approvedReferenceVoices) {
    return evaluationFixture.approvedReferenceVoices;
  }
  if (evaluationFixture.approvedVoices) return evaluationFixture.approvedVoices;
  return [];
}

function normalizeVoiceGateFactory(createGate) {
  if (createGate === undefined || createGate === null) {
    return createApprovedVoiceGate;
  }
  if (typeof createGate !== "function") {
    throw new Error("voice gate evaluation createGate option must be a function");
  }
  return createGate;
}

function assertVoiceGateInstance(gate) {
  if (!gate || typeof gate.observeFrame !== "function") {
    throw new Error("voice gate evaluation createGate must return a voice gate");
  }
}

function getEvaluationUtteranceFrames(utterance) {
  if (Array.isArray(utterance)) return utterance;
  return Array.isArray(utterance && utterance.frames) ? utterance.frames : [];
}

function getEvaluationUtteranceId(utterance, frames, utteranceIndex) {
  if (isRecord(utterance) && utterance.utteranceId) {
    return String(utterance.utteranceId);
  }

  const firstFrame = frames[0];
  if (isRecord(firstFrame) && firstFrame.utteranceId) {
    return String(firstFrame.utteranceId);
  }

  return `evaluation-utterance-${utteranceIndex}`;
}

function getEvaluationUtteranceSpeakerId(utterance) {
  return isRecord(utterance) && utterance.speakerId
    ? String(utterance.speakerId)
    : null;
}

function getEvaluationUtteranceApproval(utterance) {
  return isRecord(utterance) && typeof utterance.approved === "boolean"
    ? utterance.approved
    : null;
}

function getEvaluationUtteranceExpectedApprovedVoiceLabels(utterance) {
  if (!isRecord(utterance)) return Object.freeze([]);

  const explicitLabels = normalizeExpectedApprovedVoiceLabels(
    utterance.expectedApprovedVoiceLabels ||
      utterance.expectedApprovedVoiceIds ||
      utterance.expectedApprovedVoices,
  );
  if (explicitLabels.length > 0) return Object.freeze(explicitLabels);

  const explicitLabel = normalizeExpectedApprovedVoiceLabel(
    utterance.expectedApprovedVoiceLabel ||
      utterance.expectedApprovedVoiceId ||
      utterance.expectedVoiceId,
  );
  if (explicitLabel) return Object.freeze([explicitLabel]);

  if (
    utterance.approved === true ||
    utterance.expectedVoiceGateDecision === "accept"
  ) {
    const speakerId = getEvaluationUtteranceSpeakerId(utterance);
    return Object.freeze(speakerId ? [speakerId] : []);
  }

  return Object.freeze([]);
}

function normalizeExpectedApprovedVoiceLabels(value) {
  if (!Array.isArray(value)) return [];

  const labels = [];
  const seen = new Set();

  for (const item of value) {
    const label = normalizeExpectedApprovedVoiceLabel(item);
    if (!label || seen.has(label)) continue;

    labels.push(label);
    seen.add(label);
  }

  return labels;
}

function normalizeExpectedApprovedVoiceLabel(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const label = String(value).trim();
  return label.length > 0 ? label : null;
}

function getEvaluationUtteranceExpectedDecision(utterance) {
  return isRecord(utterance) &&
    (utterance.expectedVoiceGateDecision === "accept" ||
      utterance.expectedVoiceGateDecision === "reject")
    ? utterance.expectedVoiceGateDecision
    : null;
}

function createNoFramesResult() {
  return {
    accepted: false,
    matchedVoiceId: null,
    matchedApprovedVoiceProfileId: null,
    matchedApprovedVoiceLabel: null,
    matchedApprovedVoiceProfileMetadata: null,
    rejectedVoiceId: null,
    recognizedAtMs: null,
    confidence: 0,
    latencyMs: null,
    evaluatedFrameCount: 0,
    reason: "no_frames",
    candidateScores: [],
    bestCandidateScore: null,
    bestApprovedVoiceId: null,
    bestApprovedVoiceScore: null,
    downstreamAuthorization: null,
  };
}

function createMatchedApprovedVoiceProfileResultFields(recognitionResult) {
  const matchedApprovedVoiceProfileMetadata =
    isRecord(recognitionResult.matchedApprovedVoiceProfileMetadata)
      ? copyRecord(recognitionResult.matchedApprovedVoiceProfileMetadata)
      : null;

  return {
    matchedApprovedVoiceProfileId:
      typeof recognitionResult.matchedApprovedVoiceProfileId === "string"
        ? recognitionResult.matchedApprovedVoiceProfileId
        : null,
    matchedApprovedVoiceLabel:
      typeof recognitionResult.matchedApprovedVoiceLabel === "string"
        ? recognitionResult.matchedApprovedVoiceLabel
        : null,
    matchedApprovedVoiceProfileMetadata,
  };
}

function acceptedRecognitionMatchesExpectedApprovedVoiceLabels(
  recognitionResult,
  expectedApprovedVoiceLabels,
) {
  const acceptedProfileLabels =
    getAcceptedRecognitionApprovedVoiceProfileLabels(recognitionResult);

  return expectedApprovedVoiceLabels.some((expectedLabel) =>
    acceptedProfileLabels.includes(expectedLabel),
  );
}

function getAcceptedRecognitionApprovedVoiceProfileLabels(recognitionResult) {
  if (!recognitionResult || recognitionResult.accepted !== true) {
    return Object.freeze([]);
  }

  const metadata = isRecord(recognitionResult.matchedApprovedVoiceProfileMetadata)
    ? recognitionResult.matchedApprovedVoiceProfileMetadata
    : {};
  const labels = [
    recognitionResult.matchedVoiceId,
    recognitionResult.matchedApprovedVoiceProfileId,
    recognitionResult.matchedApprovedVoiceLabel,
    metadata.id,
    metadata.identityId,
    metadata.profileId,
    metadata.displayName,
    metadata.label,
  ]
    .filter((label) => typeof label === "string" && label.trim().length > 0)
    .map((label) => label.trim());

  return Object.freeze([...new Set(labels)]);
}

function createZeroDownstreamInvocationCounts() {
  return Object.freeze({
    transcription: 0,
    nlu: 0,
    storage: 0,
    rollingBufferRetention: 0,
  });
}

function createVoiceGateEvaluationDownstreamGuard() {
  const downstreamInvocationCounts = {
    ...createZeroDownstreamInvocationCounts(),
  };
  const downstreamInvocationEvents = [];
  let currentUtterance = null;

  function startEvaluatedUtterance({ utteranceIndex, utteranceId }) {
    if (currentUtterance !== null) {
      throw new Error(
        "voice gate downstream guard already has an active evaluated utterance",
      );
    }

    const utteranceState = {
      utteranceIndex,
      utteranceId,
      voiceGateDecisionResolved: false,
      voiceGateDecision: null,
      downstreamInvocationCounts: {
        ...createZeroDownstreamInvocationCounts(),
      },
      downstreamInvocationEvents: [],
    };

    currentUtterance = utteranceState;

    return Object.freeze({
      utteranceIndex,
      utteranceId,
      markVoiceGateDecision: (recognitionResult, details) =>
        markVoiceGateDecisionForUtterance(
          utteranceState,
          recognitionResult,
          details,
        ),
      recordDownstreamInvocation: (stage, details) =>
        recordDownstreamInvocationForUtterance(
          utteranceState,
          stage,
          details,
        ),
      recordSpeechProcessingInvocation: (details) =>
        recordDownstreamInvocationForUtterance(
          utteranceState,
          "transcription",
          details,
        ),
      recordRetentionInvocation: (details) =>
        recordDownstreamInvocationForUtterance(
          utteranceState,
          "rollingBufferRetention",
          details,
        ),
      assertVoiceGateDecisionResolvedForDownstream: (stage) =>
        assertVoiceGateDecisionResolvedForDownstream(
          utteranceState,
          stage || "transcription",
        ),
      getDownstreamInvocationCounts: () =>
        Object.freeze({ ...utteranceState.downstreamInvocationCounts }),
      getDownstreamInvocationEvents: () =>
        Object.freeze([...utteranceState.downstreamInvocationEvents]),
      hasVoiceGateDecision: () => utteranceState.voiceGateDecisionResolved,
      completeUtterance: () => completeEvaluatedUtterance(utteranceState),
    });
  }

  function assertCurrentUtterance(utteranceState) {
    if (currentUtterance !== utteranceState) {
      throw new Error(
        "downstream invocation guard used outside the active evaluated utterance",
      );
    }
  }

  function markVoiceGateDecisionForUtterance(
    utteranceState,
    recognitionResult,
    details = {},
  ) {
    assertCurrentUtterance(utteranceState);
    if (utteranceState.voiceGateDecisionResolved) {
      return utteranceState.voiceGateDecision;
    }

    utteranceState.voiceGateDecisionResolved = true;
    const matchedApprovedVoiceProfile =
      createMatchedApprovedVoiceProfileResultFields(recognitionResult);
    utteranceState.voiceGateDecision = Object.freeze({
      accepted: recognitionResult.accepted === true,
      matchedVoiceId:
        typeof recognitionResult.matchedVoiceId === "string"
          ? recognitionResult.matchedVoiceId
          : null,
      ...matchedApprovedVoiceProfile,
      rejectedVoiceId:
        typeof recognitionResult.rejectedVoiceId === "string"
          ? recognitionResult.rejectedVoiceId
          : null,
      reason:
        typeof recognitionResult.reason === "string"
          ? recognitionResult.reason
          : null,
      source:
        details && typeof details.source === "string"
          ? details.source
          : "voiceGateDecision",
      frameIndex:
        details && Number.isFinite(Number(details.frameIndex))
          ? Number(details.frameIndex)
          : null,
    });

    return utteranceState.voiceGateDecision;
  }

  function recordDownstreamInvocationForUtterance(
    utteranceState,
    stage,
    details = {},
  ) {
    const normalizedStage = normalizeDownstreamStage(stage);
    assertVoiceGateDecisionResolvedForDownstream(
      utteranceState,
      normalizedStage,
    );

    downstreamInvocationCounts[normalizedStage] += 1;
    utteranceState.downstreamInvocationCounts[normalizedStage] += 1;

    const invocationEvent = Object.freeze({
      utteranceIndex: utteranceState.utteranceIndex,
      utteranceId: utteranceState.utteranceId,
      stage: normalizedStage,
      decisionAccepted:
        utteranceState.voiceGateDecision &&
        utteranceState.voiceGateDecision.accepted === true,
      matchedVoiceId: utteranceState.voiceGateDecision
        ? utteranceState.voiceGateDecision.matchedVoiceId
        : null,
      matchedApprovedVoiceProfileId: utteranceState.voiceGateDecision
        ? utteranceState.voiceGateDecision.matchedApprovedVoiceProfileId
        : null,
      matchedApprovedVoiceLabel: utteranceState.voiceGateDecision
        ? utteranceState.voiceGateDecision.matchedApprovedVoiceLabel
        : null,
      matchedApprovedVoiceProfileMetadata: utteranceState.voiceGateDecision
        ? utteranceState.voiceGateDecision.matchedApprovedVoiceProfileMetadata
        : null,
      details: copyRecord(details),
    });

    downstreamInvocationEvents.push(invocationEvent);
    utteranceState.downstreamInvocationEvents.push(invocationEvent);
    return invocationEvent;
  }

  function assertVoiceGateDecisionResolvedForDownstream(
    utteranceState,
    stage,
  ) {
    const normalizedStage = normalizeDownstreamStage(stage);
    assertCurrentUtterance(utteranceState);

    if (!utteranceState.voiceGateDecisionResolved) {
      throw new Error(
        [
          VOICE_GATE_PRE_DECISION_DOWNSTREAM_GUARD_ERROR,
          `stage=${normalizedStage}`,
          `utteranceId=${utteranceState.utteranceId}`,
          `utteranceIndex=${utteranceState.utteranceIndex}`,
        ].join("; "),
      );
    }
  }

  function completeEvaluatedUtterance(utteranceState) {
    assertCurrentUtterance(utteranceState);
    if (!utteranceState.voiceGateDecisionResolved) {
      throw new Error(
        `voice gate evaluation completed without a decision for utteranceId=${utteranceState.utteranceId}`,
      );
    }

    currentUtterance = null;
    return Object.freeze({
      utteranceIndex: utteranceState.utteranceIndex,
      utteranceId: utteranceState.utteranceId,
      downstreamInvocationCounts: Object.freeze({
        ...utteranceState.downstreamInvocationCounts,
      }),
      downstreamInvocationEvents: Object.freeze([
        ...utteranceState.downstreamInvocationEvents,
      ]),
    });
  }

  return Object.freeze({
    startEvaluatedUtterance,
    getDownstreamInvocationCounts: () =>
      Object.freeze({ ...downstreamInvocationCounts }),
    getDownstreamInvocationEvents: () =>
      Object.freeze([...downstreamInvocationEvents]),
  });
}

function normalizeDownstreamStage(stage) {
  if (
    !VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES.includes(stage)
  ) {
    throw new Error(`unknown voice gate downstream stage: ${stage}`);
  }

  return stage;
}

function getSkippedDownstreamStages(downstreamInvocationCounts) {
  return Object.freeze(
    VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES.filter(
      (stage) => downstreamInvocationCounts[stage] === 0,
    ),
  );
}

function getEvaluationFixtureId(evaluationFixture, options) {
  if (evaluationFixture && evaluationFixture.id) {
    return String(evaluationFixture.id);
  }
  return options.fixtureId || "inline-voice-gate-evaluation-fixture";
}

function copyRecord(value) {
  return isRecord(value) ? { ...value } : {};
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = {
  VOICE_GATE_EVALUATION_HARNESS_ID,
  VOICE_GATE_EVALUATION_DECISION_PATH,
  DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID,
  DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT,
  VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES,
  VOICE_GATE_PRE_DECISION_DOWNSTREAM_GUARD_ERROR,
  loadVoiceGateEvaluationFixture,
  runVoiceGateEvaluationHarness,
};
