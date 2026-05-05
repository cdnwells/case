import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID,
  DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT,
  VOICE_GATE_EVALUATION_DECISION_PATH,
  VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES,
  VOICE_GATE_PRE_DECISION_DOWNSTREAM_GUARD_ERROR,
  loadVoiceGateEvaluationFixture,
  runVoiceGateEvaluationHarness,
} = require("./voiceGateEvaluationHarness.js");
const { createApprovedVoiceGate } = require("./voiceGate.js");

function createApprovedInlineFixture() {
  return {
    id: "inline-approved-voice-gate-fixture",
    testEnvironment: {
      roomType: "quiet_indoor_room",
      speakingVolume: "normal",
      captureMode: "local_embedding_fixture",
    },
    approvedReferenceVoices: [
      {
        id: "approved-speaker",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
    utterances: [
      {
        utteranceId: "approved-inline",
        speakerId: "approved-speaker",
        approved: true,
        expectedVoiceGateDecision: "accept",
        frames: [
          { utteranceId: "approved-inline", timestampMs: 0, embedding: [1, 0] },
        ],
      },
    ],
  };
}

test("voice-gate evaluation harness loads the 100 utterance fixture", () => {
  const fixture = loadVoiceGateEvaluationFixture();
  const result = runVoiceGateEvaluationHarness();

  assert.equal(fixture.id, DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID);
  assert.equal(
    fixture.utterances.length,
    DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT,
  );
  assert.equal(result.fixtureId, DEFAULT_VOICE_GATE_EVALUATION_FIXTURE_ID);
  assert.equal(
    result.utteranceTotal,
    DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT,
  );
  assert.equal(
    result.evaluatedUtteranceCount,
    DEFAULT_VOICE_GATE_EVALUATION_UTTERANCE_COUNT,
  );
  assert.equal(result.falseAcceptCount, 0);
  assert.equal(result.falseAccepted, 0);
  assert.equal(result.falseAcceptanceCount, 0);
  assert.deepEqual(result.falseAcceptances, []);
  assert.equal(result.decisionPath, VOICE_GATE_EVALUATION_DECISION_PATH);
  assert.equal(result.testEnvironment.roomType, "quiet_indoor_room");
  assert.equal(result.testEnvironment.speakingVolume, "normal");
  assert.equal(result.utteranceEvaluations.length, 100);
  assert.ok(
    result.utteranceEvaluations.every(
      (evaluation) =>
        evaluation.decisionPath === VOICE_GATE_EVALUATION_DECISION_PATH &&
        evaluation.expectedVoiceGateDecision === "reject",
    ),
  );
});

test("voice-gate evaluation harness invokes no transcription, NLU, storage, or rolling-buffer retention", () => {
  const result = runVoiceGateEvaluationHarness();

  assert.deepEqual(
    result.skippedDownstreamStages,
    VOICE_GATE_EVALUATION_SKIPPED_DOWNSTREAM_STAGES,
  );
  assert.deepEqual(result.downstreamInvocationCounts, {
    transcription: 0,
    nlu: 0,
    storage: 0,
    rollingBufferRetention: 0,
  });
  assert.equal(result.downstreamInvoked, false);
  assert.deepEqual(result.downstreamInvocationEvents, []);
});

test("voice-gate evaluation harness fails when speech processing or retention is invoked before a decision", () => {
  const prematureInvocations = [
    {
      name: "speech processing",
      invoke: (guard) =>
        guard.recordSpeechProcessingInvocation({
          downstreamPath: "transcription",
        }),
    },
    {
      name: "retention",
      invoke: (guard) =>
        guard.recordRetentionInvocation({
          downstreamPath: "rollingBufferRetention",
        }),
    },
  ];

  for (const scenario of prematureInvocations) {
    assert.throws(
      () =>
        runVoiceGateEvaluationHarness({
          fixture: createApprovedInlineFixture(),
          createGate({ downstreamInvocationGuard }) {
            return {
              observeFrame() {
                scenario.invoke(downstreamInvocationGuard);
              },
            };
          },
        }),
      new RegExp(VOICE_GATE_PRE_DECISION_DOWNSTREAM_GUARD_ERROR),
      `${scenario.name} before a voice-gate decision must fail`,
    );
  }
});

test("voice-gate evaluation harness counts downstream invocations after an approved decision", () => {
  const result = runVoiceGateEvaluationHarness({
    fixture: createApprovedInlineFixture(),
    createGate(options) {
      const gate = createApprovedVoiceGate(options);

      return {
        observeFrame(frame) {
          const recognitionResult = gate.observeFrame(frame);
          if (recognitionResult.accepted) {
            options.downstreamInvocationGuard.recordSpeechProcessingInvocation({
              downstreamPath: "transcription",
            });
            options.downstreamInvocationGuard.recordRetentionInvocation({
              downstreamPath: "rollingBufferRetention",
              reason: "explicit-user-visible-later-use",
            });
          }
          return recognitionResult;
        },
        reset: () => gate.reset(),
      };
    },
  });

  assert.deepEqual(result.downstreamInvocationCounts, {
    transcription: 1,
    nlu: 0,
    storage: 0,
    rollingBufferRetention: 1,
  });
  assert.equal(result.downstreamInvoked, true);
  assert.deepEqual(result.skippedDownstreamStages, ["nlu", "storage"]);
  assert.deepEqual(
    result.utteranceEvaluations[0].downstreamInvocationCounts,
    result.downstreamInvocationCounts,
  );
  assert.deepEqual(
    result.downstreamInvocationEvents.map((event) => ({
      utteranceId: event.utteranceId,
      stage: event.stage,
      decisionAccepted: event.decisionAccepted,
      matchedVoiceId: event.matchedVoiceId,
    })),
    [
      {
        utteranceId: "approved-inline",
        stage: "transcription",
        decisionAccepted: true,
        matchedVoiceId: "approved-speaker",
      },
      {
        utteranceId: "approved-inline",
        stage: "rollingBufferRetention",
        decisionAccepted: true,
        matchedVoiceId: "approved-speaker",
      },
    ],
  );
});

test("voice-gate evaluation harness feeds each fixture frame through the voice-gate decision path", () => {
  const fixture = {
    id: "inline-voice-gate-fixture",
    testEnvironment: {
      roomType: "quiet_indoor_room",
      speakingVolume: "normal",
      captureMode: "local_embedding_fixture",
    },
    approvedReferenceVoices: [
      {
        id: "approved-speaker",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
    utterances: [
      {
        utteranceId: "approved-inline",
        speakerId: "approved-speaker",
        approved: true,
        expectedVoiceGateDecision: "accept",
        frames: [
          { utteranceId: "approved-inline", timestampMs: 0, embedding: [1, 0] },
          {
            utteranceId: "approved-inline",
            timestampMs: 120,
            embedding: [1, 0],
          },
        ],
      },
      {
        utteranceId: "rejected-inline",
        speakerId: "visitor",
        approved: false,
        expectedVoiceGateDecision: "reject",
        frames: [
          { utteranceId: "rejected-inline", timestampMs: 0, embedding: [0, 1] },
          {
            utteranceId: "rejected-inline",
            timestampMs: 120,
            embedding: [0, 1],
          },
          {
            utteranceId: "rejected-inline",
            timestampMs: 240,
            embedding: [0, 1],
          },
        ],
      },
    ],
  };

  const result = runVoiceGateEvaluationHarness({ fixture });

  assert.equal(result.utteranceTotal, 2);
  assert.equal(result.observedFrameCount, 5);
  assert.equal(result.approvedRecognitionEventCount, 1);
  assert.deepEqual(
    result.utteranceEvaluations.map((evaluation) => ({
      utteranceId: evaluation.utteranceId,
      accepted: evaluation.accepted,
      expectedApprovedVoiceLabels: evaluation.expectedApprovedVoiceLabels,
      matchedExpectedApprovedVoiceLabel:
        evaluation.matchedExpectedApprovedVoiceLabel,
      falseAccepted: evaluation.falseAccepted,
      frameCount: evaluation.frameCount,
      observedFrameCount: evaluation.observedFrameCount,
      recognitionEventCount: evaluation.recognitionEventCount,
      firstAcceptedFrameIndex: evaluation.firstAcceptedFrameIndex,
    })),
    [
      {
        utteranceId: "approved-inline",
        accepted: true,
        expectedApprovedVoiceLabels: ["approved-speaker"],
        matchedExpectedApprovedVoiceLabel: true,
        falseAccepted: false,
        frameCount: 2,
        observedFrameCount: 2,
        recognitionEventCount: 1,
        firstAcceptedFrameIndex: 0,
      },
      {
        utteranceId: "rejected-inline",
        accepted: false,
        expectedApprovedVoiceLabels: [],
        matchedExpectedApprovedVoiceLabel: false,
        falseAccepted: false,
        frameCount: 3,
        observedFrameCount: 3,
        recognitionEventCount: 0,
        firstAcceptedFrameIndex: null,
      },
    ],
  );
  assert.deepEqual(result.downstreamInvocationCounts, {
    transcription: 0,
    nlu: 0,
    storage: 0,
    rollingBufferRetention: 0,
  });
});

test("voice-gate evaluation harness reports aggregate false accepts from expected approved voice labels", () => {
  const fixture = {
    id: "inline-false-accept-accounting-fixture",
    testEnvironment: {
      roomType: "quiet_indoor_room",
      speakingVolume: "normal",
      captureMode: "local_embedding_fixture",
    },
    approvedReferenceVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
      {
        id: "case-family-member",
        approved: true,
        enrolled: true,
        embeddings: [[0, 1]],
      },
    ],
    utterances: [
      {
        utteranceId: "owner-approved",
        speakerId: "case-owner",
        approved: true,
        expectedVoiceGateDecision: "accept",
        frames: [
          {
            utteranceId: "owner-approved",
            timestampMs: 0,
            embedding: [1, 0],
          },
        ],
      },
      {
        utteranceId: "visitor-mimic",
        speakerId: "visitor",
        approved: false,
        expectedVoiceGateDecision: "reject",
        frames: [
          {
            utteranceId: "visitor-mimic",
            timestampMs: 0,
            embedding: [1, 0],
          },
        ],
      },
      {
        utteranceId: "family-explicit-label",
        speakerId: "speaker-alias",
        approved: true,
        expectedApprovedVoiceLabels: ["case-family-member"],
        expectedVoiceGateDecision: "accept",
        frames: [
          {
            utteranceId: "family-explicit-label",
            timestampMs: 0,
            embedding: [0, 1],
          },
        ],
      },
    ],
  };

  const result = runVoiceGateEvaluationHarness({ fixture });

  assert.equal(result.falseAcceptCount, 1);
  assert.equal(result.falseAccepted, 1);
  assert.equal(result.falseAcceptanceCount, 1);
  assert.deepEqual(
    result.utteranceEvaluations.map((evaluation) => ({
      utteranceId: evaluation.utteranceId,
      expectedApprovedVoiceLabels: evaluation.expectedApprovedVoiceLabels,
      accepted: evaluation.accepted,
      matchedVoiceId: evaluation.matchedVoiceId,
      matchedExpectedApprovedVoiceLabel:
        evaluation.matchedExpectedApprovedVoiceLabel,
      falseAccepted: evaluation.falseAccepted,
    })),
    [
      {
        utteranceId: "owner-approved",
        expectedApprovedVoiceLabels: ["case-owner"],
        accepted: true,
        matchedVoiceId: "case-owner",
        matchedExpectedApprovedVoiceLabel: true,
        falseAccepted: false,
      },
      {
        utteranceId: "visitor-mimic",
        expectedApprovedVoiceLabels: [],
        accepted: true,
        matchedVoiceId: "case-owner",
        matchedExpectedApprovedVoiceLabel: false,
        falseAccepted: true,
      },
      {
        utteranceId: "family-explicit-label",
        expectedApprovedVoiceLabels: ["case-family-member"],
        accepted: true,
        matchedVoiceId: "case-family-member",
        matchedExpectedApprovedVoiceLabel: true,
        falseAccepted: false,
      },
    ],
  );
  assert.deepEqual(result.falseAcceptances, [
    {
      utteranceIndex: 1,
      utteranceId: "visitor-mimic",
      speakerId: "visitor",
      expectedApprovedVoiceLabels: [],
      matchedVoiceId: "case-owner",
      matchedApprovedVoiceProfileId: "case-owner",
      matchedApprovedVoiceLabel: "case-owner",
      matchedApprovedVoiceProfileMetadata: {
        id: "case-owner",
        identityId: "case-owner",
        profileId: "case-owner",
        displayName: null,
        label: "case-owner",
        approvalState: "approved",
        approved: true,
        enrolled: true,
      },
      confidence: 1,
      latencyMs: 0,
      reason: "high_confidence_match",
      evaluatedFrameCount: 1,
    },
  ]);
});
