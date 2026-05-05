"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  APPROVED_VOICE_RECOGNITION_EVENT_TYPE,
  DEFAULT_VOICE_GATE_CONFIG,
  DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  QUIET_ROOM_APPROVED_UTTERANCE_COUNT,
  QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT,
  VOICE_GATE_DECISION_THRESHOLD,
  VOICE_GATE_RECOGNITION_RESULT_SCHEMA,
  VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION,
  createApprovedVoiceRecognitionEvent,
  createApprovedVoiceGate,
  measureNonApprovedVoiceFalseAcceptances,
  recognizeApprovedVoiceUtterance,
  runQuietRoomApprovedVoiceRecallBaseline,
  runQuietRoomNonApprovedFalseAcceptanceBaseline,
  scoreApprovedVoiceCandidates,
  scoreIncomingAudioSampleAgainstApprovedVoices,
} = require("./voiceGate");
const {
  createApprovedVoiceProfileStore,
  toVoiceGateApprovedVoiceProfiles,
} = require("./approvedVoiceProfiles");
const {
  NON_APPROVED_SPEAKER_APPROVAL_LABEL,
  NON_APPROVED_SPEAKER_LABEL,
  QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT,
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE,
  listNonApprovedVoiceEvaluationFixtureIds,
  loadNonApprovedVoiceEvaluationFixture,
} = require("./nonApprovedVoiceEvaluationFixture");

function assertRejectedWithoutApprovedIdentity(result, expectedReason) {
  assert.equal(result.accepted, false);
  assert.equal(result.matchedVoiceId, null);
  assert.equal(result.matchedApprovedVoiceProfileId, null);
  assert.equal(result.matchedApprovedVoiceLabel, null);
  assert.equal(result.matchedApprovedVoiceProfileMetadata, null);
  assert.equal(result.recognizedAtMs, null);
  assert.equal(result.downstreamAuthorization, null);
  assert.equal(result.bestCandidateScore, null);
  assert.equal(result.bestApprovedVoiceId, null);
  assert.equal(result.bestApprovedVoiceScore, null);
  assert.deepEqual(result.candidateScores, []);
  if (expectedReason) assert.equal(result.reason, expectedReason);
}

test("quiet-room approved voice recall baseline recognizes at least 90 of 100 utterances", () => {
  const baseline = runQuietRoomApprovedVoiceRecallBaseline();

  assert.equal(baseline.approvedTotal, QUIET_ROOM_APPROVED_UTTERANCE_COUNT);
  assert.deepEqual(
    baseline.testEnvironment,
    QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT,
  );
  assert.equal(baseline.testEnvironment.roomType, "quiet_indoor_room");
  assert.equal(baseline.testEnvironment.speakingVolume, "normal");
  assert.ok(
    baseline.approvedRecognized >= 90,
    `recognized ${baseline.approvedRecognized}/100 approved utterances`,
  );
  assert.equal(baseline.passedRecall, true);
  assert.equal(baseline.passedLatency, true);
});

test("quiet-room non-approved voice baseline false-accepts no more than 5 of 100 utterances", () => {
  const baseline = runQuietRoomNonApprovedFalseAcceptanceBaseline();

  assert.equal(baseline.nonApprovedTotal, 100);
  assert.ok(
    baseline.falseAccepted <= 5,
    `false-accepted ${baseline.falseAccepted}/100 non-approved utterances`,
  );
  assert.equal(baseline.passedFalseAcceptance, true);
});

test("false-accept measurement counts non-approved utterances allowed through the voice gate", () => {
  const measurement = measureNonApprovedVoiceFalseAcceptances({
    approvedVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
    utterances: [
      {
        utteranceId: "non-approved-mimic",
        speakerId: "visitor",
        approved: false,
        expectedVoiceGateDecision: "reject",
        frames: [
          {
            utteranceId: "non-approved-mimic",
            timestampMs: 0,
            embedding: [1, 0],
          },
        ],
      },
      {
        utteranceId: "non-approved-rejected",
        speakerId: "neighbor",
        approved: false,
        expectedVoiceGateDecision: "reject",
        frames: [
          {
            utteranceId: "non-approved-rejected",
            timestampMs: 0,
            embedding: [0, 1],
          },
        ],
      },
      {
        utteranceId: "approved-control",
        speakerId: "case-owner",
        approved: true,
        expectedVoiceGateDecision: "accept",
        frames: [
          {
            utteranceId: "approved-control",
            timestampMs: 0,
            embedding: [1, 0],
          },
        ],
      },
    ],
  });

  assert.equal(measurement.nonApprovedTotal, 2);
  assert.equal(measurement.falseAccepted, 1);
  assert.equal(measurement.falseAcceptanceCount, 1);
  assert.equal(measurement.allowedFalseAcceptances, 0);
  assert.equal(measurement.passedFalseAcceptance, false);
  assert.deepEqual(
    measurement.falseAcceptances.map((falseAcceptance) => ({
      utteranceId: falseAcceptance.utteranceId,
      speakerId: falseAcceptance.speakerId,
      matchedVoiceId: falseAcceptance.matchedVoiceId,
    })),
    [
      {
        utteranceId: "non-approved-mimic",
        speakerId: "visitor",
        matchedVoiceId: "case-owner",
      },
    ],
  );
});

test("false-accept measurement uses actual voice-gate decisions instead of expected labels", () => {
  const measurement = measureNonApprovedVoiceFalseAcceptances({
    approvedVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
    utterances: [
      {
        utteranceId: "mislabeled-non-approved-mimic",
        speakerId: "visitor",
        approved: false,
        expectedVoiceGateDecision: "accept",
        frames: [
          {
            utteranceId: "mislabeled-non-approved-mimic",
            timestampMs: 0,
            embedding: [1, 0],
          },
        ],
      },
    ],
  });

  assert.equal(measurement.nonApprovedTotal, 1);
  assert.equal(measurement.falseAccepted, 1);
  assert.equal(measurement.measuredUtterances[0].accepted, true);
  assert.equal(
    measurement.falseAcceptances[0].utteranceId,
    "mislabeled-non-approved-mimic",
  );
});

test("quiet-room non-approved fixture measurement counts loaded fixture utterance false accepts", () => {
  const fixture = loadNonApprovedVoiceEvaluationFixture(
    QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  );
  const measurement = measureNonApprovedVoiceFalseAcceptances(
    fixture,
  );

  assert.equal(fixture.id, QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID);
  assert.equal(measurement.nonApprovedTotal, 100);
  assert.equal(measurement.falseAccepted, 0);
  assert.equal(measurement.falseAcceptanceRatePer100, 0);
  assert.equal(measurement.passedFalseAcceptance, true);
  assert.equal(measurement.measuredUtterances.length, 100);
  assert.equal(measurement.falseAcceptances.length, 0);
});

