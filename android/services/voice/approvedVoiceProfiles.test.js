"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  APPROVED_VOICE_APPROVAL_STATE,
  APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  APPROVED_VOICE_IDENTITY_STORAGE_MODEL,
  APPROVED_VOICE_PROFILE_STORE_KEY,
  APPROVED_VOICE_PROFILE_STORE_SCHEMA,
  APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
  APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS,
  APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY,
  APPROVED_VOICE_ENABLED_STATUS,
  APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX,
  LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE,
  createApprovedVoiceProfileStore,
  addApprovedVoiceProfile,
  createApprovedVoiceProfile,
  createApprovedVoiceProfileByIdentifier,
  deleteApprovedVoiceProfile,
  disableApprovedVoiceProfile,
  listApprovedVoiceProfileIdentifiers,
  listApprovedVoiceProfilesById,
  listApprovedVoiceManagementProfiles,
  loadApprovedEnrolledVoiceProfilesForRecognition,
  loadApprovedVoiceProfilesForRecognition,
  listApprovedVoiceProfiles,
  listEnrolledApprovedVoiceProfiles,
  migrateSingleEnrolledVoiceToApprovedVoiceProfile,
  parseApprovedVoiceProfileStore,
  persistApprovedVoiceProfileEnrollment,
  readApprovedVoiceProfile,
  retrieveApprovedVoiceProfile,
  retrieveApprovedVoiceProfileByIdentifier,
  removeApprovedVoiceProfile,
  removeApprovedVoiceProfileByIdentifier,
  serializeApprovedVoiceProfileStore,
  toApprovedVoiceManagementProfiles,
  toEnrolledApprovedVoiceProfiles,
  toVoiceGateApprovedVoiceProfiles,
  updateApprovedVoiceProfile,
} = require("./approvedVoiceProfiles");
const {
  createApprovedVoiceGate,
  prepareApprovedVoiceProfiles,
  recognizeApprovedVoiceUtterance,
} = require("./voiceGate");

test("approved voice approval states normalize to pending, approved, or revoked before recognition", () => {
  assert.equal(
    APPROVED_VOICE_APPROVAL_STATE.UNAPPROVED,
    APPROVED_VOICE_APPROVAL_STATE.REVOKED,
  );

  const store = createApprovedVoiceProfileStore({
    approvedVoices: [
      {
        id: "pending-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
        enrolled: true,
        embeddings: [[0, 1, 0]],
      },
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        embeddings: [[1, 0, 0]],
      },
      {
        id: "revoked-roommate",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
        enrolled: true,
        embeddings: [[0, 0, 1]],
      },
      {
        id: "legacy-unapproved-neighbor",
        approvalState: "unapproved",
        enrolled: true,
        embeddings: [[0.2, 0.1, 0.93]],
      },
    ],
  });
  const gateProfiles = toVoiceGateApprovedVoiceProfiles(store);
  const revokedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "revoked-roommate",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    store,
  );

  assert.deepEqual(
    store.approvedVoices.map((profile) => profile.approvalState),
    [
      APPROVED_VOICE_APPROVAL_STATE.PENDING,
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      APPROVED_VOICE_APPROVAL_STATE.REVOKED,
      APPROVED_VOICE_APPROVAL_STATE.REVOKED,
    ],
  );
  assert.deepEqual(
    gateProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(
    createApprovedVoiceGate({ approvedVoices: store }).getApprovedVoiceCount(),
    1,
  );
  assert.equal(revokedResult.accepted, false);
  assert.equal(revokedResult.matchedVoiceId, null);
  assert.equal(revokedResult.rejectedVoiceId, null);
  assert.equal(revokedResult.reason, "below_threshold");
});

test("approved voice identity storage model has distinct identity, voiceprint, and approval fields", () => {
  const store = createApprovedVoiceProfileStore({
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        identityId: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        voiceprintData: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
            createdAtMs: 12_000,
          },
          [0.9, 0.25, 0.12],
        ],
      },
      {
        identityId: "case-family-member",
        displayName: "Family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        voiceprintData: [[0.1, 0.91, 0.25]],
      },
    ],
  });

  assert.equal(store.schemaVersion, APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION);
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.identityIdField,
    "identityId",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.profileIdField,
    "profileId",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.rootField,
    "approvedVoiceProfilesById",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.collectionKeyField,
    "id",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.legacyRootField,
    "approvedVoices",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.voiceprintDataField,
    "voiceprintData",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.approvalStateField,
    "approvalState",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.voiceprintApprovalStateField,
    "approvalState",
  );
  assert.deepEqual(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.stableProfileIdentifierFields,
    ["profileId", "identityId"],
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.enrollmentMetadataField,
    "enrollmentMetadata",
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.enrollmentMetadataSchema,
    APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  );
  assert.equal(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL
      .supportsMultipleVoiceIdentitiesPerProfile,
    true,
  );
  assert.notEqual(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.identityIdField,
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.voiceprintDataField,
  );
  assert.notEqual(
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.identityIdField,
    APPROVED_VOICE_IDENTITY_STORAGE_MODEL.approvalStateField,
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.profileIdentityField,
    "identityId",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.rootField,
    "approvedVoiceProfilesById",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.collectionKeyField,
    "id",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.legacyRootField,
    "approvedVoices",
  );
  assert.equal(APPROVED_VOICE_PROFILE_STORE_SCHEMA.profileIdField, "profileId");
  assert.deepEqual(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.stableProfileIdentifierFields,
    ["profileId", "identityId"],
  );
  assert.deepEqual(APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS, [
    "profileId",
    "identityId",
  ]);
  assert.equal(APPROVED_VOICE_PROFILE_STORE_SCHEMA.profileIdRequired, true);
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.approvalStateField,
    "approvalState",
  );
  assert.equal(APPROVED_VOICE_PROFILE_STORE_SCHEMA.approvalStateRequired, true);
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.enrollmentStateField,
    "enrolled",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.enrollmentMetadataField,
    "enrollmentMetadata",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.enrollmentMetadataSchema,
    APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  );
  assert.equal(
    APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA.enrolledAtMsField,
    "enrolledAtMs",
  );
  assert.equal(
    APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA.sourceField,
    "source",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.voiceprintDataField,
    "voiceprintData",
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.voiceprintApprovalStateField,
    "approvalState",
  );
  assert.equal(APPROVED_VOICE_PROFILE_STORE_SCHEMA.embeddingVectorField, "vector");
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA.supportsMultipleApprovedProfiles,
    true,
  );
  assert.equal(
    APPROVED_VOICE_PROFILE_STORE_SCHEMA
      .supportsMultipleVoiceIdentitiesPerProfile,
    true,
  );
  assert.equal(store.approvedVoices.length, 2);
  assert.deepEqual(
    store.approvedVoices.map((profile) => profile.identityId),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(
    store.approvedVoices.map((profile) => profile.profileId),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(
    store.approvedVoices.map((profile) => profile.approvalState),
    [
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    ],
  );
  assert.equal(store.approvedVoices[0].enrollmentMetadata.profileId, "case-owner");
  assert.equal(
    store.approvedVoices[0].enrollmentMetadata.identityId,
    "case-owner",
  );
  assert.equal(store.approvedVoices[0].enrollmentMetadata.enrolledAtMs, 12_345);
  assert.equal(store.approvedVoices[0].enrollmentMetadata.updatedAtMs, 12_345);
  assert.equal(
    store.approvedVoices[0].enrollmentMetadata.source,
    DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE,
  );
  assert.equal(store.approvedVoices[0].enrollmentMetadata.voiceprintCount, 2);
  assert.deepEqual(store.approvedVoices[0].enrollmentMetadata.embeddingModelIds, [
    "case-local-speaker-embedding-v1",
  ]);
  assert.equal(store.approvedVoices[0].voiceprintData.length, 2);
  assert.deepEqual(
    store.approvedVoices[0].voiceprintData.map(
      (voiceprint) => voiceprint.approvalState,
    ),
    [
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    ],
  );
  assert.deepEqual(store.approvedVoices[0].voiceprintData[0].vector, [
    0.94,
    0.2,
    0.1,
  ]);
  assert.equal(
    store.approvedVoices[0].voiceprintData[1].id,
    "case-owner:embedding:2",
  );
  assert.equal(store.approvedVoices[0].id, "case-owner");
  assert.deepEqual(
    store.approvedVoices[0].embeddings,
    store.approvedVoices[0].voiceprintData,
  );
});

test("approved voice profile store persists records keyed by unique profile identifiers", () => {
  const store = createApprovedVoiceProfileStore({
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.94, 0.2, 0.1]],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.1, 0.91, 0.25]],
      },
    ],
  });
  const persistedStore = JSON.parse(serializeApprovedVoiceProfileStore(store));

  assert.deepEqual(Object.keys(store.approvedVoiceProfilesById), [
    "case-owner",
    "case-family-member",
  ]);
  assert.equal(
    store.approvedVoiceProfilesById["case-owner"],
    store.approvedVoices[0],
  );
  assert.equal(
    store.approvedVoiceProfilesById["case-family-member"],
    store.approvedVoices[1],
  );
  assert.deepEqual(Object.keys(persistedStore.approvedVoiceProfilesById), [
    "case-owner",
    "case-family-member",
  ]);
  assert.equal(
    persistedStore.approvedVoiceProfilesById["case-owner"].id,
    "case-owner",
  );
  assert.deepEqual(
    persistedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
});

