"use strict";

const {
  toVoiceGateApprovedVoiceProfiles,
} = require("./approvedVoiceProfiles");

const APPROVED_VOICE_RECALL_TARGET_PER_100 = 90;
const FALSE_ACCEPTANCE_LIMIT_PER_100 = 5;
const RECOGNITION_LATENCY_LIMIT_SECONDS = 1;
const MILLISECONDS_PER_SECOND = 1000;
const APPROVED_VOICE_RECOGNITION_EVENT_TYPE = "approvedVoiceRecognized";
const VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION = 3;
const VOICE_GATE_RECOGNITION_RESULT_SCHEMA = Object.freeze({
  schemaVersion: VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION,
  resultKindField: "accepted",
  matchedApprovedVoiceIdentifierField: "matchedVoiceId",
  matchedApprovedVoiceProfileIdentifierField: "matchedApprovedVoiceProfileId",
  matchedApprovedVoiceHumanReadableLabelField: "matchedApprovedVoiceLabel",
  matchedApprovedVoiceProfileMetadataField:
    "matchedApprovedVoiceProfileMetadata",
  approvedVoiceClassificationTimestampField: "recognizedAtMs",
  acceptedSpeechRequiresMatchedApprovedVoiceIdentifier: true,
  acceptedSpeechRequiresMatchedApprovedVoiceProfileIdentifier: true,
  acceptedSpeechRequiresMatchedApprovedVoiceHumanReadableLabel: true,
  acceptedSpeechRequiresMatchedApprovedVoiceProfileMetadata: true,
  acceptedSpeechRequiresApprovedVoiceClassificationTimestamp: true,
  rejectedSpeechMatchedApprovedVoiceIdentifier: null,
  rejectedSpeechMatchedApprovedVoiceProfileIdentifier: null,
  rejectedSpeechMatchedApprovedVoiceHumanReadableLabel: null,
  rejectedSpeechMatchedApprovedVoiceProfileMetadata: null,
  rejectedSpeechApprovedVoiceClassificationTimestamp: null,
  downstreamAuthorizationMatchedVoiceIdentifierField:
    "downstreamAuthorization.matchedVoiceId",
  approvedVoiceIdentifierSourceField: "approvedVoiceProfilesById.*.id",
  approvedVoiceProfileIdentifierSourceField:
    "approvedVoiceProfilesById.*.profileId",
  approvedVoiceHumanReadableLabelSourceField:
    "approvedVoiceProfilesById.*.displayName",
  supportsMultipleApprovedVoices: true,
});
const DEFAULT_VOICE_GATE_DECISION_THRESHOLD = 0.95;
const VOICE_GATE_DECISION_THRESHOLD = DEFAULT_VOICE_GATE_DECISION_THRESHOLD;
const QUIET_ROOM_APPROVED_UTTERANCE_COUNT = 100;
const QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT = Object.freeze({
  roomType: "quiet_indoor_room",
  speakingVolume: "normal",
  captureMode: "local_embedding_fixture",
});

const DEFAULT_VOICE_GATE_CONFIG = Object.freeze({
  recallTargetPer100: APPROVED_VOICE_RECALL_TARGET_PER_100,
  falseAcceptanceLimitPer100: FALSE_ACCEPTANCE_LIMIT_PER_100,
  maxRecognitionLatencyMs:
    RECOGNITION_LATENCY_LIMIT_SECONDS * MILLISECONDS_PER_SECOND,
  frameWindowMs: RECOGNITION_LATENCY_LIMIT_SECONDS * MILLISECONDS_PER_SECOND,
  voiceGateDecisionThreshold: DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  highConfidenceThreshold: DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  averageConfidenceThreshold: 0.89,
  recallConfidenceThreshold: 0.83,
  minAverageFrames: 3,
  minRecallFrames: 2,
  topFrameCount: 3,
});

function normalizeConfig(config) {
  const overrides = config || {};
  const normalizedConfig = {
    ...DEFAULT_VOICE_GATE_CONFIG,
    ...overrides,
  };

  if (
    Object.prototype.hasOwnProperty.call(
      overrides,
      "voiceGateDecisionThreshold",
    )
  ) {
    normalizedConfig.highConfidenceThreshold =
      normalizedConfig.voiceGateDecisionThreshold;
  } else if (
    Object.prototype.hasOwnProperty.call(overrides, "highConfidenceThreshold")
  ) {
    normalizedConfig.voiceGateDecisionThreshold =
      normalizedConfig.highConfidenceThreshold;
  }

  return normalizedConfig;
}

function normalizeEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) return [];

  const clean = embedding
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const magnitude = Math.sqrt(
    clean.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) return [];
  return clean.map((value) => value / magnitude);
}

function cosineSimilarity(a, b) {
  const length = Math.min(a.length, b.length);
  if (length === 0 || a.length !== b.length) return Number.NEGATIVE_INFINITY;

  let dot = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
  }
  return dot;
}