test("tuned default threshold keeps near-miss non-approved utterances under the false-acceptance limit", () => {
  const approvedVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0]],
    },
  ];
  const createEmbeddingAtSimilarity = (similarity) => [
    similarity,
    Math.sqrt(1 - similarity * similarity),
  ];
  const utterances = Array.from({ length: 100 }, (_, utteranceIndex) => {
    const nearMissSimilarity = utteranceIndex < 6 ? 0.82 : 0.5;
    const utteranceId = `threshold-tuned-non-approved-${utteranceIndex}`;

    return {
      utteranceId,
      speakerId: `threshold-tuned-speaker-${utteranceIndex}`,
      approved: false,
      expectedVoiceGateDecision: "reject",
      frames: Array.from({ length: 3 }, (_, frameIndex) => ({
        utteranceId,
        timestampMs: frameIndex * 120,
        embedding: createEmbeddingAtSimilarity(nearMissSimilarity),
      })),
    };
  });

  const measurement = measureNonApprovedVoiceFalseAcceptances({
    approvedVoices,
    utterances,
  });

  assert.equal(DEFAULT_VOICE_GATE_DECISION_THRESHOLD, 0.95);
  assert.equal(DEFAULT_VOICE_GATE_CONFIG.averageConfidenceThreshold, 0.89);
  assert.equal(DEFAULT_VOICE_GATE_CONFIG.recallConfidenceThreshold, 0.83);
  assert.equal(measurement.nonApprovedTotal, 100);
  assert.equal(measurement.allowedFalseAcceptances, 5);
  assert.ok(
    measurement.falseAccepted <= 5,
    `false-accepted ${measurement.falseAccepted}/100 near-miss non-approved utterances`,
  );
  assert.equal(measurement.passedFalseAcceptance, true);
});

test("quiet-room non-approved voice evaluation fixture contains exactly 100 non-approved utterances", () => {
  const { approvedReferenceVoices, testEnvironment, utterances } =
    QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE;
  const approvedReferenceVoiceIds = new Set(
    approvedReferenceVoices.map((voice) => voice.id),
  );
  const utteranceIds = new Set();
  const speakerIds = new Set();

  assert.deepEqual(listNonApprovedVoiceEvaluationFixtureIds(), [
    QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  ]);
  assert.equal(
    loadNonApprovedVoiceEvaluationFixture(),
    QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE,
  );
  assert.equal(testEnvironment.roomType, "quiet_indoor_room");
  assert.equal(testEnvironment.speakingVolume, "normal");
  assert.equal(QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT, 100);
  assert.equal(
    utterances.length,
    QUIET_ROOM_NON_APPROVED_UTTERANCE_COUNT,
    `fixture includes ${utterances.length} non-approved utterances`,
  );

  for (const utterance of utterances) {
    utteranceIds.add(utterance.utteranceId);
    speakerIds.add(utterance.speakerId);

    assert.equal(utterance.approved, false);
    assert.equal(approvedReferenceVoiceIds.has(utterance.speakerId), false);
    assert.equal(
      utterance.speakerApproval,
      NON_APPROVED_SPEAKER_APPROVAL_LABEL,
    );
    assert.equal(utterance.speakerLabel, NON_APPROVED_SPEAKER_LABEL);
    assert.equal(utterance.expectedVoiceGateDecision, "reject");
    assert.ok(utterance.speakerId.startsWith("non-approved-speaker-"));
    assert.ok(Array.isArray(utterance.frames));
    assert.ok(utterance.frames.length > 0);
    assert.ok(
      utterance.frames.every(
        (frame) =>
          frame.utteranceId === utterance.utteranceId &&
          Array.isArray(frame.embedding) &&
          frame.embedding.length > 0,
      ),
    );
  }

  assert.equal(utteranceIds.size, utterances.length);
  assert.ok(speakerIds.size > 1);
});

test("voice gate supports multiple approved voices", () => {
  const approvedVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [
        [0.94, 0.2, 0.1],
        [0.9, 0.25, 0.12],
      ],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [
        [0.1, 0.91, 0.25],
        [0.12, 0.88, 0.28],
      ],
    },
  ];

  const ownerResult = recognizeApprovedVoiceUtterance(
    [
      { utteranceId: "owner", timestampMs: 0, embedding: [0.95, 0.18, 0.08] },
      { utteranceId: "owner", timestampMs: 120, embedding: [0.92, 0.22, 0.11] },
    ],
    approvedVoices,
  );
  const familyResult = recognizeApprovedVoiceUtterance(
    [
      { utteranceId: "family", timestampMs: 0, embedding: [0.08, 0.9, 0.24] },
      { utteranceId: "family", timestampMs: 120, embedding: [0.13, 0.88, 0.27] },
    ],
    approvedVoices,
  );

  assert.equal(ownerResult.accepted, true);
  assert.equal(ownerResult.matchedVoiceId, "case-owner");
  assert.equal(familyResult.accepted, true);
  assert.equal(familyResult.matchedVoiceId, "case-family-member");
});