test("approved voice profile store normalizes keyed records without the legacy list", () => {
  const serializedStore = JSON.stringify({
    schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
    updatedAtMs: 12_345,
    approvedVoiceProfilesById: {
      "case-owner": {
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        voiceprintData: [[1, 0, 0]],
      },
      "case-family-member": {
        id: "case-family-member",
        displayName: "Family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        voiceprintData: [[0, 1, 0]],
      },
    },
  });
  const reloadedStore = parseApprovedVoiceProfileStore(serializedStore);
  const gateProfilesFromStore =
    toVoiceGateApprovedVoiceProfiles(reloadedStore);
  const gateProfilesFromKeyedCollection = toVoiceGateApprovedVoiceProfiles(
    reloadedStore.approvedVoiceProfilesById,
  );

  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.equal(reloadedStore.approvedVoices[0].identityId, "case-owner");
  assert.equal(reloadedStore.approvedVoices[0].profileId, "case-owner");
  assert.deepEqual(Object.keys(reloadedStore.approvedVoiceProfilesById), [
    "case-owner",
    "case-family-member",
  ]);
  assert.deepEqual(
    gateProfilesFromStore.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(gateProfilesFromKeyedCollection, gateProfilesFromStore);
});

test("approved voice profile keyed collection rejects mismatched record identifiers", () => {
  assert.throws(
    () =>
      parseApprovedVoiceProfileStore(
        JSON.stringify({
          schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
          updatedAtMs: 12_345,
          approvedVoiceProfilesById: {
            "case-owner": {
              id: "case-family-member",
              approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
              voiceprintData: [[1, 0, 0]],
            },
          },
        }),
      ),
    /key must match approved voice profile id/,
  );
});

test("compatibility migration converts a legacy single enrolled voice into one approved profile with a stable identifier", () => {
  const legacyStore = {
    schemaVersion: 0,
    updatedAtMs: 2_222,
    enrolledVoice: {
      displayName: "Legacy owner",
      enrolled: true,
      createdAtMs: 1_111,
      embedding: [0.94, 0.2, 0.1],
    },
  };
  const migratedStore = parseApprovedVoiceProfileStore(
    JSON.stringify(legacyStore),
  );
  const directMigratedStore =
    migrateSingleEnrolledVoiceToApprovedVoiceProfile(legacyStore);
  const migratedProfile = migratedStore.approvedVoices[0];
  const gateProfiles = toVoiceGateApprovedVoiceProfiles(migratedStore);
  const recognitionResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "legacy-owner-approved-after-migration",
        timestampMs: 0,
        embedding: [0.94, 0.2, 0.1],
      },
    ],
    gateProfiles,
  );

  assert.equal(migratedStore.updatedAtMs, 2_222);
  assert.equal(migratedStore.approvedVoices.length, 1);
  assert.equal(migratedProfile.id, LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID);
  assert.equal(
    migratedProfile.identityId,
    LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  );
  assert.equal(
    migratedProfile.profileId,
    LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  );
  assert.equal(
    migratedProfile.approvalState,
    APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );
  assert.equal(migratedProfile.approved, true);
  assert.equal(migratedProfile.enrolled, true);
  assert.equal(migratedProfile.enrolledAtMs, 1_111);
  assert.equal(migratedProfile.updatedAtMs, 2_222);
  assert.deepEqual(migratedProfile.voiceprintData[0].vector, [
    0.94,
    0.2,
    0.1,
  ]);
  assert.deepEqual(Object.keys(migratedStore.approvedVoiceProfilesById), [
    LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  ]);
  assert.equal(
    directMigratedStore.approvedVoices[0].id,
    LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  );
  assert.deepEqual(
    gateProfiles.map((profile) => profile.id),
    [LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID],
  );
  assert.equal(recognitionResult.accepted, true);
  assert.equal(
    recognitionResult.matchedVoiceId,
    LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  );
});

test("compatibility migration preserves a legacy enrolled voice identifier before appending approved profiles", async () => {
  let storedValue = JSON.stringify({
    updatedAtMs: 1_000,
    voiceEnrollment: {
      profile: {
        id: "case-owner",
        displayName: "Owner",
        enrolled: true,
        enrolledAtMs: 900,
        voiceprint: {
          modelId: "legacy-speaker-embedding-v1",
          vector: [1, 0, 0],
        },
      },
    },
  });
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const loadedProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const ownerRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "legacy-owner-still-approved",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    loadedProfiles,
  );
  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0, 1, 0]],
    },
    { updatedAtMs: 2_000 },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);

  assert.deepEqual(
    loadedProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(ownerRecognition.accepted, true);
  assert.equal(ownerRecognition.matchedVoiceId, "case-owner");
  assert.equal(writes.length, 1);
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.equal(nextStore.approvedVoices[0].approvalState, "approved");
  assert.equal(nextStore.approvedVoices[0].approved, true);
  assert.equal(nextStore.approvedVoices[0].enrolled, true);
  assert.equal(nextStore.approvedVoices[0].enrolledAtMs, 900);
  assert.equal(nextStore.approvedVoices[0].updatedAtMs, 1_000);
  assert.equal(
    nextStore.approvedVoices[0].voiceprintData[0].modelId,
    "legacy-speaker-embedding-v1",
  );
  assert.deepEqual(
    writes[0].approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
});

test("approved voice profile enrollment metadata round-trips with stable profile identifiers", () => {
  const store = createApprovedVoiceProfileStore({
    updatedAtMs: 5_000,
    approvedVoices: [
      {
        id: "case-owner-profile",
        voiceId: "case-owner-phone-voice",
        displayName: "Owner phone voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrollmentMetadata: {
          profileId: "case-owner-profile",
          identityId: "case-owner-phone-voice",
          enrolledAtMs: 4_000,
          updatedAtMs: 4_500,
          source: "local_settings",
          enrollmentSessionId: "session-1",
          deviceId: "pixel-local",
        },
        voiceprintData: [
          {
            id: "case-owner-phone-voice:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
          },
        ],
      },
    ],
  });
  const reloadedStore = parseApprovedVoiceProfileStore(
    serializeApprovedVoiceProfileStore(store),
  );
  const storedProfile = reloadedStore.approvedVoices[0];

  assert.equal(storedProfile.profileId, "case-owner-profile");
  assert.equal(storedProfile.identityId, "case-owner-phone-voice");
  assert.equal(storedProfile.id, "case-owner-phone-voice");
  assert.equal(
    storedProfile.approvalState,
    APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );
  assert.equal(storedProfile.enrolled, true);
  assert.deepEqual(storedProfile.enrollmentMetadata, {
    profileId: "case-owner-profile",
    identityId: "case-owner-phone-voice",
    enrolledAtMs: 4_000,
    updatedAtMs: 4_500,
    source: "local_settings",
    enrollmentSessionId: "session-1",
    deviceId: "pixel-local",
    voiceprintCount: 1,
    embeddingModelIds: ["case-local-speaker-embedding-v1"],
  });
  assert.deepEqual(toVoiceGateApprovedVoiceProfiles(reloadedStore), [
    {
      id: "case-owner-phone-voice",
      identityId: "case-owner-phone-voice",
      profileId: "case-owner-profile",
      displayName: "Owner phone voice",
      enabled: true,
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      approved: true,
      enrolled: true,
      embeddings: [[0.94, 0.2, 0.1]],
      voiceprintData: [
        {
          id: "case-owner-phone-voice:enrollment:1",
          modelId: "case-local-speaker-embedding-v1",
          approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
          vector: [0.94, 0.2, 0.1],
        },
      ],
    },
  ]);
});