function prepareApprovedVoiceProfiles(profiles) {
  if (!profiles) return [];

  return toVoiceGateApprovedVoiceProfiles(profiles)
    .map((profile) => {
      const embeddings = profile.embeddings
        .map(normalizeEmbedding)
        .filter((embedding) => embedding.length > 0);

      if (embeddings.length === 0) {
        throw new Error(
          `approved voice profile ${profile.id} must include usable embeddings`,
        );
      }

      return {
        ...profile,
        id: String(profile.id),
        embeddings,
      };
    });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scoreFrameAgainstProfile(frameEmbedding, profile) {
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const enrolledEmbedding of profile.embeddings) {
    bestScore = Math.max(
      bestScore,
      cosineSimilarity(frameEmbedding, enrolledEmbedding),
    );
  }

  return bestScore;
}

function scorePreparedApprovedVoiceCandidates(frameEmbedding, approvedProfiles) {
  return approvedProfiles.map((profile) => ({
    profileId: profile.id,
    score: scoreFrameAgainstProfile(frameEmbedding, profile),
  }));
}

function getMatchedApprovedVoiceProfileId(profile) {
  if (!isRecord(profile)) return null;
  const profileId =
    typeof profile.profileId === "string" ? profile.profileId.trim() : "";
  const id = typeof profile.id === "string" ? profile.id.trim() : "";

  return profileId || id || null;
}

function getMatchedApprovedVoiceLabel(profile) {
  if (!isRecord(profile)) return null;
  const displayName =
    typeof profile.displayName === "string"
      ? profile.displayName.trim()
      : "";
  const profileId = getMatchedApprovedVoiceProfileId(profile);

  return displayName || profileId;
}

function createMatchedApprovedVoiceProfileMetadata(profile) {
  if (!isRecord(profile)) return null;

  const id = typeof profile.id === "string" ? profile.id.trim() : "";
  const identityId =
    typeof profile.identityId === "string" ? profile.identityId.trim() : "";
  const profileId = getMatchedApprovedVoiceProfileId(profile);
  const label = getMatchedApprovedVoiceLabel(profile);
  const displayName =
    typeof profile.displayName === "string"
      ? profile.displayName.trim()
      : "";

  if (!id || !identityId || !profileId || !label) return null;

  return Object.freeze({
    id,
    identityId,
    profileId,
    displayName: displayName || null,
    label,
    approvalState:
      typeof profile.approvalState === "string"
        ? profile.approvalState
        : "approved",
    approved: profile.approved === true,
    enrolled: profile.enrolled === true,
  });
}