test("recognition result includes the matched approved voice profile id and human-readable label", () => {
  const approvedVoices = [
    {
      id: "owner-voice-identity",
      profileId: "owner-profile",
      displayName: "Case Owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "family-voice-identity",
      profileId: "family-profile",
      label: "Family member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
  ];

  const ownerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    approvedVoices,
  );
  const familyResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    approvedVoices,
  );
  const rejectedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unknown",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    approvedVoices,
  );
  const ownerEvent = createApprovedVoiceRecognitionEvent(ownerResult, {
    recognizedAtMs: 1_700_000_000_000,
  });

  assert.equal(ownerResult.accepted, true);
  assert.equal(ownerResult.matchedVoiceId, "owner-voice-identity");
  assert.equal(ownerResult.matchedApprovedVoiceProfileId, "owner-profile");
  assert.equal(ownerResult.matchedApprovedVoiceLabel, "Case Owner");
  assert.deepEqual(ownerResult.matchedApprovedVoiceProfileMetadata, {
    id: "owner-voice-identity",
    identityId: "owner-voice-identity",
    profileId: "owner-profile",
    displayName: "Case Owner",
    label: "Case Owner",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
  assert.equal(
    "embeddings" in ownerResult.matchedApprovedVoiceProfileMetadata,
    false,
  );
  assert.equal(
    "voiceprintData" in ownerResult.matchedApprovedVoiceProfileMetadata,
    false,
  );
  assert.equal(ownerEvent.matchedApprovedVoiceProfileId, "owner-profile");
  assert.equal(ownerEvent.matchedApprovedVoiceLabel, "Case Owner");
  assert.deepEqual(
    ownerEvent.matchedApprovedVoiceProfileMetadata,
    ownerResult.matchedApprovedVoiceProfileMetadata,
  );
  assert.equal(familyResult.accepted, true);
  assert.equal(
    familyResult.matchedApprovedVoiceProfileId,
    "family-profile",
  );
  assert.equal(familyResult.matchedApprovedVoiceLabel, "Family member");
  assert.deepEqual(familyResult.matchedApprovedVoiceProfileMetadata, {
    id: "family-voice-identity",
    identityId: "family-voice-identity",
    profileId: "family-profile",
    displayName: "Family member",
    label: "Family member",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
  assert.equal(rejectedResult.accepted, false);
  assert.equal(rejectedResult.matchedApprovedVoiceProfileId, null);
  assert.equal(rejectedResult.matchedApprovedVoiceLabel, null);
  assert.equal(rejectedResult.matchedApprovedVoiceProfileMetadata, null);
});

test("recognition result label falls back to the matched approved voice profile id", () => {
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "roommate",
        timestampMs: 0,
        embedding: [1, 0],
      },
    ],
    [
      {
        id: "roommate-voice-identity",
        profileId: "roommate-profile",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
  );

  assert.equal(result.accepted, true);
  assert.equal(result.matchedApprovedVoiceProfileId, "roommate-profile");
  assert.equal(result.matchedApprovedVoiceLabel, "roommate-profile");
  assert.deepEqual(result.matchedApprovedVoiceProfileMetadata, {
    id: "roommate-voice-identity",
    identityId: "roommate-voice-identity",
    profileId: "roommate-profile",
    displayName: null,
    label: "roommate-profile",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
});

test("verification confirms two distinct enrolled approved voices are allowed while an unenrolled voice is rejected", () => {
  const configuredVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      embeddings: [[0, 0, 1]],
    },
  ];
  const enrolledApprovedVoiceIds = configuredVoices
    .filter((voice) => voice.approved === true && voice.enrolled === true)
    .map((voice) => voice.id);
  const acceptedUtterances = [
    {
      expectedVoiceId: "case-owner",
      frames: [
        {
          utteranceId: "owner-approved",
          timestampMs: 0,
          embedding: [1, 0, 0],
        },
      ],
    },
    {
      expectedVoiceId: "case-family-member",
      frames: [
        {
          utteranceId: "family-approved",
          timestampMs: 0,
          embedding: [0, 1, 0],
        },
      ],
    },
  ];
  const results = acceptedUtterances.map((utterance) => ({
    expectedVoiceId: utterance.expectedVoiceId,
    result: recognizeApprovedVoiceUtterance(
      utterance.frames,
      configuredVoices,
    ),
  }));
  const unenrolledResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unenrolled-relative",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
      {
        utteranceId: "unenrolled-relative",
        timestampMs: 120,
        embedding: [0, 0.01, 0.99],
      },
    ],
    configuredVoices,
  );

  assert.equal(new Set(enrolledApprovedVoiceIds).size, 2);
  assert.equal(
    configuredVoices.some(
      (voice) =>
        voice.id === "unenrolled-relative" && voice.enrolled === false,
    ),
    true,
  );
  assert.equal(
    configuredVoices
      .filter((voice) => voice.id !== "unenrolled-relative")
      .every(
        (voice) => voice.approved === true && voice.enrolled === true,
      ),
    true,
  );

  for (const { expectedVoiceId, result } of results) {
    assert.equal(result.accepted, true);
    assert.equal(result.matchedVoiceId, expectedVoiceId);
    assert.equal(result.downstreamAuthorization.authorized, true);
    assert.equal(
      result.downstreamAuthorization.matchedVoiceId,
      expectedVoiceId,
    );
    assert.ok((result.latencyMs || 0) < 1_000);
    assert.deepEqual(
      result.candidateScores.map((candidateScore) => candidateScore.profileId),
      enrolledApprovedVoiceIds,
    );
  }

  assert.deepEqual(
    results.map(({ result }) => result.matchedVoiceId),
    enrolledApprovedVoiceIds,
  );
  assertRejectedWithoutApprovedIdentity(
    unenrolledResult,
    "below_threshold",
  );
  assert.equal(unenrolledResult.rejectedVoiceId, null);
});

test("multi-speaker enrolled profiles produce distinct matched profile metadata", () => {
  const enrolledProfileStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_700_000_000_000,
    approvedVoices: [
      {
        id: "owner-profile",
        voiceId: "owner-phone-speaker",
        displayName: "Owner phone",
        approvalState: "approved",
        voiceprintData: [
          {
            id: "owner-phone-speaker:enrollment:1",
            vector: [1, 0, 0],
          },
        ],
      },
      {
        id: "family-profile",
        voiceId: "family-tablet-speaker",
        displayName: "Family tablet",
        approvalState: "approved",
        voiceprintData: [
          {
            id: "family-tablet-speaker:enrollment:1",
            vector: [0, 1, 0],
          },
        ],
      },
    ],
  });
  const approvedProfiles =
    toVoiceGateApprovedVoiceProfiles(enrolledProfileStore);
  const ownerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-speaker",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    approvedProfiles,
  );
  const familyResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-speaker",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    approvedProfiles,
  );
  const ownerMetadata = {
    id: "owner-phone-speaker",
    identityId: "owner-phone-speaker",
    profileId: "owner-profile",
    displayName: "Owner phone",
    label: "Owner phone",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  };
  const familyMetadata = {
    id: "family-tablet-speaker",
    identityId: "family-tablet-speaker",
    profileId: "family-profile",
    displayName: "Family tablet",
    label: "Family tablet",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  };
  const ownerEvent = createApprovedVoiceRecognitionEvent(ownerResult, {
    recognizedAtMs: 1_700_000_100_000,
  });
  const familyEvent = createApprovedVoiceRecognitionEvent(familyResult, {
    recognizedAtMs: 1_700_000_200_000,
  });

  assert.deepEqual(
    approvedProfiles.map((profile) => ({
      id: profile.id,
      profileId: profile.profileId,
      displayName: profile.displayName,
    })),
    [
      {
        id: "owner-phone-speaker",
        profileId: "owner-profile",
        displayName: "Owner phone",
      },
      {
        id: "family-tablet-speaker",
        profileId: "family-profile",
        displayName: "Family tablet",
      },
    ],
  );
  assert.equal(ownerResult.accepted, true);
  assert.equal(ownerResult.matchedVoiceId, "owner-phone-speaker");
  assert.equal(ownerResult.matchedApprovedVoiceProfileId, "owner-profile");
  assert.deepEqual(
    ownerResult.matchedApprovedVoiceProfileMetadata,
    ownerMetadata,
  );
  assert.equal(familyResult.accepted, true);
  assert.equal(familyResult.matchedVoiceId, "family-tablet-speaker");
  assert.equal(familyResult.matchedApprovedVoiceProfileId, "family-profile");
  assert.deepEqual(
    familyResult.matchedApprovedVoiceProfileMetadata,
    familyMetadata,
  );
  assert.notDeepEqual(
    ownerResult.matchedApprovedVoiceProfileMetadata,
    familyResult.matchedApprovedVoiceProfileMetadata,
  );
  assert.deepEqual(
    ownerResult.candidateScores.map((candidateScore) => candidateScore.profileId),
    ["owner-phone-speaker", "family-tablet-speaker"],
  );
  assert.deepEqual(
    familyResult.candidateScores.map(
      (candidateScore) => candidateScore.profileId,
    ),
    ["owner-phone-speaker", "family-tablet-speaker"],
  );
  assert.equal(
    "embeddings" in ownerResult.matchedApprovedVoiceProfileMetadata,
    false,
  );
  assert.equal(
    "voiceprintData" in ownerResult.matchedApprovedVoiceProfileMetadata,
    false,
  );
  assert.deepEqual(
    ownerEvent.matchedApprovedVoiceProfileMetadata,
    ownerMetadata,
  );
  assert.deepEqual(
    familyEvent.matchedApprovedVoiceProfileMetadata,
    familyMetadata,
  );
  assert.notDeepEqual(
    ownerEvent.matchedApprovedVoiceProfileMetadata,
    familyEvent.matchedApprovedVoiceProfileMetadata,
  );
});