test("approved voice enrollment persists and retrieves approval state alongside each voiceprint", () => {
  const store = createApprovedVoiceProfileStore({
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        voiceprintData: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
          },
          [0.9, 0.25, 0.12],
        ],
      },
      {
        id: "pending-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
        enrolled: true,
        voiceprintData: [
          {
            id: "pending-guest:enrollment:1",
            approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
            vector: [0.1, 0.91, 0.25],
          },
        ],
      },
    ],
  });
  const serializedStore = serializeApprovedVoiceProfileStore(store);
  const persistedStore = JSON.parse(serializedStore);
  const reloadedStore = parseApprovedVoiceProfileStore(serializedStore);
  const gateProfiles = toVoiceGateApprovedVoiceProfiles(reloadedStore);

  assert.deepEqual(
    persistedStore.approvedVoices[0].voiceprintData.map(
      (voiceprint) => voiceprint.approvalState,
    ),
    [
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    ],
  );
  assert.equal(
    persistedStore.approvedVoices[1].voiceprintData[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.PENDING,
  );
  assert.equal(
    reloadedStore.approvedVoices[1].voiceprintData[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.PENDING,
  );
  assert.deepEqual(
    gateProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(
    gateProfiles[0].voiceprintData[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );
  assert.deepEqual(gateProfiles[0].embeddings[0], [0.94, 0.2, 0.1]);
});

test("stored voiceprint approval state restores voice identity approval when the profile field is absent", () => {
  const store = createApprovedVoiceProfileStore({
    approvedVoices: [
      {
        id: "pending-guest",
        enrolled: true,
        voiceprintData: [
          {
            id: "pending-guest:enrollment:1",
            approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
            vector: [0.1, 0.91, 0.25],
          },
        ],
      },
    ],
  });

  assert.equal(
    store.approvedVoices[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.PENDING,
  );
  assert.equal(store.approvedVoices[0].approved, false);
  assert.equal(
    store.approvedVoices[0].voiceprintData[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.PENDING,
  );
  assert.deepEqual(toVoiceGateApprovedVoiceProfiles(store), []);
});

test("approved voice recognition loader returns only enabled approved enrolled profiles", async () => {
  const store = createApprovedVoiceProfileStore({
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        enabled: true,
        embeddings: [[1, 0, 0]],
      },
      {
        id: "unapproved-neighbor",
        approved: false,
        enrolled: true,
        embeddings: [[0, 1, 0]],
      },
      {
        id: "pending-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
        enrolled: true,
        embeddings: [[0.5, 0.5, 0.7]],
      },
      {
        id: "revoked-roommate",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
        enrolled: true,
        embeddings: [[0.7, 0.5, 0.5]],
      },
      {
        id: "disabled-guest",
        approved: true,
        enrolled: true,
        enabled: false,
        embeddings: [[0, 0, 1]],
      },
      {
        id: "unenrolled-relative",
        approved: true,
        enrolled: false,
        embeddings: [[0.55, 0.55, 0.62]],
      },
      {
        id: "case-family-member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        embeddings: [[0.1, 0.91, 0.25]],
      },
    ],
  });
  const reads = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      return serializeApprovedVoiceProfileStore(store);
    },
  };

  const loadedProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const aliasLoadedProfiles =
    await loadApprovedEnrolledVoiceProfilesForRecognition(storage);
  const gateFromStore = createApprovedVoiceGate({ approvedVoices: store });
  const disabledVoiceResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "disabled-guest",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    loadedProfiles,
  );

  assert.deepEqual(reads, [
    APPROVED_VOICE_PROFILE_STORE_KEY,
    APPROVED_VOICE_PROFILE_STORE_KEY,
  ]);
  assert.deepEqual(
    loadedProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(aliasLoadedProfiles, loadedProfiles);
  assert.equal(gateFromStore.getApprovedVoiceCount(), 2);
  assert.equal(
    loadedProfiles.every(
      (profile) =>
        profile.enabled === true &&
        profile.approved === true &&
        profile.enrolled === true &&
        profile.approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    ),
    true,
  );
  assert.deepEqual(loadedProfiles[0].embeddings, [[1, 0, 0]]);
  assert.equal(disabledVoiceResult.accepted, false);
  assert.equal(disabledVoiceResult.matchedVoiceId, null);
});

test("approved voice management lists all enrolled approved voices with identity and enabled status", async () => {
  const serializedStore = JSON.stringify({
    schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        enabled: true,
        voiceprintData: [[1, 0, 0]],
      },
      {
        id: "case-owner-profile",
        voiceId: "case-owner-watch-voice",
        displayName: "Owner watch voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        enabled: true,
        voiceprintData: [[0.95, 0.2, 0.1]],
      },
      {
        id: "disabled-family-member",
        displayName: "Disabled family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        enabled: false,
        voiceprintData: [[0, 1, 0]],
      },
      {
        id: "pending-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
        enrolled: true,
        enabled: true,
        voiceprintData: [[0.5, 0.5, 0.7]],
      },
      {
        id: "revoked-roommate",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
        enrolled: true,
        enabled: true,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
            vector: ["revoked-management-list-must-not-normalize"],
          },
        ],
      },
      {
        id: "unenrolled-relative",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: false,
        enabled: true,
        voiceprintData: [[0, 0, 1]],
      },
    ],
  });
  const reads = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      return serializedStore;
    },
  };

  const listedProfiles = await listApprovedVoiceManagementProfiles(storage);
  const aliasListedProfiles =
    await listEnrolledApprovedVoiceProfiles(storage);
  const sourceListedProfiles = toApprovedVoiceManagementProfiles(
    JSON.parse(serializedStore),
  );
  const sourceAliasListedProfiles = toEnrolledApprovedVoiceProfiles(
    JSON.parse(serializedStore),
  );

  assert.deepEqual(reads, [
    APPROVED_VOICE_PROFILE_STORE_KEY,
    APPROVED_VOICE_PROFILE_STORE_KEY,
  ]);
  assert.deepEqual(aliasListedProfiles, listedProfiles);
  assert.deepEqual(sourceListedProfiles, listedProfiles);
  assert.deepEqual(sourceAliasListedProfiles, listedProfiles);
  assert.deepEqual(
    listedProfiles.map((profile) => ({
      id: profile.id,
      identityId: profile.identityId,
      profileId: profile.profileId,
      enabled: profile.enabled,
      disabled: profile.disabled,
      enabledStatus: profile.enabledStatus,
    })),
    [
      {
        id: "case-owner",
        identityId: "case-owner",
        profileId: "case-owner",
        enabled: true,
        disabled: false,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.ENABLED,
      },
      {
        id: "case-owner-watch-voice",
        identityId: "case-owner-watch-voice",
        profileId: "case-owner-profile",
        enabled: true,
        disabled: false,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.ENABLED,
      },
      {
        id: "disabled-family-member",
        identityId: "disabled-family-member",
        profileId: "disabled-family-member",
        enabled: false,
        disabled: true,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.DISABLED,
      },
    ],
  );
  assert.equal(
    listedProfiles.every(
      (profile) =>
        profile.approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED &&
        profile.approved === true &&
        profile.enrolled === true,
    ),
    true,
  );
  assert.deepEqual(
    listedProfiles.map((profile) => profile.voiceprintCount),
    [1, 1, 1],
  );
  assert.equal(
    listedProfiles.some(
      (profile) =>
        Object.prototype.hasOwnProperty.call(profile, "voiceprintData") ||
        Object.prototype.hasOwnProperty.call(profile, "embeddings"),
    ),
    false,
  );
});

test("approved voice recognition loader treats an empty persisted store as no approved voices", async () => {
  const loadedProfiles = await loadApprovedVoiceProfilesForRecognition({
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return null;
    },
  });

  assert.deepEqual(loadedProfiles, []);
});

test("approved voice recognition loader does not normalize non-candidate voiceprint vectors", async () => {
  const serializedStore = JSON.stringify({
    schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
    updatedAtMs: 12_345,
    approvedVoices: [
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        voiceprintData: [[1, 0, 0]],
      },
      {
        id: "revoked-roommate",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
        enrolled: true,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
            vector: ["revoked-vector-must-not-be-normalized"],
          },
        ],
      },
      {
        id: "disabled-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enabled: false,
        enrolled: true,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            vector: ["disabled-vector-must-not-be-normalized"],
          },
        ],
      },
      {
        id: "unenrolled-relative",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: false,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            vector: ["unenrolled-vector-must-not-be-normalized"],
          },
        ],
      },
    ],
  });
  const loadedProfiles = await loadApprovedVoiceProfilesForRecognition({
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return serializedStore;
    },
  });

  assert.deepEqual(
    loadedProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.deepEqual(loadedProfiles[0].embeddings, [[1, 0, 0]]);
});

test("voiceprint approval state must match the stored voice identity approval state", () => {
  assert.throws(
    () =>
      createApprovedVoiceProfileStore({
        approvedVoices: [
          {
            id: "case-owner",
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            voiceprintData: [
              {
                approvalState: APPROVED_VOICE_APPROVAL_STATE.REVOKED,
                vector: [0.94, 0.2, 0.1],
              },
            ],
          },
        ],
      }),
    /voiceprintData\[0\]\.approvalState must match voice identity approvalState/,
  );
});

test("approved voice enrollment persistence appends without overwriting stored profiles", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 900,
        updatedAtMs: 950,
        embeddings: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
            createdAtMs: 900,
          },
        ],
      },
    ],
  });
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    async getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    async setItem(key, value) {
      writes.push({ key, value });
      storedValue = value;
    },
  };

  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.1, 0.91, 0.25]],
    },
    { updatedAtMs: 2_000 },
  );
  const persistedStore = JSON.parse(storedValue);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, APPROVED_VOICE_PROFILE_STORE_KEY);
  assert.equal(nextStore.updatedAtMs, 2_000);
  assert.deepEqual(nextStore.approvedVoices[0], existingStore.approvedVoices[0]);
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.deepEqual(
    persistedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.equal(nextStore.approvedVoices[1].enrolledAtMs, 2_000);
  assert.equal(nextStore.approvedVoices[1].updatedAtMs, 2_000);
});