function normalizeMatchedApprovedVoiceProfileMetadata(
  metadata,
  matchedVoiceId,
  matchedApprovedVoiceProfileId,
  matchedApprovedVoiceLabel,
) {
  const normalizedMatchedVoiceId =
    typeof matchedVoiceId === "string" ? matchedVoiceId.trim() : "";
  const normalizedProfileId =
    typeof matchedApprovedVoiceProfileId === "string"
      ? matchedApprovedVoiceProfileId.trim()
      : "";
  const normalizedLabel =
    typeof matchedApprovedVoiceLabel === "string"
      ? matchedApprovedVoiceLabel.trim()
      : "";

  if (isRecord(metadata)) {
    const id = typeof metadata.id === "string" ? metadata.id.trim() : "";
    const identityId =
      typeof metadata.identityId === "string"
        ? metadata.identityId.trim()
        : "";
    const profileId =
      typeof metadata.profileId === "string"
        ? metadata.profileId.trim()
        : "";
    const label =
      typeof metadata.label === "string" ? metadata.label.trim() : "";
    const displayName =
      typeof metadata.displayName === "string"
        ? metadata.displayName.trim()
        : "";

    if (
      id &&
      identityId &&
      profileId &&
      label &&
      id === normalizedMatchedVoiceId &&
      identityId === normalizedMatchedVoiceId &&
      profileId === normalizedProfileId &&
      metadata.approved === true &&
      metadata.enrolled === true
    ) {
      return Object.freeze({
        id,
        identityId,
        profileId,
        displayName: displayName || null,
        label,
        approvalState:
          typeof metadata.approvalState === "string"
            ? metadata.approvalState
            : "approved",
        approved: true,
        enrolled: true,
      });
    }
  }

  if (!normalizedMatchedVoiceId || !normalizedProfileId || !normalizedLabel) {
    return null;
  }

  return Object.freeze({
    id: normalizedMatchedVoiceId,
    identityId: normalizedMatchedVoiceId,
    profileId: normalizedProfileId,
    displayName: null,
    label: normalizedLabel,
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
}

function selectBestApprovedVoiceCandidateScore(candidateScores) {
  let bestCandidateScore = null;

  for (const candidateScore of candidateScores) {
    if (candidateScore === null || candidateScore === undefined) continue;
    const score = candidateScore.score;
    if (!Number.isFinite(score)) continue;

    if (
      bestCandidateScore === null ||
      score > bestCandidateScore.score
    ) {
      bestCandidateScore = {
        profileId: String(candidateScore.profileId),
        score,
      };
    }
  }

  return bestCandidateScore;
}

function scoreApprovedVoiceCandidates(incomingSpeechRepresentation, profiles) {
  const approvedProfiles = prepareApprovedVoiceProfiles(profiles);
  const frameEmbedding = normalizeEmbedding(
    getIncomingSpeechRepresentationEmbedding(incomingSpeechRepresentation),
  );
  if (frameEmbedding.length === 0) {
    return approvedProfiles.map((profile) => ({
      profileId: profile.id,
      score: null,
    }));
  }

  return scorePreparedApprovedVoiceCandidates(
    frameEmbedding,
    approvedProfiles,
  ).map((candidateScore) => ({
    profileId: candidateScore.profileId,
    score: toFiniteScore(candidateScore.score),
  }));
}

function scoreIncomingAudioSampleAgainstApprovedVoices(
  incomingSpeechRepresentation,
  profiles,
) {
  const candidateScores = scoreApprovedVoiceCandidates(
    incomingSpeechRepresentation,
    profiles,
  );
  const bestCandidateScore =
    selectBestApprovedVoiceCandidateScore(candidateScores);

  return {
    candidateScores,
    bestCandidateScore,
    bestApprovedVoiceId: bestCandidateScore
      ? bestCandidateScore.profileId
      : null,
    bestApprovedVoiceScore: bestCandidateScore
      ? bestCandidateScore.score
      : null,
  };
}

function getIncomingSpeechRepresentationEmbedding(
  incomingSpeechRepresentation,
) {
  return isRecord(incomingSpeechRepresentation)
    ? incomingSpeechRepresentation.embedding
    : incomingSpeechRepresentation;
}

function topAverage(values, count) {
  if (values.length === 0) return Number.NEGATIVE_INFINITY;
  const sorted = [...values].sort((a, b) => b - a);
  const topValues = sorted.slice(0, Math.max(1, count));
  return (
    topValues.reduce((sum, value) => sum + value, 0) / topValues.length
  );
}

function toFiniteScore(value) {
  return Number.isFinite(value) ? value : null;
}

function normalizeRecognitionEventTimestampMs(value) {
  const timestampMs = value === undefined ? Date.now() : Number(value);

  if (value === null || !Number.isFinite(timestampMs)) {
    throw new Error("approved voice recognition timestamp must be finite");
  }

  return timestampMs;
}

function createApprovedVoiceRecognitionEvent(recognitionResult, options) {
  if (!isRecord(recognitionResult) || recognitionResult.accepted !== true) {
    throw new Error(
      "approved voice recognition events require an accepted recognition result",
    );
  }

  const matchedVoiceId =
    typeof recognitionResult.matchedVoiceId === "string"
      ? recognitionResult.matchedVoiceId.trim()
      : "";

  if (!matchedVoiceId) {
    throw new Error(
      "approved voice recognition events require a matched approved voice id",
    );
  }

  const downstreamAuthorization =
    normalizeApprovedVoiceDownstreamAuthorization(
      recognitionResult.downstreamAuthorization,
      matchedVoiceId,
    );
  if (!downstreamAuthorization) {
    throw new Error(
      "approved voice recognition events require configured threshold authorization",
    );
  }

  const recognizedAtMs = normalizeRecognitionEventTimestampMs(
    options && options.recognizedAtMs !== undefined
      ? options.recognizedAtMs
      : recognitionResult.recognizedAtMs,
  );
  const latencyMs =
    recognitionResult.latencyMs === null ||
    recognitionResult.latencyMs === undefined
      ? null
      : Number(recognitionResult.latencyMs);
  const evaluatedFrameCount = Number(recognitionResult.evaluatedFrameCount);
  const candidateScores = Array.isArray(recognitionResult.candidateScores)
    ? recognitionResult.candidateScores.map((candidateScore) => ({
        ...candidateScore,
      }))
    : [];
  const bestCandidateScore =
    recognitionResult.bestCandidateScore &&
    isRecord(recognitionResult.bestCandidateScore)
      ? { ...recognitionResult.bestCandidateScore }
      : selectBestApprovedVoiceCandidateScore(candidateScores);
  const matchedApprovedVoiceProfileId =
    typeof recognitionResult.matchedApprovedVoiceProfileId === "string"
      ? recognitionResult.matchedApprovedVoiceProfileId.trim() || matchedVoiceId
      : matchedVoiceId;
  const matchedApprovedVoiceLabel =
    typeof recognitionResult.matchedApprovedVoiceLabel === "string"
      ? recognitionResult.matchedApprovedVoiceLabel.trim() ||
        matchedApprovedVoiceProfileId
      : matchedApprovedVoiceProfileId;
  const matchedApprovedVoiceProfileMetadata =
    normalizeMatchedApprovedVoiceProfileMetadata(
      recognitionResult.matchedApprovedVoiceProfileMetadata,
      matchedVoiceId,
      matchedApprovedVoiceProfileId,
      matchedApprovedVoiceLabel,
    );

  if (matchedApprovedVoiceProfileMetadata === null) {
    throw new Error(
      "approved voice recognition events require matched voice profile metadata",
    );
  }

  return Object.freeze({
    eventType: APPROVED_VOICE_RECOGNITION_EVENT_TYPE,
    timestamp: new Date(recognizedAtMs).toISOString(),
    recognizedAtMs,
    accepted: true,
    matchedVoiceId,
    matchedApprovedVoiceProfileId,
    matchedApprovedVoiceLabel,
    matchedApprovedVoiceProfileMetadata,
    rejectedVoiceId: null,
    confidence: Number.isFinite(Number(recognitionResult.confidence))
      ? Number(recognitionResult.confidence)
      : 0,
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : null,
    evaluatedFrameCount: Number.isFinite(evaluatedFrameCount)
      ? evaluatedFrameCount
      : 0,
    reason:
      typeof recognitionResult.reason === "string"
        ? recognitionResult.reason
        : "approved_voice_recognized",
    candidateScores,
    bestCandidateScore,
    bestApprovedVoiceId: bestCandidateScore
      ? bestCandidateScore.profileId
      : null,
    bestApprovedVoiceScore: bestCandidateScore
      ? bestCandidateScore.score
      : null,
    downstreamAuthorization,
  });
}

function summarizeCandidateScore(profileScore) {
  const score = Math.max(profileScore.topScore, profileScore.averageTopScore);

  return {
    profileId: profileScore.profile.id,
    score: toFiniteScore(score),
    topScore: toFiniteScore(profileScore.topScore),
    averageTopScore: toFiniteScore(profileScore.averageTopScore),
    recallFrameCount: profileScore.recallFrameCount,
    scoredFrameCount: profileScore.scoredFrameCount,
  };
}

function createApprovedVoiceDownstreamAuthorizationForDecision(
  profileScore,
  config,
  decisionRule,
) {
  let score;
  let threshold;
  let supportingFrameCount;
  let requiredFrameCount;

  if (decisionRule === "high_confidence_match") {
    score = profileScore.topScore;
    threshold = config.voiceGateDecisionThreshold;
    supportingFrameCount = score >= threshold ? 1 : 0;
    requiredFrameCount = 1;
  } else if (decisionRule === "average_confidence_match") {
    score = profileScore.averageTopScore;
    threshold = config.averageConfidenceThreshold;
    supportingFrameCount = profileScore.scoredFrameCount;
    requiredFrameCount = config.minAverageFrames;
  } else if (decisionRule === "recall_biased_match") {
    score = profileScore.topScore;
    threshold = config.recallConfidenceThreshold;
    supportingFrameCount = profileScore.recallFrameCount;
    requiredFrameCount = config.minRecallFrames;
  } else {
    return null;
  }

  if (
    !Number.isFinite(score) ||
    !Number.isFinite(threshold) ||
    score < threshold ||
    supportingFrameCount < requiredFrameCount
  ) {
    return null;
  }

  return {
    authorized: true,
    matchedVoiceId: String(profileScore.profile.id),
    score,
    threshold,
    decisionRule,
    supportingFrameCount,
    requiredFrameCount,
  };
}

function createApprovedVoiceRecognitionDecision(profileScore, config) {
  const acceptedByHighConfidence =
    profileScore.topScore >= config.voiceGateDecisionThreshold;
  const acceptedByAverageConfidence =
    profileScore.scoredFrameCount >= config.minAverageFrames &&
    profileScore.averageTopScore >= config.averageConfidenceThreshold;
  const acceptedByRecallBias =
    profileScore.recallFrameCount >= config.minRecallFrames &&
    profileScore.topScore >= config.recallConfidenceThreshold;

  const decisionRule = acceptedByHighConfidence
    ? "high_confidence_match"
    : acceptedByAverageConfidence
      ? "average_confidence_match"
      : acceptedByRecallBias
        ? "recall_biased_match"
        : null;

  if (decisionRule === null) return null;

  const downstreamAuthorization =
    createApprovedVoiceDownstreamAuthorizationForDecision(
      profileScore,
      config,
      decisionRule,
    );

  if (downstreamAuthorization === null) return null;

  return {
    profileScore,
    reason: decisionRule,
    confidence: Math.max(
      profileScore.topScore,
      profileScore.averageTopScore,
      0,
    ),
    downstreamAuthorization,
  };
}

function selectApprovedVoiceRecognitionDecision(profileScores, config) {
  for (const profileScore of profileScores) {
    const decision = createApprovedVoiceRecognitionDecision(
      profileScore,
      config,
    );

    if (decision !== null) return decision;
  }

  return null;
}

function normalizeApprovedVoiceDownstreamAuthorization(
  authorization,
  matchedVoiceId,
) {
  if (!isRecord(authorization)) return null;
  const normalizedMatchedVoiceId =
    typeof authorization.matchedVoiceId === "string"
      ? authorization.matchedVoiceId.trim()
      : "";
  const expectedMatchedVoiceId =
    typeof matchedVoiceId === "string" ? matchedVoiceId.trim() : "";
  const score = Number(authorization.score);
  const threshold = Number(authorization.threshold);

  if (
    authorization.authorized !== true ||
    normalizedMatchedVoiceId.length === 0 ||
    normalizedMatchedVoiceId !== expectedMatchedVoiceId ||
    !Number.isFinite(score) ||
    !Number.isFinite(threshold) ||
    score < threshold
  ) {
    return null;
  }

  return Object.freeze({
    authorized: true,
    matchedVoiceId: normalizedMatchedVoiceId,
    score,
    threshold,
    decisionRule:
      typeof authorization.decisionRule === "string"
        ? authorization.decisionRule
        : "approved_voice_match",
    supportingFrameCount: Number.isFinite(
      Number(authorization.supportingFrameCount),
    )
      ? Number(authorization.supportingFrameCount)
      : 1,
    requiredFrameCount: Number.isFinite(
      Number(authorization.requiredFrameCount),
    )
      ? Number(authorization.requiredFrameCount)
      : 1,
  });
}

function evaluateWindow(frames, approvedProfiles, config) {
  const scoredFrames = frames.map((frame) => ({
    candidateScores: scorePreparedApprovedVoiceCandidates(
      frame.embedding,
      approvedProfiles,
    ),
  }));
  const profileScores = approvedProfiles.map((profile) => {
    const frameScores = scoredFrames
      .map((frame) => {
        const candidateScore = frame.candidateScores.find(
          (score) => score.profileId === profile.id,
        );
        return candidateScore
          ? candidateScore.score
          : Number.NEGATIVE_INFINITY;
      })
      .filter((score) => Number.isFinite(score));
    const topScore =
      frameScores.length > 0
        ? Math.max(...frameScores)
        : Number.NEGATIVE_INFINITY;
    const averageTopScore = topAverage(frameScores, config.topFrameCount);
    const recallFrameCount = frameScores.filter(
      (score) => score >= config.recallConfidenceThreshold,
    ).length;

    return {
      profile,
      topScore,
      averageTopScore,
      recallFrameCount,
      scoredFrameCount: frameScores.length,
    };
  });
  const candidateScores = profileScores.map(summarizeCandidateScore);
  const bestCandidateScore =
    selectBestApprovedVoiceCandidateScore(candidateScores);

  const rankedProfileScores = [...profileScores].sort((a, b) => {
    const confidenceDelta =
      Math.max(b.topScore, b.averageTopScore) -
      Math.max(a.topScore, a.averageTopScore);
    if (confidenceDelta !== 0) return confidenceDelta;
    return b.recallFrameCount - a.recallFrameCount;
  });

  const best = rankedProfileScores[0];
  if (!best) {
    return {
      accepted: false,
      matchedVoiceId: null,
      matchedApprovedVoiceProfileId: null,
      matchedApprovedVoiceLabel: null,
      matchedApprovedVoiceProfileMetadata: null,
      confidence: 0,
      reason: "no_approved_voices",
      candidateScores,
      bestCandidateScore: null,
      bestApprovedVoiceId: null,
      bestApprovedVoiceScore: null,
      downstreamAuthorization: null,
    };
  }

  const recognitionDecision = selectApprovedVoiceRecognitionDecision(
    rankedProfileScores,
    config,
  );

  if (recognitionDecision === null) {
    return {
      accepted: false,
      matchedVoiceId: null,
      matchedApprovedVoiceProfileId: null,
      matchedApprovedVoiceLabel: null,
      matchedApprovedVoiceProfileMetadata: null,
      confidence: Math.max(best.topScore, best.averageTopScore, 0),
      reason: "below_threshold",
      candidateScores,
      bestCandidateScore,
      bestApprovedVoiceId: bestCandidateScore
        ? bestCandidateScore.profileId
        : null,
      bestApprovedVoiceScore: bestCandidateScore
        ? bestCandidateScore.score
        : null,
      downstreamAuthorization: null,
    };
  }

  return {
    accepted: true,
    matchedVoiceId: recognitionDecision.profileScore.profile.id,
    matchedApprovedVoiceProfileId: getMatchedApprovedVoiceProfileId(
      recognitionDecision.profileScore.profile,
    ),
    matchedApprovedVoiceLabel: getMatchedApprovedVoiceLabel(
      recognitionDecision.profileScore.profile,
    ),
    matchedApprovedVoiceProfileMetadata:
      createMatchedApprovedVoiceProfileMetadata(
        recognitionDecision.profileScore.profile,
      ),
    confidence: recognitionDecision.confidence,
    reason: recognitionDecision.reason,
    candidateScores,
    bestCandidateScore,
    bestApprovedVoiceId: bestCandidateScore
      ? bestCandidateScore.profileId
      : null,
    bestApprovedVoiceScore: bestCandidateScore
      ? bestCandidateScore.score
      : null,
    downstreamAuthorization: recognitionDecision.downstreamAuthorization,
  };
}

function createEmptyRecognitionResult(reason, evaluatedFrameCount = 0) {
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
    evaluatedFrameCount,
    reason,
    candidateScores: [],
    bestCandidateScore: null,
    bestApprovedVoiceId: null,
    bestApprovedVoiceScore: null,
    downstreamAuthorization: null,
  };
}

function redactApprovedIdentityFromRejectedRecognitionResult(result) {
  if (!isRecord(result) || result.accepted === true) return result;

  return {
    ...result,
    accepted: false,
    matchedVoiceId: null,
    matchedApprovedVoiceProfileId: null,
    matchedApprovedVoiceLabel: null,
    matchedApprovedVoiceProfileMetadata: null,
    recognizedAtMs: null,
    candidateScores: [],
    bestCandidateScore: null,
    bestApprovedVoiceId: null,
    bestApprovedVoiceScore: null,
    downstreamAuthorization: null,
  };
}

function createApprovedVoiceGate(options) {
  const config = normalizeConfig(options && options.config);
  const nowMs =
    options && typeof options.nowMs === "function" ? options.nowMs : Date.now;
  const onApprovedVoiceRecognized =
    options && typeof options.onApprovedVoiceRecognized === "function"
      ? options.onApprovedVoiceRecognized
      : null;
  const approvedProfiles = prepareApprovedVoiceProfiles(
    options && options.approvedVoices,
  );

  let frames = [];
  let currentUtteranceId = null;
  let windowStartedAtMs = null;
  let acceptedResult = null;

  function reset() {
    frames = [];
    currentUtteranceId = null;
    windowStartedAtMs = null;
    acceptedResult = null;
  }

  function observeFrame(frame) {
    if (acceptedResult) return acceptedResult;
    if (approvedProfiles.length === 0) {
      return createEmptyRecognitionResult("no_approved_voices");
    }

    const embedding = normalizeEmbedding(frame && frame.embedding);
    if (embedding.length === 0) {
      return createEmptyRecognitionResult("empty_embedding", frames.length);
    }

    const timestampMs =
      frame.timestampMs === undefined ? Date.now() : Number(frame.timestampMs);
    const utteranceId = frame.utteranceId || null;

    if (utteranceId && utteranceId !== currentUtteranceId) {
      frames = [];
      currentUtteranceId = utteranceId;
      windowStartedAtMs = timestampMs;
    } else if (windowStartedAtMs === null) {
      windowStartedAtMs = timestampMs;
    }

    frames.push({ embedding, timestampMs });

    const windowFloorMs = timestampMs - config.frameWindowMs;
    frames = frames.filter((candidate) => candidate.timestampMs >= windowFloorMs);
    if (frames.length > 0) {
      windowStartedAtMs = Math.max(windowStartedAtMs, frames[0].timestampMs);
    }

    const result = evaluateWindow(frames, approvedProfiles, config);
    const latencyMs =
      windowStartedAtMs === null ? 0 : timestampMs - windowStartedAtMs;

    const recognitionResult = {
      ...result,
      rejectedVoiceId: result.rejectedVoiceId || null,
      recognizedAtMs: null,
      latencyMs,
      evaluatedFrameCount: frames.length,
    };

    if (
      recognitionResult.accepted &&
      recognitionResult.latencyMs <= config.maxRecognitionLatencyMs
    ) {
      acceptedResult = {
        ...recognitionResult,
        recognizedAtMs: normalizeRecognitionEventTimestampMs(nowMs()),
      };
      if (onApprovedVoiceRecognized) {
        onApprovedVoiceRecognized(
          createApprovedVoiceRecognitionEvent(acceptedResult),
        );
      }
      return acceptedResult;
    }

    return recognitionResult.accepted
      ? redactApprovedIdentityFromRejectedRecognitionResult({
          ...recognitionResult,
          rejectedVoiceId: null,
          reason: "latency_limit_exceeded",
        })
      : redactApprovedIdentityFromRejectedRecognitionResult(recognitionResult);
  }

  return {
    observeFrame,
    reset,
    getApprovedVoiceCount: () => approvedProfiles.length,
    getConfig: () => ({ ...config }),
  };
}

function recognizeApprovedVoiceUtterance(frames, approvedVoices, config) {
  const gate = createApprovedVoiceGate({ approvedVoices, config });
  let latestResult = createEmptyRecognitionResult("no_frames");

  for (const frame of frames || []) {
    latestResult = gate.observeFrame(frame);
    if (latestResult.accepted) return latestResult;
  }

  return latestResult;
}

function measureNonApprovedVoiceFalseAcceptances(options = {}) {
  const evaluationFixture =
    options.evaluationFixture || options.fixture || null;
  const utterances =
    options.utterances ||
    (evaluationFixture && evaluationFixture.utterances) ||
    [];
  const approvedVoices =
    options.approvedVoices ||
    options.approvedReferenceVoices ||
    (evaluationFixture && evaluationFixture.approvedReferenceVoices) ||
    [];
  const config = options.config;
  const falseAcceptanceLimitPer100 = options.falseAcceptanceLimitPer100;
  const measuredUtterances = [];
  const falseAcceptances = [];
  const normalizedFalseAcceptanceLimitPer100 =
    normalizeFalseAcceptanceLimitPer100(
      falseAcceptanceLimitPer100 ??
        (config && config.falseAcceptanceLimitPer100),
    );

  for (const utterance of utterances) {
    if (!isNonApprovedEvaluationUtterance(utterance)) continue;

    const frames = getEvaluationUtteranceFrames(utterance);
    const result = recognizeApprovedVoiceUtterance(
      frames,
      approvedVoices,
      config,
    );
    const measurement = createNonApprovedUtteranceMeasurement(
      utterance,
      measuredUtterances.length,
      frames,
      result,
    );

    measuredUtterances.push(measurement);
    if (result.accepted) {
      falseAcceptances.push({
        utteranceIndex: measurement.utteranceIndex,
        utteranceId: measurement.utteranceId,
        speakerId: measurement.speakerId,
        matchedVoiceId: result.matchedVoiceId,
        matchedApprovedVoiceProfileId:
          result.matchedApprovedVoiceProfileId,
        matchedApprovedVoiceLabel: result.matchedApprovedVoiceLabel,
        matchedApprovedVoiceProfileMetadata:
          result.matchedApprovedVoiceProfileMetadata,
        confidence: result.confidence,
        latencyMs: result.latencyMs,
        reason: result.reason,
        evaluatedFrameCount: result.evaluatedFrameCount,
      });
    }
  }

  const nonApprovedTotal = measuredUtterances.length;
  const falseAccepted = falseAcceptances.length;
  const allowedFalseAcceptances = Math.floor(
    (nonApprovedTotal * normalizedFalseAcceptanceLimitPer100) / 100,
  );

  return {
    falseAccepted,
    falseAcceptanceCount: falseAccepted,
    falseAcceptanceRatePer100:
      nonApprovedTotal === 0 ? 0 : (falseAccepted / nonApprovedTotal) * 100,
    nonApprovedTotal,
    falseAcceptanceLimitPer100: normalizedFalseAcceptanceLimitPer100,
    allowedFalseAcceptances,
    passedFalseAcceptance: falseAccepted <= allowedFalseAcceptances,
    measuredUtterances,
    falseAcceptances,
  };
}

function normalizeFalseAcceptanceLimitPer100(value) {
  const normalizedLimit = Number(value);

  return Number.isFinite(normalizedLimit) && normalizedLimit >= 0
    ? normalizedLimit
    : FALSE_ACCEPTANCE_LIMIT_PER_100;
}

function isNonApprovedEvaluationUtterance(utterance) {
  if (Array.isArray(utterance)) return true;
  if (!isRecord(utterance)) return false;
  if (utterance.approved === true) return false;
  return true;
}

function getEvaluationUtteranceFrames(utterance) {
  if (Array.isArray(utterance)) return utterance;
  return Array.isArray(utterance && utterance.frames) ? utterance.frames : [];
}

function createNonApprovedUtteranceMeasurement(
  utterance,
  utteranceIndex,
  frames,
  result,
) {
  const utteranceId = getEvaluationUtteranceId(
    utterance,
    frames,
    utteranceIndex,
  );

  return {
    utteranceIndex,
    utteranceId,
    speakerId: getEvaluationUtteranceSpeakerId(utterance),
    expectedVoiceGateDecision: "reject",
    accepted: result.accepted,
    matchedVoiceId: result.matchedVoiceId,
    matchedApprovedVoiceProfileId: result.matchedApprovedVoiceProfileId,
    matchedApprovedVoiceLabel: result.matchedApprovedVoiceLabel,
    matchedApprovedVoiceProfileMetadata:
      result.matchedApprovedVoiceProfileMetadata,
    rejectedVoiceId: result.rejectedVoiceId,
    confidence: result.confidence,
    latencyMs: result.latencyMs,
    reason: result.reason,
    evaluatedFrameCount: result.evaluatedFrameCount,
  };
}

function getEvaluationUtteranceId(utterance, frames, utteranceIndex) {
  if (isRecord(utterance) && utterance.utteranceId) {
    return String(utterance.utteranceId);
  }

  const firstFrame = frames[0];
  if (isRecord(firstFrame) && firstFrame.utteranceId) {
    return String(firstFrame.utteranceId);
  }

  return `non-approved-${utteranceIndex}`;
}

function getEvaluationUtteranceSpeakerId(utterance) {
  return isRecord(utterance) && utterance.speakerId
    ? String(utterance.speakerId)
    : null;
}

function createDeterministicRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createBaseEmbedding(length, random) {
  const embedding = [];
  for (let index = 0; index < length; index += 1) {
    embedding.push(random() * 2 - 1);
  }
  return normalizeEmbedding(embedding);
}

function createPerturbedEmbedding(baseEmbedding, random, noiseLevel) {
  const embedding = baseEmbedding.map((value) => {
    const centeredNoise = random() * 2 - 1;
    return value + centeredNoise * noiseLevel;
  });
  return normalizeEmbedding(embedding);
}

function createPartiallySimilarEmbedding(baseEmbedding, random, similarity) {
  const unrelated = createBaseEmbedding(baseEmbedding.length, random);
  const projection = cosineSimilarity(unrelated, baseEmbedding);
  const orthogonalComponent = normalizeEmbedding(
    unrelated.map((value, index) => value - projection * baseEmbedding[index]),
  );
  const dissimilarity = Math.sqrt(Math.max(0, 1 - similarity * similarity));
  const fallbackComponent =
    orthogonalComponent.length === baseEmbedding.length
      ? orthogonalComponent
      : createBaseEmbedding(baseEmbedding.length, random);

  return normalizeEmbedding(
    baseEmbedding.map(
      (value, index) =>
        value * similarity + fallbackComponent[index] * dissimilarity,
    ),
  );
}

function runQuietRoomApprovedVoiceRecallBaseline(options) {
  const random = createDeterministicRandom((options && options.seed) || 4107);
  const utteranceTotal =
    (options && options.utteranceTotal) ||
    QUIET_ROOM_APPROVED_UTTERANCE_COUNT;
  const embeddingLength = 32;
  const approvedBase = createBaseEmbedding(embeddingLength, random);
  const approvedVoice = {
    id: "approved-quiet-room-speaker",
    displayName: "Approved quiet-room speaker",
    approved: true,
    enrolled: true,
    embeddings: Array.from({ length: 5 }, () =>
      createPerturbedEmbedding(approvedBase, random, 0.045),
    ),
  };

  let approvedRecognized = 0;
  let maxAcceptedLatencyMs = 0;
  const misses = [];

  for (let utteranceIndex = 0; utteranceIndex < utteranceTotal; utteranceIndex += 1) {
    const frameCount = utteranceIndex % 13 === 0 ? 4 : 6;
    const utteranceNoise =
      0.13 + random() * 0.08 + (utteranceIndex % 17 === 0 ? 0.035 : 0);
    const frames = Array.from({ length: frameCount }, (_, frameIndex) => ({
      utteranceId: `approved-${utteranceIndex}`,
      timestampMs: frameIndex * 120,
      embedding: createPerturbedEmbedding(
        approvedBase,
        random,
        utteranceNoise,
      ),
    }));

    const result = recognizeApprovedVoiceUtterance(
      frames,
      [approvedVoice],
      options && options.config,
    );

    if (result.accepted) {
      approvedRecognized += 1;
      maxAcceptedLatencyMs = Math.max(
        maxAcceptedLatencyMs,
        result.latencyMs || 0,
      );
    } else {
      misses.push({
        utteranceIndex,
        confidence: result.confidence,
        reason: result.reason,
      });
    }
  }

  return {
    testEnvironment: QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT,
    approvedRecognized,
    approvedTotal: utteranceTotal,
    recallTargetPer100: APPROVED_VOICE_RECALL_TARGET_PER_100,
    passedRecall:
      approvedRecognized >=
      Math.ceil(
        (utteranceTotal * APPROVED_VOICE_RECALL_TARGET_PER_100) / 100,
      ),
    maxAcceptedLatencyMs,
    recognitionLatencyLimitMs:
      DEFAULT_VOICE_GATE_CONFIG.maxRecognitionLatencyMs,
    passedLatency:
      maxAcceptedLatencyMs <= DEFAULT_VOICE_GATE_CONFIG.maxRecognitionLatencyMs,
    misses,
  };
}

function runQuietRoomNonApprovedFalseAcceptanceBaseline(options) {
  const random = createDeterministicRandom((options && options.seed) || 8911);
  const utteranceTotal = (options && options.utteranceTotal) || 100;
  const embeddingLength = 32;
  const approvedBase = createBaseEmbedding(embeddingLength, random);
  const approvedVoice = {
    id: "approved-quiet-room-speaker",
    displayName: "Approved quiet-room speaker",
    approved: true,
    enrolled: true,
    embeddings: Array.from({ length: 5 }, () =>
      createPerturbedEmbedding(approvedBase, random, 0.045),
    ),
  };
  const nonApprovedBases = [
    0.7,
    0.68,
    0.66,
    0.64,
    0.62,
    0.6,
    0.58,
    0.56,
    0.54,
    0.52,
  ].map((similarity) =>
    createPartiallySimilarEmbedding(approvedBase, random, similarity),
  );

  const nonApprovedUtterances = [];

  for (let utteranceIndex = 0; utteranceIndex < utteranceTotal; utteranceIndex += 1) {
    const speakerBase =
      nonApprovedBases[utteranceIndex % nonApprovedBases.length];
    const frameCount = utteranceIndex % 11 === 0 ? 4 : 6;
    const utteranceNoise =
      0.12 + random() * 0.08 + (utteranceIndex % 19 === 0 ? 0.03 : 0);
    const utteranceId = `non-approved-${utteranceIndex}`;
    const frames = Array.from({ length: frameCount }, (_, frameIndex) => ({
      utteranceId,
      timestampMs: frameIndex * 120,
      embedding: createPerturbedEmbedding(
        speakerBase,
        random,
        utteranceNoise,
      ),
    }));

    nonApprovedUtterances.push({
      utteranceId,
      speakerId: `synthetic-non-approved-${utteranceIndex % nonApprovedBases.length}`,
      approved: false,
      expectedVoiceGateDecision: "reject",
      frames,
    });
  }

  return measureNonApprovedVoiceFalseAcceptances({
    utterances: nonApprovedUtterances,
    approvedVoices: [approvedVoice],
    config: options && options.config,
  });
}

module.exports = {
  APPROVED_VOICE_RECALL_TARGET_PER_100,
  FALSE_ACCEPTANCE_LIMIT_PER_100,
  RECOGNITION_LATENCY_LIMIT_SECONDS,
  APPROVED_VOICE_RECOGNITION_EVENT_TYPE,
  VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION,
  VOICE_GATE_RECOGNITION_RESULT_SCHEMA,
  DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  VOICE_GATE_DECISION_THRESHOLD,
  DEFAULT_VOICE_GATE_CONFIG,
  QUIET_ROOM_APPROVED_UTTERANCE_COUNT,
  QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT,
  normalizeEmbedding,
  prepareApprovedVoiceProfiles,
  scoreApprovedVoiceCandidates,
  scoreIncomingAudioSampleAgainstApprovedVoices,
  createApprovedVoiceRecognitionEvent,
  createApprovedVoiceGate,
  recognizeApprovedVoiceUtterance,
  measureNonApprovedVoiceFalseAcceptances,
  runQuietRoomApprovedVoiceRecallBaseline,
  runQuietRoomNonApprovedFalseAcceptanceBaseline,
};