test("voice gate matcher candidates include only approved enrolled profiles", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0, 0, 1]],
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      embeddings: [[0.55, 0.55, 0.62]],
    },
    {
      id: "disabled-guest",
      enabled: false,
      approved: true,
      enrolled: true,
      embeddings: [[0.42, 0.14, 0.9]],
    },
  ];
  const gate = createApprovedVoiceGate({ approvedVoices: profiles });

  const unapprovedSpeakerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "neighbor",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    profiles,
  );
  const approvedSpeakerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    profiles,
  );

  assert.equal(gate.getApprovedVoiceCount(), 2);
  assert.equal(unapprovedSpeakerResult.accepted, false);
  assert.equal(unapprovedSpeakerResult.matchedVoiceId, null);
  assert.equal(approvedSpeakerResult.accepted, true);
  assert.equal(approvedSpeakerResult.matchedVoiceId, "case-owner");
});

test("voice gate does not authorize unmarked runtime profiles", () => {
  const profiles = [
    {
      id: "legacy-unmarked-profile",
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
  ];

  const unmarkedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unmarked",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    profiles,
  );
  const approvedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "approved",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    profiles,
  );

  assert.equal(unmarkedResult.accepted, false);
  assert.equal(unmarkedResult.matchedVoiceId, null);
  assert.equal(approvedResult.accepted, true);
  assert.equal(approvedResult.matchedVoiceId, "case-owner");
});

test("voice gate rejects unknown speakers that do not match approved voices", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
  ];

  const unknownSpeakerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unknown-speaker",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
      {
        utteranceId: "unknown-speaker",
        timestampMs: 120,
        embedding: [0.04, 0.03, 0.99],
      },
      {
        utteranceId: "unknown-speaker",
        timestampMs: 240,
        embedding: [0.02, 0.05, 0.98],
      },
    ],
    profiles,
  );

  assertRejectedWithoutApprovedIdentity(
    unknownSpeakerResult,
    "below_threshold",
  );
  assert.equal(unknownSpeakerResult.rejectedVoiceId, null);
});

test("voice gate rejects an unenrolled unknown voice as unauthorized", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "unenrolled-unknown-speaker",
      approved: true,
      enrolled: false,
      embeddings: [[0, 1, 0]],
    },
  ];

  const unenrolledUnknownResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unenrolled-unknown-speaker",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
      {
        utteranceId: "unenrolled-unknown-speaker",
        timestampMs: 120,
        embedding: [0.01, 0.99, 0],
      },
    ],
    profiles,
  );

  assertRejectedWithoutApprovedIdentity(
    unenrolledUnknownResult,
    "below_threshold",
  );
  assert.equal(unenrolledUnknownResult.rejectedVoiceId, null);
});

test("voice gate does not evaluate enrolled voices that are not approved before processing", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
  ];

  const unapprovedSpeakerResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unapproved-speaker",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
      {
        utteranceId: "unapproved-speaker",
        timestampMs: 120,
        embedding: [0.01, 0.99, 0],
      },
    ],
    profiles,
  );

  assertRejectedWithoutApprovedIdentity(
    unapprovedSpeakerResult,
    "below_threshold",
  );
  assert.equal(unapprovedSpeakerResult.rejectedVoiceId, null);
  assert.ok(unapprovedSpeakerResult.latencyMs < 1000);
});

test("voice gate loads no recognition candidates when only unapproved voices are configured", () => {
  const unapprovedOnlyResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unapproved-only",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    [
      {
        id: "unapproved-neighbor",
        approved: false,
        enrolled: true,
        embeddings: [[0, 1, 0]],
      },
    ],
  );

  assertRejectedWithoutApprovedIdentity(
    unapprovedOnlyResult,
    "no_approved_voices",
  );
  assert.equal(unapprovedOnlyResult.rejectedVoiceId, null);
});

test("recognition rejects unenrolled and unapproved voices without returning an approved identity", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
  ];

  const unenrolledResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unenrolled-relative",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    [profiles[0], profiles[1]],
  );
  const unapprovedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unapproved-neighbor",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    [profiles[0], profiles[2]],
  );

  assertRejectedWithoutApprovedIdentity(
    unenrolledResult,
    "below_threshold",
  );
  assert.equal(unenrolledResult.rejectedVoiceId, null);
  assertRejectedWithoutApprovedIdentity(
    unapprovedResult,
    "below_threshold",
  );
  assert.equal(unapprovedResult.rejectedVoiceId, null);
});

test("voice gate never reads non-approved profile embeddings while preparing recognition candidates", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      get embeddings() {
        throw new Error("non-approved embeddings must not be loaded");
      },
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      get embeddings() {
        throw new Error("unenrolled embeddings must not be loaded");
      },
    },
  ];

  const candidateScores = scoreApprovedVoiceCandidates([0, 1, 0], profiles);
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "non-approved-speaker",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    profiles,
  );

  assert.deepEqual(
    candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner"],
  );
  assertRejectedWithoutApprovedIdentity(result, "below_threshold");
  assert.equal(result.rejectedVoiceId, null);
});