test("approved voice enrollment persistence assigns stable identifiers to new voices without caller ids", async () => {
  let storedValue = null;
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const enrolledStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        source: "local_settings",
        enrollmentSessionId: "owner-enrollment",
        deviceId: "pixel-local",
      },
      embeddings: [[0.94, 0.2, 0.1]],
    },
    { updatedAtMs: 6_000 },
  );
  const generatedId = `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-6000`;
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const readProfile = await readApprovedVoiceProfile(storage, generatedId);
  const createdProfile = await createApprovedVoiceProfile(
    storage,
    {
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.1, 0.91, 0.25]],
    },
    { updatedAtMs: 7_000 },
  );
  const sameTimestampStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      displayName: "Roommate",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.22, 0.3, 0.93]],
    },
    { updatedAtMs: 7_000 },
  );

  assert.equal(enrolledStore.approvedVoices.length, 1);
  assert.equal(enrolledStore.approvedVoices[0].id, generatedId);
  assert.equal(enrolledStore.approvedVoices[0].identityId, generatedId);
  assert.equal(enrolledStore.approvedVoices[0].profileId, generatedId);
  assert.equal(
    enrolledStore.approvedVoices[0].enrollmentMetadata.identityId,
    generatedId,
  );
  assert.equal(
    enrolledStore.approvedVoices[0].enrollmentMetadata.profileId,
    generatedId,
  );
  assert.equal(
    enrolledStore.approvedVoices[0].enrollmentMetadata.enrollmentSessionId,
    "owner-enrollment",
  );
  assert.equal(reloadedStore.approvedVoices[0].id, generatedId);
  assert.equal(readProfile.id, generatedId);
  assert.equal(
    createdProfile.id,
    `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-7000`,
  );
  assert.deepEqual(
    sameTimestampStore.approvedVoices.map((profile) => profile.id),
    [
      generatedId,
      `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-7000`,
      `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-7000-2`,
    ],
  );
});

test("approved voice profile storage supports create, read, update, delete, and list without overwriting profiles", async () => {
  let storedValue = null;
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const owner = await createApprovedVoiceProfile(
    storage,
    {
      id: "case-owner",
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        source: "local_settings",
        enrollmentSessionId: "owner-enrollment",
        deviceId: "pixel-local",
      },
      embeddings: [[0.94, 0.2, 0.1]],
    },
    { updatedAtMs: 1_000 },
  );
  const family = await createApprovedVoiceProfile(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.1, 0.91, 0.25]],
    },
    { updatedAtMs: 2_000 },
  );
  await createApprovedVoiceProfile(
    storage,
    {
      id: "case-roommate",
      displayName: "Roommate",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.22, 0.3, 0.93]],
    },
    { updatedAtMs: 3_000 },
  );

  const initialProfiles = await listApprovedVoiceProfiles(storage);
  const ownerSnapshot = JSON.parse(JSON.stringify(owner));
  const roommateSnapshot = JSON.parse(
    JSON.stringify(initialProfiles[2]),
  );
  const readFamily = await readApprovedVoiceProfile(
    storage,
    family.identityId,
  );
  const updatedFamily = await updateApprovedVoiceProfile(
    storage,
    "case-family-member",
    {
      displayName: "Family member updated",
      embeddings: [[0.12, 0.93, 0.2]],
      enrollmentMetadata: {
        source: "local_settings",
        enrollmentSessionId: "family-refresh",
      },
    },
    { updatedAtMs: 4_000 },
  );
  const profilesAfterUpdate = await listApprovedVoiceProfiles(storage);
  const deletedFamily = await deleteApprovedVoiceProfile(
    storage,
    "case-family-member",
    { updatedAtMs: 5_000 },
  );
  const profilesAfterDelete = await listApprovedVoiceProfiles(storage);
  const missingFamily = await readApprovedVoiceProfile(
    storage,
    "case-family-member",
  );

  assert.equal(writes.length, 5);
  assert.deepEqual(
    initialProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(readFamily.displayName, "Family member");
  assert.equal(updatedFamily.displayName, "Family member updated");
  assert.equal(updatedFamily.enrolledAtMs, 2_000);
  assert.equal(updatedFamily.updatedAtMs, 4_000);
  assert.equal(
    updatedFamily.enrollmentMetadata.enrollmentSessionId,
    "family-refresh",
  );
  assert.deepEqual(updatedFamily.voiceprintData[0].vector, [
    0.12,
    0.93,
    0.2,
  ]);
  assert.deepEqual(profilesAfterUpdate[0], ownerSnapshot);
  assert.deepEqual(profilesAfterUpdate[2], roommateSnapshot);
  assert.deepEqual(
    profilesAfterUpdate.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(deletedFamily, true);
  assert.deepEqual(
    profilesAfterDelete.map((profile) => profile.id),
    ["case-owner", "case-roommate"],
  );
  assert.deepEqual(profilesAfterDelete[0], ownerSnapshot);
  assert.deepEqual(profilesAfterDelete[1], roommateSnapshot);
  assert.equal(missingFamily, null);
});

test("approved voice enrollment persistence APIs create, retrieve, list, and remove profiles by identifier without overwriting siblings", async () => {
  let storedValue = null;
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const owner = await createApprovedVoiceProfileByIdentifier(
    storage,
    "case-owner",
    {
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        source: "local_settings",
        enrollmentSessionId: "owner-create-by-id",
      },
      embeddings: [[1, 0, 0]],
    },
    { updatedAtMs: 1_000 },
  );
  const family = await createApprovedVoiceProfile(
    storage,
    "case-family-member",
    {
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0, 1, 0]],
    },
    { updatedAtMs: 2_000 },
  );
  const retrievedOwner = await retrieveApprovedVoiceProfile(
    storage,
    "case-owner",
  );
  const retrievedFamily = await retrieveApprovedVoiceProfileByIdentifier(
    storage,
    "case-family-member",
  );
  const profilesById = await listApprovedVoiceProfilesById(storage);
  const identifiers = await listApprovedVoiceProfileIdentifiers(storage);

  profilesById["case-owner"].displayName = "Mutated clone";
  retrievedOwner.displayName = "Mutated retrieved clone";

  const ownerAfterCloneMutation = await retrieveApprovedVoiceProfileByIdentifier(
    storage,
    "case-owner",
  );
  const removedFamily = await removeApprovedVoiceProfileByIdentifier(
    storage,
    "case-family-member",
    { updatedAtMs: 3_000 },
  );
  const missingFamily = await retrieveApprovedVoiceProfile(
    storage,
    "case-family-member",
  );
  const remainingProfilesById = await listApprovedVoiceProfilesById(storage);
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);

  assert.equal(writes.length, 3);
  assert.equal(owner.id, "case-owner");
  assert.equal(owner.identityId, "case-owner");
  assert.equal(owner.profileId, "case-owner");
  assert.equal(family.id, "case-family-member");
  assert.equal(retrievedFamily.id, "case-family-member");
  assert.deepEqual(Object.keys(profilesById), [
    "case-owner",
    "case-family-member",
  ]);
  assert.deepEqual(identifiers, ["case-owner", "case-family-member"]);
  assert.equal(ownerAfterCloneMutation.displayName, "Owner");
  assert.equal(removedFamily, true);
  assert.equal(missingFamily, null);
  assert.deepEqual(Object.keys(remainingProfilesById), ["case-owner"]);
  assert.equal(remainingProfilesById["case-owner"].displayName, "Owner");
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.deepEqual(Object.keys(reloadedStore.approvedVoiceProfilesById), [
    "case-owner",
  ]);
  assert.equal(storedValue.includes("case-family-member"), false);
});

test("approved voice management adds a new approved voice without modifying or disabling existing enrolled voices", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 700,
        updatedAtMs: 900,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "owner-original",
          deviceId: "owner-phone",
        },
        embeddings: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [1, 0, 0],
            createdAtMs: 710,
          },
        ],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 950,
        embeddings: [
          {
            id: "case-family-member:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0, 1, 0],
            createdAtMs: 810,
          },
        ],
      },
    ],
  });
  const existingProfileSnapshots = existingStore.approvedVoices.map((profile) =>
    JSON.parse(JSON.stringify(profile)),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const addedVoice = await addApprovedVoiceProfile(
    storage,
    {
      id: "case-roommate",
      displayName: "Roommate",
      enrollmentMetadata: {
        source: "local_settings",
        enrollmentSessionId: "roommate-add",
        deviceId: "roommate-phone",
      },
      embeddings: [[0, 0, 1]],
    },
    { updatedAtMs: 2_000 },
  );
  const listedProfiles = await listApprovedVoiceProfiles(storage);
  const approvedGateProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const ownerRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-still-approved",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    approvedGateProfiles,
  );
  const familyRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-still-approved",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    approvedGateProfiles,
  );
  const roommateRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "roommate-new-approved",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(writes.length, 1);
  assert.deepEqual(
    listedProfiles.slice(0, existingProfileSnapshots.length),
    existingProfileSnapshots,
  );
  assert.deepEqual(
    writes[0].approvedVoices.slice(0, existingProfileSnapshots.length),
    existingProfileSnapshots,
  );
  assert.deepEqual(
    listedProfiles.map((profile) => ({
      id: profile.id,
      enabled: profile.enabled,
      approvalState: profile.approvalState,
      approved: profile.approved,
      enrolled: profile.enrolled,
    })),
    [
      {
        id: "case-owner",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        approved: true,
        enrolled: true,
      },
      {
        id: "case-family-member",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        approved: true,
        enrolled: true,
      },
      {
        id: "case-roommate",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        approved: true,
        enrolled: true,
      },
    ],
  );
  assert.equal(addedVoice.id, "case-roommate");
  assert.equal(addedVoice.approvalState, APPROVED_VOICE_APPROVAL_STATE.APPROVED);
  assert.equal(addedVoice.enrolled, true);
  assert.equal(addedVoice.enabled, true);
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(ownerRecognition.accepted, true);
  assert.equal(ownerRecognition.matchedVoiceId, "case-owner");
  assert.equal(familyRecognition.accepted, true);
  assert.equal(familyRecognition.matchedVoiceId, "case-family-member");
  assert.equal(roommateRecognition.accepted, true);
  assert.equal(roommateRecognition.matchedVoiceId, "case-roommate");
});

