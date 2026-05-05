"use strict";

const QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT = 100;
const QUIET_ROOM_NON_APPROVED_SPEAKER_COUNT = 20;
const QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID =
  "quiet-room-non-approved-voice-evaluation-v1";
const NON_APPROVED_SPEAKER_APPROVAL_LABEL = "non_approved";
const NON_APPROVED_SPEAKER_LABEL = "non_approved_speaker";

const QUIET_ROOM_NON_APPROVED_TEST_ENVIRONMENT = Object.freeze({
  roomType: "quiet_indoor_room",
  speakingVolume: "normal",
  captureMode: "local_embedding_fixture",
});

const QUIET_ROOM_APPROVED_REFERENCE_VOICES = Object.freeze([
  Object.freeze({
    id: "approved-quiet-room-speaker",
    approved: true,
    enrolled: true,
    embeddings: Object.freeze([
      Object.freeze([1, 0, 0]),
      Object.freeze([0.9987, 0.0499, 0]),
    ]),
  }),
]);

function normalizeEmbedding(embedding) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, value) => sum + value * value, 0),
  );

  return embedding.map((value) => roundEmbeddingValue(value / magnitude));
}

function roundEmbeddingValue(value) {
  return Number(value.toFixed(6));
}

function createSpeakerBaseEmbedding(speakerIndex) {
  const approvedAxisSimilarity = 0.5 + (speakerIndex % 5) * 0.035;
  const remainingMagnitude = Math.sqrt(
    1 - approvedAxisSimilarity * approvedAxisSimilarity,
  );
  const phase = speakerIndex * 0.73;

  return normalizeEmbedding([
    approvedAxisSimilarity,
    Math.cos(phase) * remainingMagnitude,
    Math.sin(phase) * remainingMagnitude,
  ]);
}

function createFrameEmbedding(baseEmbedding, utteranceIndex, frameIndex) {
  const utteranceDrift = ((utteranceIndex % 7) - 3) * 0.004;
  const frameDrift = (frameIndex - 2.5) * 0.003;

  return normalizeEmbedding([
    baseEmbedding[0] + utteranceDrift,
    baseEmbedding[1] - frameDrift,
    baseEmbedding[2] + utteranceDrift + frameDrift,
  ]);
}

function createNonApprovedUtterance(utteranceIndex) {
  const speakerIndex =
    utteranceIndex % QUIET_ROOM_NON_APPROVED_SPEAKER_COUNT;
  const speakerNumber = String(speakerIndex + 1).padStart(2, "0");
  const utteranceNumber = String(utteranceIndex + 1).padStart(3, "0");
  const utteranceId = `quiet-room-non-approved-${utteranceNumber}`;
  const speakerId = `non-approved-speaker-${speakerNumber}`;
  const baseEmbedding = createSpeakerBaseEmbedding(speakerIndex);
  const frameCount = utteranceIndex % 11 === 0 ? 4 : 6;

  return Object.freeze({
    utteranceId,
    speakerId,
    speakerApproval: NON_APPROVED_SPEAKER_APPROVAL_LABEL,
    speakerLabel: NON_APPROVED_SPEAKER_LABEL,
    approved: false,
    expectedVoiceGateDecision: "reject",
    environment: QUIET_ROOM_NON_APPROVED_TEST_ENVIRONMENT,
    frames: Object.freeze(
      Array.from({ length: frameCount }, (_, frameIndex) =>
        Object.freeze({
          utteranceId,
          timestampMs: frameIndex * 120,
          embedding: Object.freeze(
            createFrameEmbedding(baseEmbedding, utteranceIndex, frameIndex),
          ),
        }),
      ),
    ),
  });
}

const QUIET_ROOM_NON_APPROVED_UTTERANCES = Object.freeze(
  Array.from(
    { length: QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT },
    (_, utteranceIndex) => createNonApprovedUtterance(utteranceIndex),
  ),
);

const QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE = Object.freeze({
  id: QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  description:
    "Quiet indoor room fixture containing non-approved speaker utterances for false-acceptance evaluation.",
  testEnvironment: QUIET_ROOM_NON_APPROVED_TEST_ENVIRONMENT,
  approvedReferenceVoices: QUIET_ROOM_APPROVED_REFERENCE_VOICES,
  utterances: QUIET_ROOM_NON_APPROVED_UTTERANCES,
});

const NON_APPROVED_VOICE_EVALUATION_FIXTURES_BY_ID = Object.freeze({
  [QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID]:
    QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE,
});

function listNonApprovedVoiceEvaluationFixtureIds() {
  return Object.freeze(Object.keys(NON_APPROVED_VOICE_EVALUATION_FIXTURES_BY_ID));
}

function loadNonApprovedVoiceEvaluationFixture(
  fixtureId = QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
) {
  const fixture = NON_APPROVED_VOICE_EVALUATION_FIXTURES_BY_ID[fixtureId];

  if (!fixture) {
    throw new Error(`unknown non-approved voice evaluation fixture: ${fixtureId}`);
  }

  return fixture;
}

module.exports = {
  QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT,
  QUIET_ROOM_NON_APPROVED_SPEAKER_COUNT,
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  NON_APPROVED_SPEAKER_APPROVAL_LABEL,
  NON_APPROVED_SPEAKER_LABEL,
  QUIET_ROOM_NON_APPROVED_TEST_ENVIRONMENT,
  QUIET_ROOM_APPROVED_REFERENCE_VOICES,
  QUIET_ROOM_NON_APPROVED_UTTERANCES,
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE,
  NON_APPROVED_VOICE_EVALUATION_FIXTURES_BY_ID,
  listNonApprovedVoiceEvaluationFixtureIds,
  loadNonApprovedVoiceEvaluationFixture,
};