test("voice gate matcher scores every approved enrolled candidate profile", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "case-roommate",
      approved: true,
      enrolled: true,
      embeddings: [[0, 0, 1]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0.58, 0.58, 0.58]],
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      embeddings: [[0.42, 0.42, 0.81]],
    },
  ];

  const candidateScores = scoreApprovedVoiceCandidates(
    [0.98, 0.18, 0.08],
    profiles,
  );
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner",
        timestampMs: 0,
        embedding: [0.98, 0.18, 0.08],
      },
    ],
    profiles,
  );

  assert.deepEqual(
    candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(candidateScores.length, 3);
  assert.ok(
    candidateScores.every((candidateScore) =>
      Number.isFinite(candidateScore.score),
    ),
  );
  assert.deepEqual(
    result.candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(result.candidateScores.length, 3);
  assert.equal(result.bestApprovedVoiceId, "case-owner");
  assert.equal(result.bestCandidateScore.profileId, "case-owner");
  assert.equal(
    result.bestApprovedVoiceScore,
    result.bestCandidateScore.score,
  );
  assert.equal(result.matchedVoiceId, "case-owner");
});

test("recognition matching evaluates all approved enrolled profiles and accepts any matching approved profile", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0, 0]],
    },
    {
      id: "case-roommate",
      approved: true,
      enrolled: true,
      embeddings: [[0, 0, 1, 0]],
    },
    {
      id: "unapproved-visitor",
      approved: false,
      enrolled: true,
      embeddings: [[0, 0, 1, 0]],
    },
  ];
  const incomingRoommateSample = {
    utteranceId: "roommate-approved",
    timestampMs: 0,
    embedding: [0, 0, 1, 0],
  };

  const sampleScore = scoreIncomingAudioSampleAgainstApprovedVoices(
    incomingRoommateSample,
    profiles,
  );
  const result = recognizeApprovedVoiceUtterance(
    [incomingRoommateSample],
    profiles,
  );

  assert.deepEqual(
    sampleScore.candidateScores.map(
      (candidateScore) => candidateScore.profileId,
    ),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(
    result.candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(sampleScore.bestApprovedVoiceId, "case-roommate");
  assert.equal(result.accepted, true);
  assert.equal(result.matchedVoiceId, "case-roommate");
  assert.equal(
    result.downstreamAuthorization.matchedVoiceId,
    "case-roommate",
  );
  assert.ok((result.latencyMs || 0) < 1_000);
});

test("voice gate recognition checks later approved profiles when the highest transient score is not authorized", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "case-roommate",
      approved: true,
      enrolled: true,
      embeddings: [[0, 0, 1]],
    },
  ];
  const ownerTransientSimilarity = 0.94;
  const roommateSustainedSimilarity = 0.87;
  const roommateCrossAxis = Math.sqrt(
    (1 - roommateSustainedSimilarity * roommateSustainedSimilarity) / 2,
  );
  const roommateFrame = [
    roommateCrossAxis,
    roommateCrossAxis,
    roommateSustainedSimilarity,
  ];
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "roommate-with-owner-transient",
        timestampMs: 0,
        embedding: [
          ownerTransientSimilarity,
          Math.sqrt(1 - ownerTransientSimilarity * ownerTransientSimilarity),
          0,
        ],
      },
      {
        utteranceId: "roommate-with-owner-transient",
        timestampMs: 120,
        embedding: roommateFrame,
      },
      {
        utteranceId: "roommate-with-owner-transient",
        timestampMs: 240,
        embedding: roommateFrame,
      },
      {
        utteranceId: "roommate-with-owner-transient",
        timestampMs: 360,
        embedding: roommateFrame,
      },
    ],
    profiles,
    {
      voiceGateDecisionThreshold: 0.99,
      averageConfidenceThreshold: 0.86,
      recallConfidenceThreshold: 0.86,
      minAverageFrames: 3,
      minRecallFrames: 3,
      topFrameCount: 3,
    },
  );
  const ownerCandidateScore = result.candidateScores.find(
    (candidateScore) => candidateScore.profileId === "case-owner",
  );
  const roommateCandidateScore = result.candidateScores.find(
    (candidateScore) => candidateScore.profileId === "case-roommate",
  );

  assert.equal(result.accepted, true);
  assert.deepEqual(
    result.candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.ok(ownerCandidateScore);
  assert.ok(roommateCandidateScore);
  assert.ok(ownerCandidateScore.score > roommateCandidateScore.score);
  assert.equal(result.bestApprovedVoiceId, "case-owner");
  assert.equal(result.matchedVoiceId, "case-roommate");
  assert.equal(result.reason, "average_confidence_match");
  assert.equal(
    result.downstreamAuthorization.matchedVoiceId,
    "case-roommate",
  );
  assert.ok(result.latencyMs < 1000);
});

test("voice gate sample scorer compares one incoming sample against every approved enrolled voice and reports the best score", () => {
  const profiles = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
    {
      id: "case-family-member",
      approved: true,
      enrolled: true,
      embeddings: [[0, 1, 0]],
    },
    {
      id: "case-roommate",
      approved: true,
      enrolled: true,
      embeddings: [[0, 0, 1]],
    },
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0.58, 0.58, 0.58]],
    },
    {
      id: "unenrolled-relative",
      approved: true,
      enrolled: false,
      embeddings: [[0.42, 0.42, 0.81]],
    },
  ];

  const sampleScore = scoreIncomingAudioSampleAgainstApprovedVoices(
    {
      utteranceId: "incoming-sample",
      timestampMs: 120,
      embedding: [0, 0.8, 0.6],
    },
    profiles,
  );

  assert.deepEqual(
    sampleScore.candidateScores.map(
      (candidateScore) => candidateScore.profileId,
    ),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(sampleScore.bestCandidateScore, {
    profileId: "case-family-member",
    score: 0.8,
  });
  assert.equal(sampleScore.bestApprovedVoiceId, "case-family-member");
  assert.equal(sampleScore.bestApprovedVoiceScore, 0.8);
});