test("verification confirms a disabled approved voice is rejected while remaining approved voices still pass", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 700,
        updatedAtMs: 900,
        embeddings: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [1, 0, 0],
            createdAtMs: 710,
          },
        ],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 950,
        embeddings: [
          {
            id: "case-family-member:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0, 1, 0],
            createdAtMs: 810,
          },
        ],
      },
      {
        id: "case-roommate",
        displayName: "Roommate",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 850,
        updatedAtMs: 975,
        embeddings: [
          {
            id: "case-roommate:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0, 0, 1],
            createdAtMs: 860,
          },
        ],
      },
    ],
  });
  const existingProfileSnapshots = existingStore.approvedVoices.map((profile) =>
    JSON.parse(JSON.stringify(profile)),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const disabledFamily = await disableApprovedVoiceProfile(
    storage,
    "case-family-member",
    { updatedAtMs: 2_000 },
  );
  const listedProfiles = await listApprovedVoiceProfiles(storage);
  const managementProfiles = await listApprovedVoiceManagementProfiles(storage);
  const approvedGateProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const ownerRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-still-approved",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    approvedGateProfiles,
  );
  const disabledFamilyRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-disabled",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    approvedGateProfiles,
  );
  const roommateRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "roommate-still-approved",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(writes.length, 1);
  assert.deepEqual(
    listedProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(listedProfiles[0], existingProfileSnapshots[0]);
  assert.deepEqual(listedProfiles[2], existingProfileSnapshots[2]);
  assert.equal(disabledFamily.id, "case-family-member");
  assert.equal(disabledFamily.enabled, false);
  assert.equal(disabledFamily.approved, true);
  assert.equal(disabledFamily.enrolled, true);
  assert.equal(
    disabledFamily.approvalState,
    APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );
  assert.equal(disabledFamily.updatedAtMs, 2_000);
  assert.equal(disabledFamily.enrollmentMetadata.updatedAtMs, 2_000);
  assert.deepEqual(
    disabledFamily.voiceprintData,
    existingProfileSnapshots[1].voiceprintData,
  );
  assert.deepEqual(
    managementProfiles.map((profile) => ({
      id: profile.id,
      enabled: profile.enabled,
      disabled: profile.disabled,
      enabledStatus: profile.enabledStatus,
    })),
    [
      {
        id: "case-owner",
        enabled: true,
        disabled: false,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.ENABLED,
      },
      {
        id: "case-family-member",
        enabled: false,
        disabled: true,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.DISABLED,
      },
      {
        id: "case-roommate",
        enabled: true,
        disabled: false,
        enabledStatus: APPROVED_VOICE_ENABLED_STATUS.ENABLED,
      },
    ],
  );
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    ["case-owner", "case-roommate"],
  );
  assert.equal(ownerRecognition.accepted, true);
  assert.equal(ownerRecognition.matchedVoiceId, "case-owner");
  assert.equal(disabledFamilyRecognition.accepted, false);
  assert.equal(disabledFamilyRecognition.matchedVoiceId, null);
  assert.equal(roommateRecognition.accepted, true);
  assert.equal(roommateRecognition.matchedVoiceId, "case-roommate");
});

test("verification confirms a removed approved voice is rejected while remaining approved voices still pass", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 700,
        updatedAtMs: 900,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "owner-original",
          deviceId: "owner-phone",
        },
        voiceprintData: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [1, 0, 0],
            createdAtMs: 710,
          },
        ],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 950,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "family-remove-session",
          deviceId: "family-remove-phone",
        },
        voiceprintData: [
          {
            id: "case-family-member:remove-enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0, 1, 0],
            createdAtMs: 810,
          },
          {
            id: "case-family-member:remove-enrollment:2",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.01, 0.99, 0],
            createdAtMs: 820,
          },
        ],
      },
      {
        id: "case-roommate",
        displayName: "Roommate",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 850,
        updatedAtMs: 975,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "roommate-original",
          deviceId: "roommate-phone",
        },
        voiceprintData: [
          {
            id: "case-roommate:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0, 0, 1],
            createdAtMs: 860,
          },
        ],
      },
    ],
  });
  const existingProfileSnapshots = existingStore.approvedVoices.map((profile) =>
    JSON.parse(JSON.stringify(profile)),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const removedFamily = await removeApprovedVoiceProfile(
    storage,
    "case-family-member",
    { updatedAtMs: 2_000 },
  );
  const storedValueAfterRemove = storedValue;
  const missingRemove = await removeApprovedVoiceProfile(
    storage,
    "case-family-member",
    { updatedAtMs: 3_000 },
  );
  const listedProfiles = await listApprovedVoiceProfiles(storage);
  const managementProfiles = await listApprovedVoiceManagementProfiles(storage);
  const approvedGateProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const missingFamily = await readApprovedVoiceProfile(
    storage,
    "case-family-member",
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const ownerRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-still-approved",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    approvedGateProfiles,
  );
  const removedFamilyRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-removed",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    approvedGateProfiles,
  );
  const roommateRecognition = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "roommate-still-approved",
        timestampMs: 0,
        embedding: [0, 0, 1],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(removedFamily, true);
  assert.equal(missingRemove, false);
  assert.equal(writes.length, 1);
  assert.equal(storedValue, storedValueAfterRemove);
  assert.equal(reloadedStore.updatedAtMs, 2_000);
  assert.deepEqual(
    listedProfiles.map((profile) => profile.id),
    ["case-owner", "case-roommate"],
  );
  assert.deepEqual(listedProfiles[0], existingProfileSnapshots[0]);
  assert.deepEqual(listedProfiles[1], existingProfileSnapshots[2]);
  assert.deepEqual(writes[0].approvedVoices, [
    existingProfileSnapshots[0],
    existingProfileSnapshots[2],
  ]);
  assert.equal(missingFamily, null);
  for (const removedEnrollmentMarker of [
    "case-family-member",
    "family-remove-session",
    "family-remove-phone",
    "case-family-member:remove-enrollment:1",
    "case-family-member:remove-enrollment:2",
  ]) {
    assert.equal(storedValue.includes(removedEnrollmentMarker), false);
  }
  assert.deepEqual(
    managementProfiles.map((profile) => ({
      id: profile.id,
      voiceprintCount: profile.voiceprintCount,
      enabled: profile.enabled,
      enrolled: profile.enrolled,
    })),
    [
      {
        id: "case-owner",
        voiceprintCount: 1,
        enabled: true,
        enrolled: true,
      },
      {
        id: "case-roommate",
        voiceprintCount: 1,
        enabled: true,
        enrolled: true,
      },
    ],
  );
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    ["case-owner", "case-roommate"],
  );
  assert.equal(ownerRecognition.accepted, true);
  assert.equal(ownerRecognition.matchedVoiceId, "case-owner");
  assert.equal(removedFamilyRecognition.accepted, false);
  assert.equal(removedFamilyRecognition.matchedVoiceId, null);
  assert.equal(roommateRecognition.accepted, true);
  assert.equal(roommateRecognition.matchedVoiceId, "case-roommate");
});