test("voice gate sample scorer returns no best approved score for unusable incoming samples", () => {
  const sampleScore = scoreIncomingAudioSampleAgainstApprovedVoices(
    [],
    [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
  );

  assert.deepEqual(sampleScore.candidateScores, [
    {
      profileId: "case-owner",
      score: null,
    },
  ]);
  assert.equal(sampleScore.bestCandidateScore, null);
  assert.equal(sampleScore.bestApprovedVoiceId, null);
  assert.equal(sampleScore.bestApprovedVoiceScore, null);
});

test("voice gate matcher applies configured threshold and returns approved identity for any matching candidate", () => {
  const profiles = [
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
  ];
  const strictThresholdConfig = {
    voiceGateDecisionThreshold: 1,
    minAverageFrames: 2,
    minRecallFrames: 2,
  };

  const belowThresholdResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "below-threshold-family",
        timestampMs: 0,
        embedding: [0.6, 0.8],
      },
    ],
    profiles,
    strictThresholdConfig,
  );
  const matchingResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "threshold-family",
        timestampMs: 0,
        embedding: [0, 1],
      },
    ],
    profiles,
    strictThresholdConfig,
  );
  const familyCandidateScore = matchingResult.candidateScores.find(
    (candidateScore) => candidateScore.profileId === "case-family-member",
  );

  assert.equal(belowThresholdResult.accepted, false);
  assert.equal(belowThresholdResult.matchedVoiceId, null);
  assert.equal(belowThresholdResult.downstreamAuthorization, null);
  assert.equal(matchingResult.accepted, true);
  assert.equal(matchingResult.matchedVoiceId, "case-family-member");
  assert.equal(matchingResult.reason, "high_confidence_match");
  assert.deepEqual(matchingResult.downstreamAuthorization, {
    authorized: true,
    matchedVoiceId: "case-family-member",
    score: 1,
    threshold: 1,
    decisionRule: "high_confidence_match",
    supportingFrameCount: 1,
    requiredFrameCount: 1,
  });
  assert.ok(familyCandidateScore);
  assert.equal(familyCandidateScore.topScore, 1);
  assert.ok(
    familyCandidateScore.score >=
      strictThresholdConfig.voiceGateDecisionThreshold,
  );
});

test("voice gate accepts a speech segment when any approved enrolled profile reaches the configured match threshold", () => {
  const configuredMatchThreshold = 0.92;
  const profiles = [
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
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [[0, 1]],
    },
  ];
  const thresholdFamilyEmbedding = [
    Math.sqrt(1 - configuredMatchThreshold * configuredMatchThreshold),
    configuredMatchThreshold,
  ];
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-at-threshold",
        timestampMs: 0,
        embedding: thresholdFamilyEmbedding,
      },
    ],
    profiles,
    {
      voiceGateDecisionThreshold: configuredMatchThreshold,
      averageConfidenceThreshold: 1,
      recallConfidenceThreshold: 1,
      minAverageFrames: 2,
      minRecallFrames: 2,
    },
  );
  const familyCandidateScore = result.candidateScores.find(
    (candidateScore) => candidateScore.profileId === "case-family-member",
  );

  assert.equal(result.accepted, true);
  assert.equal(result.matchedVoiceId, "case-family-member");
  assert.equal(result.reason, "high_confidence_match");
  assert.deepEqual(
    result.candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member"],
  );
  assert.ok(familyCandidateScore);
  assert.ok(familyCandidateScore.topScore >= configuredMatchThreshold);
  assert.equal(
    result.downstreamAuthorization.matchedVoiceId,
    result.matchedVoiceId,
  );
  assert.equal(
    result.downstreamAuthorization.threshold,
    configuredMatchThreshold,
  );
});

test("voice gate rejects a speech segment when no approved enrolled profile reaches the configured match threshold", () => {
  const configuredMatchThreshold = 0.9;
  const highestApprovedSimilarity = 0.89;
  const unknownEmbedding = [
    highestApprovedSimilarity,
    Math.sqrt(1 - highestApprovedSimilarity * highestApprovedSimilarity),
  ];
  const profiles = [
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
    {
      id: "unapproved-neighbor",
      approved: false,
      enrolled: true,
      embeddings: [unknownEmbedding],
    },
  ];
  const candidateScores = scoreApprovedVoiceCandidates(
    unknownEmbedding,
    profiles,
  );
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "no-approved-profile-at-threshold",
        timestampMs: 0,
        embedding: unknownEmbedding,
      },
    ],
    profiles,
    {
      voiceGateDecisionThreshold: configuredMatchThreshold,
      averageConfidenceThreshold: 1,
      recallConfidenceThreshold: 1,
      minAverageFrames: 2,
      minRecallFrames: 2,
    },
  );

  assert.deepEqual(
    candidateScores.map((candidateScore) => candidateScore.profileId),
    ["case-owner", "case-family-member"],
  );
  assert.ok(
    candidateScores.every(
      (candidateScore) => candidateScore.score < configuredMatchThreshold,
    ),
  );
  assertRejectedWithoutApprovedIdentity(result, "below_threshold");
  assert.equal(result.downstreamAuthorization, null);
});

test("recognition result schema includes the matched approved voice identifier for accepted speech", () => {
  const approvedVoices = [
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
  ];
  const acceptedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner",
        timestampMs: 0,
        embedding: [1, 0],
      },
    ],
    approvedVoices,
  );
  const rejectedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "unknown",
        timestampMs: 0,
        embedding: [0.5, 0.5],
      },
    ],
    approvedVoices,
    {
      voiceGateDecisionThreshold: 0.99,
      averageConfidenceThreshold: 0.99,
      recallConfidenceThreshold: 0.99,
    },
  );
  const matchedApprovedVoiceIdentifierField =
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA.matchedApprovedVoiceIdentifierField;
  const matchedApprovedVoiceProfileIdentifierField =
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .matchedApprovedVoiceProfileIdentifierField;
  const matchedApprovedVoiceHumanReadableLabelField =
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .matchedApprovedVoiceHumanReadableLabelField;
  const matchedApprovedVoiceProfileMetadataField =
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .matchedApprovedVoiceProfileMetadataField;
  const approvedVoiceClassificationTimestampField =
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .approvedVoiceClassificationTimestampField;

  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA.schemaVersion,
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA.resultKindField,
    "accepted",
  );
  assert.equal(matchedApprovedVoiceIdentifierField, "matchedVoiceId");
  assert.equal(
    matchedApprovedVoiceProfileIdentifierField,
    "matchedApprovedVoiceProfileId",
  );
  assert.equal(
    matchedApprovedVoiceHumanReadableLabelField,
    "matchedApprovedVoiceLabel",
  );
  assert.equal(
    matchedApprovedVoiceProfileMetadataField,
    "matchedApprovedVoiceProfileMetadata",
  );
  assert.equal(approvedVoiceClassificationTimestampField, "recognizedAtMs");
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .acceptedSpeechRequiresMatchedApprovedVoiceIdentifier,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .acceptedSpeechRequiresMatchedApprovedVoiceProfileIdentifier,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .acceptedSpeechRequiresMatchedApprovedVoiceHumanReadableLabel,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .acceptedSpeechRequiresMatchedApprovedVoiceProfileMetadata,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .acceptedSpeechRequiresApprovedVoiceClassificationTimestamp,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .downstreamAuthorizationMatchedVoiceIdentifierField,
    "downstreamAuthorization.matchedVoiceId",
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .approvedVoiceProfileIdentifierSourceField,
    "approvedVoiceProfilesById.*.profileId",
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .approvedVoiceHumanReadableLabelSourceField,
    "approvedVoiceProfilesById.*.displayName",
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA.supportsMultipleApprovedVoices,
    true,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .rejectedSpeechMatchedApprovedVoiceIdentifier,
    null,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .rejectedSpeechMatchedApprovedVoiceProfileIdentifier,
    null,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .rejectedSpeechMatchedApprovedVoiceHumanReadableLabel,
    null,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .rejectedSpeechMatchedApprovedVoiceProfileMetadata,
    null,
  );
  assert.equal(
    VOICE_GATE_RECOGNITION_RESULT_SCHEMA
      .rejectedSpeechApprovedVoiceClassificationTimestamp,
    null,
  );
  assert.equal(acceptedResult.accepted, true);
  assert.equal(
    acceptedResult[matchedApprovedVoiceIdentifierField],
    "case-owner",
  );
  assert.equal(
    acceptedResult[matchedApprovedVoiceProfileIdentifierField],
    "case-owner",
  );
  assert.equal(
    acceptedResult[matchedApprovedVoiceHumanReadableLabelField],
    "case-owner",
  );
  assert.deepEqual(
    acceptedResult[matchedApprovedVoiceProfileMetadataField],
    {
      id: "case-owner",
      identityId: "case-owner",
      profileId: "case-owner",
      displayName: null,
      label: "case-owner",
      approvalState: "approved",
      approved: true,
      enrolled: true,
    },
  );
  assert.equal(
    Number.isFinite(acceptedResult[approvedVoiceClassificationTimestampField]),
    true,
  );
  assert.equal(
    acceptedResult.downstreamAuthorization.matchedVoiceId,
    acceptedResult.matchedVoiceId,
  );
  assert.equal(rejectedResult.accepted, false);
  assert.equal(rejectedResult[matchedApprovedVoiceIdentifierField], null);
  assert.equal(
    rejectedResult[matchedApprovedVoiceProfileIdentifierField],
    null,
  );
  assert.equal(
    rejectedResult[matchedApprovedVoiceHumanReadableLabelField],
    null,
  );
  assert.equal(rejectedResult[matchedApprovedVoiceProfileMetadataField], null);
  assert.equal(rejectedResult[approvedVoiceClassificationTimestampField], null);
  assert.equal(rejectedResult.downstreamAuthorization, null);
});

test("voice gate exposes configurable decision threshold in the approval path", () => {
  const approvedVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0]],
    },
  ];
  const nearMatchEmbedding = [0.94, Math.sqrt(1 - 0.94 * 0.94)];
  const stricterGate = createApprovedVoiceGate({
    approvedVoices,
    config: {
      voiceGateDecisionThreshold: 0.95,
    },
  });
  const legacyAliasGate = createApprovedVoiceGate({
    approvedVoices,
    config: {
      highConfidenceThreshold: 0.95,
    },
  });
  const rejectedBelowConfiguredDecisionThreshold =
    recognizeApprovedVoiceUtterance(
      [
        {
          utteranceId: "near-match",
          timestampMs: 0,
          embedding: nearMatchEmbedding,
        },
      ],
      approvedVoices,
      {
        voiceGateDecisionThreshold: 0.95,
      },
    );
  const acceptedAtConfiguredDecisionThreshold =
    recognizeApprovedVoiceUtterance(
      [
        {
          utteranceId: "near-match",
          timestampMs: 0,
          embedding: nearMatchEmbedding,
        },
      ],
      approvedVoices,
      {
        voiceGateDecisionThreshold: 0.93,
      },
    );

  assert.equal(
    DEFAULT_VOICE_GATE_CONFIG.voiceGateDecisionThreshold,
    DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  );
  assert.equal(
    VOICE_GATE_DECISION_THRESHOLD,
    DEFAULT_VOICE_GATE_DECISION_THRESHOLD,
  );
  assert.equal(stricterGate.getConfig().voiceGateDecisionThreshold, 0.95);
  assert.equal(stricterGate.getConfig().highConfidenceThreshold, 0.95);
  assert.equal(legacyAliasGate.getConfig().voiceGateDecisionThreshold, 0.95);
  assert.equal(rejectedBelowConfiguredDecisionThreshold.accepted, false);
  assert.equal(
    rejectedBelowConfiguredDecisionThreshold.downstreamAuthorization,
    null,
  );
  assert.equal(
    rejectedBelowConfiguredDecisionThreshold.reason,
    "below_threshold",
  );
  assert.equal(acceptedAtConfiguredDecisionThreshold.accepted, true);
  assert.equal(
    acceptedAtConfiguredDecisionThreshold.matchedVoiceId,
    "case-owner",
  );
  assert.equal(
    acceptedAtConfiguredDecisionThreshold.reason,
    "high_confidence_match",
  );
  assert.equal(
    acceptedAtConfiguredDecisionThreshold.downstreamAuthorization.threshold,
    0.93,
  );
  assert.ok(
    acceptedAtConfiguredDecisionThreshold.downstreamAuthorization.score >=
      acceptedAtConfiguredDecisionThreshold.downstreamAuthorization.threshold,
  );
});

test("voice gate authorizes downstream processing only when a matched approved voice meets a configured threshold", () => {
  const approvedVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0]],
    },
  ];
  const averageThresholdConfig = {
    voiceGateDecisionThreshold: 0.99,
    averageConfidenceThreshold: 0.86,
    minAverageFrames: 2,
    minRecallFrames: 3,
  };
  const averageMatchEmbedding = [0.87, Math.sqrt(1 - 0.87 * 0.87)];
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "average-threshold-owner",
        timestampMs: 0,
        embedding: averageMatchEmbedding,
      },
      {
        utteranceId: "average-threshold-owner",
        timestampMs: 120,
        embedding: averageMatchEmbedding,
      },
    ],
    approvedVoices,
    averageThresholdConfig,
  );

  assert.equal(result.accepted, true);
  assert.equal(result.matchedVoiceId, "case-owner");
  assert.equal(result.reason, "average_confidence_match");
  assert.equal(result.downstreamAuthorization.matchedVoiceId, "case-owner");
  assert.equal(result.downstreamAuthorization.decisionRule, result.reason);
  assert.equal(
    result.downstreamAuthorization.threshold,
    averageThresholdConfig.averageConfidenceThreshold,
  );
  assert.ok(
    result.downstreamAuthorization.score >=
      result.downstreamAuthorization.threshold,
  );
  assert.ok(
    result.downstreamAuthorization.score <
      averageThresholdConfig.voiceGateDecisionThreshold,
  );
});