test("approved voice profile update changes only the selected profile approval state", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.94, 0.2, 0.1]],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.1, 0.91, 0.25]],
      },
    ],
  });
  const ownerSnapshot = JSON.parse(
    JSON.stringify(existingStore.approvedVoices[0]),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const storage = {
    getItem() {
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const updatedFamily = await updateApprovedVoiceProfile(
    storage,
    "case-family-member",
    { approved: false },
    { updatedAtMs: 2_000 },
  );
  const reloadedProfiles = await listApprovedVoiceProfiles(storage);

  assert.deepEqual(reloadedProfiles[0], ownerSnapshot);
  assert.equal(
    updatedFamily.approvalState,
    APPROVED_VOICE_APPROVAL_STATE.REVOKED,
  );
  assert.equal(updatedFamily.approved, false);
  assert.equal(updatedFamily.updatedAtMs, 2_000);
  assert.equal(
    updatedFamily.voiceprintData[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.REVOKED,
  );
  assert.deepEqual(
    reloadedProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
});

test("approved voice storage preserves multiple approved profiles and distinct identifiers across enrollment updates", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner-profile",
        voiceId: "case-owner-phone-voice",
        displayName: "Owner phone voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 900,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "owner-original",
          deviceId: "owner-phone",
        },
        voiceprintData: [
          {
            id: "case-owner-phone-voice:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
            createdAtMs: 810,
          },
        ],
      },
      {
        id: "case-family-profile",
        voiceId: "case-family-tablet-voice",
        displayName: "Family tablet voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 850,
        updatedAtMs: 950,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "family-original",
          deviceId: "family-tablet",
        },
        voiceprintData: [
          {
            id: "case-family-tablet-voice:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.1, 0.91, 0.25],
            createdAtMs: 860,
          },
        ],
      },
      {
        id: "case-roommate-profile",
        voiceId: "case-roommate-mic-voice",
        displayName: "Roommate mic voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 875,
        updatedAtMs: 975,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "roommate-original",
          deviceId: "roommate-mic",
        },
        voiceprintData: [
          {
            id: "case-roommate-mic-voice:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.22, 0.3, 0.93],
            createdAtMs: 880,
          },
        ],
      },
    ],
  });
  const existingProfileSnapshots = existingStore.approvedVoices.map((profile) =>
    JSON.parse(JSON.stringify(profile)),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      writes.push(JSON.parse(value));
      storedValue = value;
    },
  };

  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-profile",
      displayName: "Family tablet voice refreshed",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        enrollmentSessionId: "family-refresh",
      },
      voiceprintData: [
        {
          id: "case-family-tablet-voice:enrollment:2",
          modelId: "case-local-speaker-embedding-v1",
          vector: [0.12, 0.93, 0.2],
          createdAtMs: 2_000,
        },
      ],
    },
    {
      duplicateIdentityPolicy:
        APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.UPDATE_MATCHING_PROFILE,
      updatedAtMs: 2_000,
    },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const updatedFamily = reloadedStore.approvedVoices[1];

  assert.equal(writes.length, 1);
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.id),
    [
      "case-owner-phone-voice",
      "case-family-tablet-voice",
      "case-roommate-mic-voice",
    ],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.profileId),
    ["case-owner-profile", "case-family-profile", "case-roommate-profile"],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.identityId),
    [
      "case-owner-phone-voice",
      "case-family-tablet-voice",
      "case-roommate-mic-voice",
    ],
  );
  assert.equal(
    new Set(reloadedStore.approvedVoices.map((profile) => profile.identityId))
      .size,
    3,
  );
  assert.equal(
    new Set(reloadedStore.approvedVoices.map((profile) => profile.profileId))
      .size,
    3,
  );
  assert.equal(
    new Set(
      reloadedStore.approvedVoices.flatMap((profile) =>
        profile.voiceprintData.map((voiceprint) => voiceprint.id),
      ),
    ).size,
    3,
  );
  assert.deepEqual(nextStore.approvedVoices[0], existingProfileSnapshots[0]);
  assert.deepEqual(nextStore.approvedVoices[2], existingProfileSnapshots[2]);
  assert.deepEqual(
    reloadedStore.approvedVoices[0],
    existingProfileSnapshots[0],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices[2],
    existingProfileSnapshots[2],
  );
  assert.equal(updatedFamily.id, "case-family-tablet-voice");
  assert.equal(updatedFamily.identityId, "case-family-tablet-voice");
  assert.equal(updatedFamily.profileId, "case-family-profile");
  assert.equal(updatedFamily.displayName, "Family tablet voice refreshed");
  assert.equal(updatedFamily.enrolledAtMs, 850);
  assert.equal(updatedFamily.updatedAtMs, 2_000);
  assert.equal(updatedFamily.enrollmentMetadata.identityId, updatedFamily.id);
  assert.equal(
    updatedFamily.enrollmentMetadata.profileId,
    updatedFamily.profileId,
  );
  assert.equal(updatedFamily.enrollmentMetadata.source, "local_settings");
  assert.equal(
    updatedFamily.enrollmentMetadata.enrollmentSessionId,
    "family-refresh",
  );
  assert.equal(updatedFamily.enrollmentMetadata.deviceId, "family-tablet");
  assert.deepEqual(updatedFamily.voiceprintData[0], {
    id: "case-family-tablet-voice:enrollment:2",
    modelId: "case-local-speaker-embedding-v1",
    approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    createdAtMs: 2_000,
    vector: [0.12, 0.93, 0.2],
  });
});

test("approved voice enrollment stores multiple voice identities for one profile", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner-profile",
        voiceId: "case-owner-phone-voice",
        displayName: "Owner phone voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 900,
        updatedAtMs: 950,
        embeddings: [[0.94, 0.2, 0.1]],
      },
    ],
  });
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-owner-profile",
      voiceId: "case-owner-watch-voice",
      displayName: "Owner watch voice",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.91, 0.25, 0.12]],
    },
    { updatedAtMs: 2_000 },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const approvedGateProfiles = toVoiceGateApprovedVoiceProfiles(reloadedStore);
  const recognitionResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-watch-approved",
        timestampMs: 0,
        embedding: [0.9, 0.25, 0.13],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(nextStore.approvedVoices.length, 2);
  assert.deepEqual(nextStore.approvedVoices[0], existingStore.approvedVoices[0]);
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.profileId),
    ["case-owner-profile", "case-owner-profile"],
  );
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.identityId),
    ["case-owner-phone-voice", "case-owner-watch-voice"],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.identityId),
    ["case-owner-phone-voice", "case-owner-watch-voice"],
  );
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.profileId),
    ["case-owner-profile", "case-owner-profile"],
  );
  assert.equal(recognitionResult.accepted, true);
  assert.equal(recognitionResult.matchedVoiceId, "case-owner-watch-voice");
});

test("approved voice enrollment authorizes the first approved voice", async () => {
  let storedValue = null;
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const enrolledStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-owner",
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.94, 0.2, 0.1]],
    },
    { updatedAtMs: 1_000 },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const approvedGateProfiles = toVoiceGateApprovedVoiceProfiles(reloadedStore);
  const recognitionResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "owner-first-approved",
        timestampMs: 0,
        embedding: [0.95, 0.18, 0.08],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(enrolledStore.approvedVoices.length, 1);
  assert.equal(enrolledStore.approvedVoices[0].approved, true);
  assert.equal(enrolledStore.approvedVoices[0].enrolled, true);
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(recognitionResult.accepted, true);
  assert.equal(recognitionResult.matchedVoiceId, "case-owner");
  assert.equal(recognitionResult.reason, "high_confidence_match");
  assert.ok((recognitionResult.latencyMs || 0) < 1_000);
});

test("approved voice enrollment authorizes a second distinct approved voice", async () => {
  let storedValue = null;
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-owner",
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.94, 0.2, 0.1]],
    },
    { updatedAtMs: 1_000 },
  );
  const enrolledStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.1, 0.91, 0.25]],
    },
    { updatedAtMs: 2_000 },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);
  const approvedGateProfiles = toVoiceGateApprovedVoiceProfiles(reloadedStore);
  const recognitionResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "family-second-approved",
        timestampMs: 0,
        embedding: [0.08, 0.9, 0.24],
      },
      {
        utteranceId: "family-second-approved",
        timestampMs: 120,
        embedding: [0.13, 0.88, 0.27],
      },
    ],
    approvedGateProfiles,
  );

  assert.equal(enrolledStore.approvedVoices.length, 2);
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.equal(enrolledStore.approvedVoices[1].approved, true);
  assert.equal(enrolledStore.approvedVoices[1].enrolled, true);
  assert.equal(recognitionResult.accepted, true);
  assert.equal(recognitionResult.matchedVoiceId, "case-family-member");
  assert.equal(recognitionResult.reason, "high_confidence_match");
  assert.ok((recognitionResult.latencyMs || 0) < 1_000);
  assert.deepEqual(
    recognitionResult.candidateScores.map(
      (candidateScore) => candidateScore.profileId,
    ),
    ["case-owner", "case-family-member"],
  );
});

test("approved voice enrollment persists multiple approved profiles across sequential enrollments", async () => {
  let storedValue = null;
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-owner",
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.94, 0.2, 0.1]],
    },
    { updatedAtMs: 1_000 },
  );
  await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.1, 0.91, 0.25]],
    },
    { updatedAtMs: 2_000 },
  );
  const finalStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-roommate",
      displayName: "Roommate",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.22, 0.3, 0.93]],
    },
    { updatedAtMs: 3_000 },
  );

  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);

  assert.deepEqual(
    finalStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.equal(reloadedStore.approvedVoices[0].enrolledAtMs, 1_000);
  assert.equal(reloadedStore.approvedVoices[1].enrolledAtMs, 2_000);
  assert.equal(reloadedStore.approvedVoices[2].enrolledAtMs, 3_000);
  assert.equal(createApprovedVoiceGate({
    approvedVoices: toVoiceGateApprovedVoiceProfiles(reloadedStore),
  }).getApprovedVoiceCount(), 3);
});