test("approved voice recognition event is timestamped and contains only match metadata", () => {
  const recognizedAtMs = 1_700_000_000_123;
  const result = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    [
      {
        id: "case-owner",
        displayName: "Case Owner",
        approved: true,
        enrolled: true,
        embeddings: [[1, 0, 0]],
      },
    ],
  );

  const event = createApprovedVoiceRecognitionEvent(result, {
    recognizedAtMs,
  });
  const propagatedEvent = createApprovedVoiceRecognitionEvent(result);

  assert.equal(Number.isFinite(result.recognizedAtMs), true);
  assert.equal(event.eventType, APPROVED_VOICE_RECOGNITION_EVENT_TYPE);
  assert.equal(event.timestamp, new Date(recognizedAtMs).toISOString());
  assert.equal(event.recognizedAtMs, recognizedAtMs);
  assert.equal(propagatedEvent.recognizedAtMs, result.recognizedAtMs);
  assert.equal(
    propagatedEvent.timestamp,
    new Date(result.recognizedAtMs).toISOString(),
  );
  assert.equal(event.accepted, true);
  assert.equal(event.matchedVoiceId, "case-owner");
  assert.equal(event.matchedApprovedVoiceProfileId, "case-owner");
  assert.equal(event.matchedApprovedVoiceLabel, "Case Owner");
  assert.deepEqual(event.matchedApprovedVoiceProfileMetadata, {
    id: "case-owner",
    identityId: "case-owner",
    profileId: "case-owner",
    displayName: "Case Owner",
    label: "Case Owner",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
  assert.equal(propagatedEvent.matchedApprovedVoiceProfileId, "case-owner");
  assert.equal(propagatedEvent.matchedApprovedVoiceLabel, "Case Owner");
  assert.deepEqual(
    propagatedEvent.matchedApprovedVoiceProfileMetadata,
    event.matchedApprovedVoiceProfileMetadata,
  );
  assert.equal(event.rejectedVoiceId, null);
  assert.equal(event.reason, "high_confidence_match");
  assert.deepEqual(event.downstreamAuthorization, {
    authorized: true,
    matchedVoiceId: "case-owner",
    score: 1,
    threshold: DEFAULT_VOICE_GATE_CONFIG.voiceGateDecisionThreshold,
    decisionRule: "high_confidence_match",
    supportingFrameCount: 1,
    requiredFrameCount: 1,
  });
  assert.equal("audioBytes" in event, false);
  assert.equal("embeddings" in event.matchedApprovedVoiceProfileMetadata, false);
  assert.equal(
    "voiceprintData" in event.matchedApprovedVoiceProfileMetadata,
    false,
  );
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.matchedApprovedVoiceProfileMetadata), true);
  assert.notEqual(event.candidateScores, result.candidateScores);
});

test("approved voice recognition event requires configured threshold authorization", () => {
  assert.throws(
    () =>
      createApprovedVoiceRecognitionEvent(
        {
          accepted: true,
          matchedVoiceId: "case-owner",
          matchedApprovedVoiceProfileId: "case-owner",
          matchedApprovedVoiceLabel: "case-owner",
          rejectedVoiceId: null,
          confidence: 0.94,
          latencyMs: 120,
          evaluatedFrameCount: 1,
          reason: "high_confidence_match",
          candidateScores: [],
          bestCandidateScore: null,
          bestApprovedVoiceId: "case-owner",
          bestApprovedVoiceScore: 0.94,
          downstreamAuthorization: {
            authorized: true,
            matchedVoiceId: "case-owner",
            score: 0.94,
            threshold: 0.95,
          },
        },
        { recognizedAtMs: 1_700_000_000_123 },
      ),
    /configured threshold authorization/,
  );
});

test("voice gate emits one timestamped approved recognition event on acceptance", () => {
  const emittedEvents = [];
  const rejectedEvents = [];
  const eventOrder = [];
  const approvedVoices = [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0]],
    },
  ];
  const gate = createApprovedVoiceGate({
    approvedVoices,
    nowMs: () => 1_700_000_100_000,
    onApprovedVoiceRecognized: (event) => {
      eventOrder.push("approved-event");
      emittedEvents.push(event);
    },
  });

  eventOrder.push("before-observe");
  const accepted = gate.observeFrame({
    utteranceId: "owner",
    timestampMs: 0,
    embedding: [1, 0],
  });
  eventOrder.push("after-observe");
  const duplicateObservation = gate.observeFrame({
    utteranceId: "owner",
    timestampMs: 120,
    embedding: [1, 0],
  });
  const rejectedGate = createApprovedVoiceGate({
    approvedVoices,
    nowMs: () => 1_700_000_200_000,
    onApprovedVoiceRecognized: (event) => rejectedEvents.push(event),
  });
  const rejected = rejectedGate.observeFrame({
    utteranceId: "unknown",
    timestampMs: 0,
    embedding: [0, 1],
  });

  assert.equal(accepted.accepted, true);
  assert.equal(duplicateObservation.accepted, true);
  assert.equal(accepted.recognizedAtMs, 1_700_000_100_000);
  assert.equal(duplicateObservation.recognizedAtMs, accepted.recognizedAtMs);
  assert.equal(emittedEvents.length, 1);
  assert.deepEqual(eventOrder, [
    "before-observe",
    "approved-event",
    "after-observe",
  ]);
  assert.equal(
    emittedEvents[0].eventType,
    APPROVED_VOICE_RECOGNITION_EVENT_TYPE,
  );
  assert.equal(emittedEvents[0].matchedVoiceId, "case-owner");
  assert.deepEqual(emittedEvents[0].matchedApprovedVoiceProfileMetadata, {
    id: "case-owner",
    identityId: "case-owner",
    profileId: "case-owner",
    displayName: null,
    label: "case-owner",
    approvalState: "approved",
    approved: true,
    enrolled: true,
  });
  assert.equal(emittedEvents[0].recognizedAtMs, accepted.recognizedAtMs);
  assert.equal(
    emittedEvents[0].timestamp,
    new Date(1_700_000_100_000).toISOString(),
  );
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.recognizedAtMs, null);
  assert.equal(rejectedEvents.length, 0);
});

test("streaming approval happens within the one-second recognition latency limit", () => {
  const gate = createApprovedVoiceGate({
    approvedVoices: [
      {
        id: "approved",
        approved: true,
        enrolled: true,
        embeddings: [[0.8, 0.4, 0.2]],
      },
    ],
  });

  const first = gate.observeFrame({
    utteranceId: "u1",
    timestampMs: 0,
    embedding: [0.8, 0.4, 0.18],
  });
  const second = gate.observeFrame({
    utteranceId: "u1",
    timestampMs: 120,
    embedding: [0.78, 0.42, 0.22],
  });

  const accepted = first.accepted ? first : second;
  assert.equal(accepted.accepted, true);
  assert.ok((accepted.latencyMs || 0) < 1000);
});