test("approved voice recognition accepts every enrolled approved voice loaded for recognition", async () => {
  let storedValue = null;
  const storage = {
    getItem(key) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };
  const approvedEnrollments = [
    {
      id: "case-owner",
      displayName: "Owner",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[1, 0, 0]],
      acceptedFrames: [
        { utteranceId: "owner-approved", timestampMs: 0, embedding: [1, 0, 0] },
        {
          utteranceId: "owner-approved",
          timestampMs: 120,
          embedding: [0.99, 0.02, 0],
        },
      ],
    },
    {
      id: "case-family-member",
      displayName: "Family member",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0, 1, 0]],
      acceptedFrames: [
        {
          utteranceId: "family-approved",
          timestampMs: 0,
          embedding: [0, 1, 0],
        },
        {
          utteranceId: "family-approved",
          timestampMs: 120,
          embedding: [0.01, 0.99, 0],
        },
      ],
    },
    {
      id: "case-roommate",
      displayName: "Roommate",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0, 0, 1]],
      acceptedFrames: [
        {
          utteranceId: "roommate-approved",
          timestampMs: 0,
          embedding: [0, 0, 1],
        },
        {
          utteranceId: "roommate-approved",
          timestampMs: 120,
          embedding: [0, 0.02, 0.99],
        },
      ],
    },
  ];

  for (const [index, enrollment] of approvedEnrollments.entries()) {
    await persistApprovedVoiceProfileEnrollment(
      storage,
      enrollment,
      { updatedAtMs: (index + 1) * 1_000 },
    );
  }

  const approvedGateProfiles =
    await loadApprovedVoiceProfilesForRecognition(storage);
  const recognitionResults = approvedEnrollments.map((enrollment) =>
    recognizeApprovedVoiceUtterance(
      enrollment.acceptedFrames,
      approvedGateProfiles,
    ),
  );

  assert.equal(approvedGateProfiles.length, approvedEnrollments.length);
  assert.deepEqual(
    approvedGateProfiles.map((profile) => profile.id),
    approvedEnrollments.map((enrollment) => enrollment.id),
  );
  assert.equal(
    approvedGateProfiles.every(
      (profile) => profile.approved === true && profile.enrolled === true,
    ),
    true,
  );

  for (const [index, result] of recognitionResults.entries()) {
    const expectedVoiceId = approvedEnrollments[index].id;

    assert.equal(result.accepted, true);
    assert.equal(result.matchedVoiceId, expectedVoiceId);
    assert.equal(result.downstreamAuthorization.matchedVoiceId, expectedVoiceId);
    assert.ok((result.latencyMs || 0) < 1_000);
    assert.deepEqual(
      result.candidateScores.map((candidateScore) => candidateScore.profileId),
      approvedEnrollments.map((enrollment) => enrollment.id),
    );
  }
});

test("approved voice persistence reload keeps existing profile data when adding voices", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 900,
        embeddings: [
          {
            id: "case-owner:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.94, 0.2, 0.1],
            createdAtMs: 810,
          },
          {
            id: "case-owner:enrollment:2",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.9, 0.25, 0.12],
            createdAtMs: 820,
          },
        ],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        enabled: true,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 850,
        updatedAtMs: 950,
        embeddings: [
          {
            id: "case-family-member:enrollment:1",
            modelId: "case-local-speaker-embedding-v1",
            vector: [0.1, 0.91, 0.25],
            createdAtMs: 860,
          },
        ],
      },
    ],
  });
  const existingProfileSnapshot = existingStore.approvedVoices.map((profile) =>
    JSON.parse(JSON.stringify(profile)),
  );
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const storage = {
    getItem() {
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-roommate",
      displayName: "Roommate",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.22, 0.3, 0.93]],
    },
    { updatedAtMs: 2_000 },
  );
  const reloadedStore = parseApprovedVoiceProfileStore(storedValue);

  assert.deepEqual(
    nextStore.approvedVoices.slice(0, existingProfileSnapshot.length),
    existingProfileSnapshot,
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.slice(0, existingProfileSnapshot.length),
    existingProfileSnapshot,
  );
  assert.deepEqual(
    reloadedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(reloadedStore.approvedVoices[2].embeddings[0].vector, [
    0.22,
    0.3,
    0.93,
  ]);
});

test("approved voice enrollment persistence rejects duplicate ids before writing", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 900,
        updatedAtMs: 950,
        embeddings: [[0.94, 0.2, 0.1]],
      },
    ],
  });
  let writeCount = 0;
  const storage = {
    getItem() {
      return serializeApprovedVoiceProfileStore(existingStore);
    },
    setItem() {
      writeCount += 1;
    },
  };

  await assert.rejects(
    () =>
      persistApprovedVoiceProfileEnrollment(
        storage,
        {
          id: "case-owner",
          approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
          embeddings: [[0.93, 0.22, 0.11]],
        },
        { updatedAtMs: 2_000 },
      ),
    /duplicate approved voice profile id: case-owner/,
  );
  assert.equal(writeCount, 0);
});

test("approved voice enrollment explicitly updates only the matching duplicate identity", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner",
        displayName: "Owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 900,
        embeddings: [[0.94, 0.2, 0.1]],
      },
      {
        id: "case-family-member",
        displayName: "Family member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 850,
        updatedAtMs: 950,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "family-original",
          deviceId: "pixel-local",
        },
        embeddings: [[0.1, 0.91, 0.25]],
      },
      {
        id: "case-roommate",
        displayName: "Roommate",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 875,
        updatedAtMs: 975,
        embeddings: [[0.22, 0.3, 0.93]],
      },
    ],
  });
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const writes = [];
  const storage = {
    getItem() {
      return storedValue;
    },
    setItem(key, value) {
      writes.push({ key, value });
      storedValue = value;
    },
  };

  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      id: "case-family-member",
      displayName: "Family member updated",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      embeddings: [[0.12, 0.93, 0.2]],
    },
    {
      duplicateIdentityPolicy:
        APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.UPDATE_MATCHING_PROFILE,
      updatedAtMs: 2_000,
    },
  );
  const persistedStore = JSON.parse(storedValue);

  assert.equal(writes.length, 1);
  assert.deepEqual(
    nextStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
  assert.deepEqual(nextStore.approvedVoices[0], existingStore.approvedVoices[0]);
  assert.deepEqual(nextStore.approvedVoices[2], existingStore.approvedVoices[2]);
  assert.equal(
    nextStore.approvedVoices[1].displayName,
    "Family member updated",
  );
  assert.equal(nextStore.approvedVoices[1].enrolledAtMs, 850);
  assert.equal(nextStore.approvedVoices[1].updatedAtMs, 2_000);
  assert.equal(
    nextStore.approvedVoices[1].enrollmentMetadata.source,
    "local_settings",
  );
  assert.equal(
    nextStore.approvedVoices[1].enrollmentMetadata.enrollmentSessionId,
    "family-original",
  );
  assert.equal(
    nextStore.approvedVoices[1].enrollmentMetadata.deviceId,
    "pixel-local",
  );
  assert.equal(nextStore.approvedVoices[1].enrollmentMetadata.voiceprintCount, 1);
  assert.equal(nextStore.approvedVoices[1].enrollmentMetadata.updatedAtMs, 2_000);
  assert.deepEqual(nextStore.approvedVoices[1].embeddings[0].vector, [
    0.12,
    0.93,
    0.2,
  ]);
  assert.deepEqual(
    persistedStore.approvedVoices.map((profile) => profile.id),
    ["case-owner", "case-family-member", "case-roommate"],
  );
});

test("approved voice re-enrollment updates preserve existing stable identifiers", async () => {
  const existingStore = createApprovedVoiceProfileStore({
    updatedAtMs: 1_000,
    approvedVoices: [
      {
        id: "case-owner-profile",
        voiceId: "case-owner-phone-voice",
        displayName: "Owner phone voice",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolledAtMs: 800,
        updatedAtMs: 900,
        enrollmentMetadata: {
          source: "local_settings",
          enrollmentSessionId: "owner-original",
          deviceId: "pixel-local",
        },
        embeddings: [[0.94, 0.2, 0.1]],
      },
    ],
  });
  let storedValue = serializeApprovedVoiceProfileStore(existingStore);
  const storage = {
    getItem() {
      return storedValue;
    },
    setItem(key, value) {
      assert.equal(key, APPROVED_VOICE_PROFILE_STORE_KEY);
      storedValue = value;
    },
  };

  const voiceIdentityUpdate = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      voiceId: "case-owner-phone-voice",
      displayName: "Owner phone voice refreshed",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        enrollmentSessionId: "owner-refresh-by-voice",
      },
      embeddings: [[0.93, 0.24, 0.12]],
    },
    {
      duplicateIdentityPolicy:
        APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.UPDATE_MATCHING_PROFILE,
      updatedAtMs: 2_000,
    },
  );
  const profileIdentityUpdate = await persistApprovedVoiceProfileEnrollment(
    storage,
    {
      profileId: "case-owner-profile",
      displayName: "Owner phone voice refreshed again",
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      enrollmentMetadata: {
        enrollmentSessionId: "owner-refresh-by-profile",
      },
      embeddings: [[0.92, 0.26, 0.13]],
    },
    {
      duplicateIdentityPolicy:
        APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.UPDATE_MATCHING_PROFILE,
      updatedAtMs: 3_000,
    },
  );
  const reloadedProfile = parseApprovedVoiceProfileStore(storedValue)
    .approvedVoices[0];

  assert.equal(voiceIdentityUpdate.approvedVoices.length, 1);
  assert.equal(
    voiceIdentityUpdate.approvedVoices[0].identityId,
    "case-owner-phone-voice",
  );
  assert.equal(
    voiceIdentityUpdate.approvedVoices[0].profileId,
    "case-owner-profile",
  );
  assert.equal(voiceIdentityUpdate.approvedVoices[0].enrolledAtMs, 800);
  assert.equal(
    voiceIdentityUpdate.approvedVoices[0].enrollmentMetadata.identityId,
    "case-owner-phone-voice",
  );
  assert.equal(
    voiceIdentityUpdate.approvedVoices[0].enrollmentMetadata.profileId,
    "case-owner-profile",
  );
  assert.equal(profileIdentityUpdate.approvedVoices.length, 1);
  assert.equal(
    profileIdentityUpdate.approvedVoices[0].identityId,
    "case-owner-phone-voice",
  );
  assert.equal(
    profileIdentityUpdate.approvedVoices[0].profileId,
    "case-owner-profile",
  );
  assert.equal(profileIdentityUpdate.approvedVoices[0].enrolledAtMs, 800);
  assert.equal(profileIdentityUpdate.approvedVoices[0].updatedAtMs, 3_000);
  assert.equal(
    profileIdentityUpdate.approvedVoices[0].enrollmentMetadata
      .enrollmentSessionId,
    "owner-refresh-by-profile",
  );
  assert.deepEqual(
    profileIdentityUpdate.approvedVoices[0].voiceprintData[0].vector,
    [0.92, 0.26, 0.13],
  );
  assert.equal(reloadedProfile.identityId, "case-owner-phone-voice");
  assert.equal(reloadedProfile.profileId, "case-owner-profile");
});

test("approved voice profile schema rejects missing or duplicate stable profile ids", () => {
  assert.throws(
    () =>
      createApprovedVoiceProfileStore({
        approvedVoices: [{ embeddings: [[0.8, 0.3, 0.1]] }],
      }),
    /stable non-empty profile id/,
  );

  assert.throws(
    () =>
      createApprovedVoiceProfileStore({
        approvedVoices: [
          { id: "case-owner", embeddings: [[0.8, 0.3, 0.1]] },
          { id: "case-owner", embeddings: [[0.1, 0.8, 0.3]] },
        ],
      }),
    /duplicate approved voice profile id: case-owner/,
  );
});

test("approved voice profile schema requires usable embedding data", () => {
  assert.throws(
    () =>
      createApprovedVoiceProfileStore({
        approvedVoices: [
          {
            id: "case-owner",
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            embeddings: [],
          },
        ],
      }),
    /at least one embedding/,
  );

  assert.throws(
    () =>
      createApprovedVoiceProfileStore({
        approvedVoices: [
          {
            id: "case-owner",
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            embeddings: [[0, 0, 0]],
          },
        ],
      }),
    /zero-vector embedding/,
  );
});

test("stored approved profiles convert into voice gate profiles without synthetic ids", () => {
  const store = createApprovedVoiceProfileStore({
    approvedVoices: [
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.94, 0.2, 0.1]],
      },
      {
        id: "disabled-guest",
        enabled: false,
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.1, 0.9, 0.2]],
      },
      {
        id: "unapproved-neighbor",
        approved: false,
        enrolled: true,
        embeddings: [[0.2, 0.1, 0.93]],
      },
      {
        id: "unenrolled-relative",
        approved: true,
        enrolled: false,
        embeddings: [],
      },
      {
        id: "case-family-member",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        embeddings: [[0.1, 0.91, 0.25]],
      },
    ],
  });

  const gateProfiles = toVoiceGateApprovedVoiceProfiles(store);

  assert.equal(store.approvedVoices[0].approved, true);
  assert.equal(store.approvedVoices[0].enrolled, true);
  assert.equal(
    store.approvedVoices[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );
  assert.equal(
    store.approvedVoices.find((profile) => profile.id === "unapproved-neighbor")
      .approved,
    false,
  );
  assert.equal(
    store.approvedVoices.find((profile) => profile.id === "unapproved-neighbor")
      .approvalState,
    APPROVED_VOICE_APPROVAL_STATE.REVOKED,
  );
  assert.equal(
    store.approvedVoices.find((profile) => profile.id === "unenrolled-relative")
      .enrolled,
    false,
  );
  assert.deepEqual(
    gateProfiles.map((profile) => profile.id),
    ["case-owner", "case-family-member"],
  );
  assert.equal(gateProfiles[0].approved, true);
  assert.equal(gateProfiles[0].enrolled, true);
  assert.deepEqual(gateProfiles[0].embeddings, [[0.94, 0.2, 0.1]]);
});

test("stored voices without explicit processing approval cannot authorize matching", () => {
  const store = createApprovedVoiceProfileStore({
    approvedVoices: [
      {
        id: "legacy-unmarked-profile",
        enrolled: true,
        embeddings: [[1, 0, 0]],
      },
      {
        id: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        embeddings: [[0, 1, 0]],
      },
    ],
  });
  const gateProfiles = toVoiceGateApprovedVoiceProfiles(store);
  const unmarkedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "legacy-unmarked-profile",
        timestampMs: 0,
        embedding: [1, 0, 0],
      },
    ],
    store,
  );
  const approvedResult = recognizeApprovedVoiceUtterance(
    [
      {
        utteranceId: "case-owner",
        timestampMs: 0,
        embedding: [0, 1, 0],
      },
    ],
    store,
  );

  assert.equal(
    store.approvedVoices[0].approvalState,
    APPROVED_VOICE_APPROVAL_STATE.PENDING,
  );
  assert.equal(store.approvedVoices[0].approved, false);
  assert.deepEqual(
    gateProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(unmarkedResult.accepted, false);
  assert.equal(unmarkedResult.matchedVoiceId, null);
  assert.equal(approvedResult.accepted, true);
  assert.equal(approvedResult.matchedVoiceId, "case-owner");
});

test("voice identity approval state excludes stored voiceprints from recognition candidates", () => {
  const gate = createApprovedVoiceGate({
    approvedVoices: [
      {
        identityId: "case-owner",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
        enrolled: true,
        voiceprintData: [[0.94, 0.2, 0.1]],
      },
      {
        identityId: "pending-guest",
        approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
        enrolled: true,
        voiceprintData: [[0.1, 0.91, 0.25]],
      },
    ],
  });

  const result = gate.observeFrame({
    utteranceId: "pending-guest-should-not-authorize",
    timestampMs: 0,
    embedding: [0.1, 0.91, 0.25],
  });

  assert.equal(result.accepted, false);
  assert.equal(result.matchedVoiceId, null);
  assert.equal(result.rejectedVoiceId, null);
  assert.equal(result.reason, "below_threshold");
});

test("voice gate uses voiceprint approval metadata only to select approved recognition candidates", () => {
  const gate = createApprovedVoiceGate({
    approvedVoices: [
      {
        identityId: "case-owner",
        enrolled: true,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
            vector: [0.94, 0.2, 0.1],
          },
        ],
      },
      {
        identityId: "pending-guest",
        enrolled: true,
        voiceprintData: [
          {
            approvalState: APPROVED_VOICE_APPROVAL_STATE.PENDING,
            vector: [0.1, 0.91, 0.25],
          },
        ],
      },
    ],
  });

  const result = gate.observeFrame({
    utteranceId: "pending-guest-voiceprint-state",
    timestampMs: 0,
    embedding: [0.1, 0.91, 0.25],
  });

  assert.equal(gate.getApprovedVoiceCount(), 1);
  assert.equal(result.accepted, false);
  assert.equal(result.matchedVoiceId, null);
  assert.equal(result.rejectedVoiceId, null);
  assert.equal(result.reason, "below_threshold");
});

test("voice gate preparation enforces explicit approved profile ids", () => {
  assert.throws(
    () =>
      prepareApprovedVoiceProfiles([
        { approved: true, enrolled: true, embeddings: [[0.8, 0.3, 0.1]] },
      ]),
    /stable non-empty profile id/,
  );
  const preparedProfiles = prepareApprovedVoiceProfiles([
    { id: "legacy-unmarked-profile", embeddings: [[0.8, 0.3, 0.1]] },
    { approved: false, enrolled: true, embeddings: [[0.2, 0.1, 0.93]] },
    { approved: true, enrolled: false },
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[0.94, 0.2, 0.1]],
    },
  ]);

  const gate = createApprovedVoiceGate({
    approvedVoices: [
      {
        id: "case-owner",
        approved: true,
        enrolled: true,
        embeddings: [[0.94, 0.2, 0.1]],
      },
      {
        id: "case-family-member",
        approved: true,
        enrolled: true,
        embeddings: [[0.1, 0.91, 0.25]],
      },
    ],
  });

  assert.deepEqual(
    preparedProfiles.map((profile) => profile.id),
    ["case-owner"],
  );
  assert.equal(gate.getApprovedVoiceCount(), 2);
});
