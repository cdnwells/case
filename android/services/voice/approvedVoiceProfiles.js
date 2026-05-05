"use strict";

const APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION = 1;
const APPROVED_VOICE_PROFILE_STORE_KEY =
  "case.voiceGate.approvedVoiceProfiles.v1";
const APPROVED_VOICE_PROFILE_COLLECTION_FIELD =
  "approvedVoiceProfilesById";
const APPROVED_VOICE_PROFILE_COMPATIBILITY_LIST_FIELD = "approvedVoices";
const APPROVED_VOICE_PROFILE_COLLECTION_KEY_FIELD = "id";
const DEFAULT_VOICE_EMBEDDING_MODEL_ID = "case-local-speaker-embedding-v1";
const APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX = "case-approved-voice";
const LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID =
  `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-legacy-single-enrolled-voice`;
const LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_FIELDS = Object.freeze([
  "singleEnrolledVoice",
  "enrolledVoice",
  "enrolledVoiceProfile",
  "voiceProfile",
  "voiceprintProfile",
  "speakerProfile",
  "voiceIdentity",
]);
const LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_LIST_FIELDS = Object.freeze([
  "enrolledVoices",
  "voiceProfiles",
  "voiceprintProfiles",
  "speakerProfiles",
]);
const APPROVED_VOICE_APPROVAL_STATE = Object.freeze(
  Object.defineProperty(
    {
      APPROVED: "approved",
      PENDING: "pending",
      REVOKED: "revoked",
    },
    "UNAPPROVED",
    {
      enumerable: false,
      value: "revoked",
    },
  ),
);
const APPROVED_VOICE_APPROVAL_STATE_VALUES = Object.freeze([
  APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  APPROVED_VOICE_APPROVAL_STATE.PENDING,
  APPROVED_VOICE_APPROVAL_STATE.REVOKED,
]);
const APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY = Object.freeze({
  REJECT: "reject",
  UPDATE_MATCHING_PROFILE: "update_matching_profile",
});
const APPROVED_VOICE_ENABLED_STATUS = Object.freeze({
  ENABLED: "enabled",
  DISABLED: "disabled",
});
const DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE = "local_device";
const APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA = Object.freeze({
  enrollmentMetadataField: "enrollmentMetadata",
  profileIdField: "profileId",
  identityIdField: "identityId",
  enrolledAtMsField: "enrolledAtMs",
  updatedAtMsField: "updatedAtMs",
  sourceField: "source",
  enrollmentSessionIdField: "enrollmentSessionId",
  deviceIdField: "deviceId",
  voiceprintCountField: "voiceprintCount",
  embeddingModelIdsField: "embeddingModelIds",
});
const APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS = Object.freeze([
  "profileId",
  "identityId",
]);

const APPROVED_VOICE_IDENTITY_STORAGE_MODEL = Object.freeze({
  schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
  storageKey: APPROVED_VOICE_PROFILE_STORE_KEY,
  rootField: APPROVED_VOICE_PROFILE_COLLECTION_FIELD,
  collectionKeyField: APPROVED_VOICE_PROFILE_COLLECTION_KEY_FIELD,
  legacyRootField: APPROVED_VOICE_PROFILE_COMPATIBILITY_LIST_FIELD,
  profileIdField: "profileId",
  identityIdField: "identityId",
  stableProfileIdentifierFields: APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS,
  voiceprintDataField: "voiceprintData",
  approvalStateField: "approvalState",
  voiceprintApprovalStateField: "approvalState",
  enrollmentMetadataField: "enrollmentMetadata",
  enrollmentMetadataSchema: APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  legacyProfileIdentityField: "id",
  legacyVoiceprintDataField: "embeddings",
  legacyApprovalBooleanField: "approved",
  supportsMultipleApprovedProfiles: true,
  supportsMultipleVoiceIdentitiesPerProfile: true,
});

const APPROVED_VOICE_PROFILE_STORE_SCHEMA = Object.freeze({
  schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
  storageKey: APPROVED_VOICE_PROFILE_STORE_KEY,
  rootField: APPROVED_VOICE_PROFILE_COLLECTION_FIELD,
  collectionKeyField: APPROVED_VOICE_PROFILE_COLLECTION_KEY_FIELD,
  legacyRootField: APPROVED_VOICE_PROFILE_COMPATIBILITY_LIST_FIELD,
  profileIdField: "profileId",
  profileIdentityField: "identityId",
  identityIdField: "identityId",
  stableProfileIdentifierFields: APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS,
  approvalStateField: "approvalState",
  approvalBooleanField: "approved",
  enrollmentStateField: "enrolled",
  enrollmentMetadataField: "enrollmentMetadata",
  enrollmentMetadataSchema: APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  voiceprintDataField: "voiceprintData",
  voiceprintApprovalStateField: "approvalState",
  embeddingRecordsField: "embeddings",
  embeddingVectorField: "vector",
  legacyProfileIdentityField: "id",
  legacyVoiceprintDataField: "embeddings",
  legacyApprovalBooleanField: "approved",
  profileIdRequired: true,
  approvalStateRequired: true,
  supportsMultipleApprovedProfiles: true,
  supportsMultipleVoiceIdentitiesPerProfile: true,
});
const VOICE_IDENTITY_STORAGE_MODEL = APPROVED_VOICE_IDENTITY_STORAGE_MODEL;

function createApprovedVoiceProfileStore({
  approvedVoices = [],
  approvedVoiceProfilesById,
  updatedAtMs = Date.now(),
} = {}) {
  const normalizedUpdatedAtMs = normalizeOptionalTimestamp(
    updatedAtMs,
    "updatedAtMs",
    Date.now(),
  );
  const store = {
    schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
    updatedAtMs: normalizedUpdatedAtMs,
  };

  if (approvedVoiceProfilesById !== undefined) {
    store.approvedVoiceProfilesById = approvedVoiceProfilesById;
  } else {
    store.approvedVoices = approvedVoices;
  }

  return normalizeApprovedVoiceProfileStore(store);
}

function appendApprovedVoiceProfileEnrollment(
  store,
  approvedVoice,
  {
    updatedAtMs = Date.now(),
    duplicateIdentityPolicy =
      APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.REJECT,
  } = {},
) {
  const normalizedUpdatedAtMs = normalizeOptionalTimestamp(
    updatedAtMs,
    "updatedAtMs",
  );
  const normalizedDuplicateIdentityPolicy = normalizeDuplicateIdentityPolicy(
    duplicateIdentityPolicy,
  );
  const existingStore = store
    ? normalizeApprovedVoiceProfileStore(store)
    : createApprovedVoiceProfileStore({
        approvedVoices: [],
        updatedAtMs: normalizedUpdatedAtMs,
      });

  const { matchingProfileIndex, enrollmentProfile } =
    resolveApprovedVoiceEnrollmentForPersistence(
      existingStore.approvedVoices,
      approvedVoice,
      { updatedAtMs: normalizedUpdatedAtMs },
    );
  const existingProfile =
    matchingProfileIndex >= 0
      ? existingStore.approvedVoices[matchingProfileIndex]
      : undefined;

  if (
    matchingProfileIndex >= 0 &&
    normalizedDuplicateIdentityPolicy ===
      APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.UPDATE_MATCHING_PROFILE
  ) {
    assertApprovedVoiceProfileUpdateKeepsStableIdentifiers(
      existingProfile,
      approvedVoice,
      { allowProfileIdAsId: true },
    );
  }

  if (
    matchingProfileIndex >= 0 &&
    normalizedDuplicateIdentityPolicy ===
      APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.REJECT
  ) {
    throw new Error(
      `duplicate approved voice profile id: ${existingStore.approvedVoices[matchingProfileIndex].identityId}`,
    );
  }

  const enrolledProfile = normalizeApprovedVoiceProfiles([
    withEnrollmentTimestampFallback(
      existingProfile
        ? withExistingApprovedVoiceStableIdentifiers(
            enrollmentProfile,
            existingProfile,
          )
        : enrollmentProfile,
      normalizedUpdatedAtMs,
      existingProfile,
    ),
  ])[0];
  const approvedVoices =
    matchingProfileIndex >= 0
      ? replaceApprovedVoiceProfileAtIndex(
          existingStore.approvedVoices,
          matchingProfileIndex,
          enrolledProfile,
        )
      : [...existingStore.approvedVoices, enrolledProfile];
  assertUniqueApprovedVoiceProfileIds(approvedVoices);

  return {
    ...createApprovedVoiceProfileStoreSnapshot(
      approvedVoices,
      normalizedUpdatedAtMs,
    ),
  };
}

function normalizeApprovedVoiceProfileStore(store) {
  if (!isRecord(store)) {
    throw new Error("approved voice profile store must be an object");
  }

  const schemaVersion = Number(store.schemaVersion);
  if (schemaVersion !== APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION) {
    throw new Error(
      `unsupported approved voice profile store schema version: ${store.schemaVersion}`,
    );
  }

  const updatedAtMs = normalizeOptionalTimestamp(
    store.updatedAtMs,
    "updatedAtMs",
    Date.now(),
  );
  const approvedVoiceEntries = getApprovedVoiceProfileStoreInputEntries(
    store,
  ).map((entry) => ({
    ...entry,
    profile: withEnrollmentTimestampFallback(
      entry.profile,
      updatedAtMs,
    ),
  }));
  const approvedVoices =
    normalizeApprovedVoiceProfileEntries(approvedVoiceEntries);

  return createApprovedVoiceProfileStoreSnapshot(approvedVoices, updatedAtMs);
}

function normalizeApprovedVoiceProfiles(profiles) {
  if (!Array.isArray(profiles)) return [];

  const approvedVoices = normalizeApprovedVoiceProfileEntries(
    profiles.map((profile, index) => ({
      profile,
      path: `approvedVoices[${index}]`,
    })),
  );
  assertUniqueApprovedVoiceProfileIds(approvedVoices);
  return approvedVoices;
}

function normalizeApprovedVoiceProfileEntries(profileEntries) {
  const approvedVoices = profileEntries.map(({ profile, path }) =>
    normalizeApprovedVoiceProfile(profile, path),
  );
  assertUniqueApprovedVoiceProfileIds(approvedVoices);
  return approvedVoices;
}

function createApprovedVoiceProfileStoreSnapshot(approvedVoices, updatedAtMs) {
  assertUniqueApprovedVoiceProfileIds(approvedVoices);

  return {
    schemaVersion: APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
    updatedAtMs,
    approvedVoiceProfilesById:
      createApprovedVoiceProfilesById(approvedVoices),
    approvedVoices,
  };
}

function createApprovedVoiceProfilesById(approvedVoices) {
  const approvedVoiceProfilesById = {};

  for (const profile of approvedVoices) {
    const profileKey = getApprovedVoiceProfileRecordKey(profile);
    if (
      Object.prototype.hasOwnProperty.call(
        approvedVoiceProfilesById,
        profileKey,
      )
    ) {
      throw new Error(`duplicate approved voice profile id: ${profileKey}`);
    }
    approvedVoiceProfilesById[profileKey] = profile;
  }

  return approvedVoiceProfilesById;
}

function getApprovedVoiceProfileStoreInputEntries(store) {
  if (isRecord(store.approvedVoiceProfilesById)) {
    return getApprovedVoiceProfileCollectionInputEntries(
      store.approvedVoiceProfilesById,
      "approvedVoiceProfilesById",
    );
  }

  if (Array.isArray(store.approvedVoices)) {
    return store.approvedVoices.map((profile, index) => ({
      profile,
      path: `approvedVoices[${index}]`,
    }));
  }

  throw new Error(
    "approved voice profile store must include approvedVoiceProfilesById",
  );
}

function getApprovedVoiceProfileCollectionInputEntries(
  approvedVoiceProfilesById,
  path,
) {
  if (!isRecord(approvedVoiceProfilesById)) {
    throw new Error(`${path} must be an object keyed by profile id`);
  }

  return Object.entries(approvedVoiceProfilesById).map(
    ([profileKey, profile]) => ({
      profile: withApprovedVoiceProfileCollectionKey(
        profile,
        profileKey,
        `${path}.${profileKey}`,
      ),
      path: `${path}.${profileKey}`,
    }),
  );
}

function withApprovedVoiceProfileCollectionKey(profile, profileKey, path) {
  if (!isRecord(profile)) {
    throw new Error(`${path} must be an approved voice profile record`);
  }

  const normalizedProfileKey = normalizeStableProfileId(
    profileKey,
    `${path} key`,
  );
  const rawIdentityId = getRawVoiceIdentityId(profile);
  if (rawIdentityId === undefined || rawIdentityId === null) {
    return {
      ...profile,
      id: normalizedProfileKey,
      identityId: normalizedProfileKey,
    };
  }

  const normalizedIdentityId = normalizeStableProfileId(
    rawIdentityId,
    `${path}.id`,
  );
  if (normalizedIdentityId !== normalizedProfileKey) {
    throw new Error(
      `${path} key must match approved voice profile id`,
    );
  }

  return profile;
}

function normalizeApprovedVoiceProfile(profile, path) {
  if (!isRecord(profile)) {
    throw new Error(`${path} must be an object`);
  }

  const identityId = normalizeStableProfileId(
    getRawVoiceIdentityId(profile),
    `${path}.identityId`,
  );
  const profileId = normalizeStableProfileId(
    getRawProfileId(profile, identityId) ?? identityId,
    `${path}.profileId`,
  );
  const enabled = profile.enabled !== false;
  const rawVoiceprintData =
    profile.voiceprintData ??
    profile.embeddings ??
    profile.voiceprints ??
    profile.samples;
  const approvalState = normalizeApprovalState(
    profile.approvalState,
    profile.approved,
    `${path}.approvalState`,
    getConsistentVoiceprintApprovalState(
      rawVoiceprintData,
      `${path}.voiceprintData`,
    ),
  );
  const approved =
    approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED;
  const enrolled = profile.enrolled !== false;
  const isMatcherCandidate = isApprovedVoiceGateCandidateProfile({
    enabled,
    approvalState,
    enrolled,
  });
  const nowMs = Date.now();
  const enrollmentMetadataInput = getRawEnrollmentMetadata(profile);
  const enrolledAtMs = normalizeOptionalTimestamp(
    profile.enrolledAtMs ??
      enrollmentMetadataInput.enrolledAtMs ??
      enrollmentMetadataInput.createdAtMs,
    `${path}.enrolledAtMs`,
    nowMs,
  );
  const updatedAtMs = normalizeOptionalTimestamp(
    profile.updatedAtMs ?? enrollmentMetadataInput.updatedAtMs,
    `${path}.updatedAtMs`,
    nowMs,
  );
  const voiceprintData = normalizeEmbeddingRecordsForProfile(
    rawVoiceprintData,
    identityId,
    `${path}.voiceprintData`,
    { approvalState, requireUsableEmbeddings: isMatcherCandidate },
  );
  const enrollmentMetadata = normalizeEnrollmentMetadata(profile, path, {
    profileId,
    identityId,
    enrolledAtMs,
    updatedAtMs,
    voiceprintData,
  });

  return removeUndefinedFields({
    id: identityId,
    identityId,
    profileId,
    displayName: normalizeOptionalString(
      profile.displayName ?? profile.name ?? profile.label,
      `${path}.displayName`,
    ),
    enabled,
    approvalState,
    approved,
    enrolled,
    enrolledAtMs,
    updatedAtMs,
    enrollmentMetadata,
    embeddings: voiceprintData,
    voiceprintData,
  });
}

function normalizeEmbeddingRecordsForProfile(
  embeddings,
  profileId,
  path,
  { approvalState, requireUsableEmbeddings },
) {
  if (!Array.isArray(embeddings)) {
    if (requireUsableEmbeddings) {
      throw new Error(`${path} must be an array`);
    }
    return [];
  }

  const normalizedEmbeddings = [];
  for (let index = 0; index < embeddings.length; index += 1) {
    try {
      normalizedEmbeddings.push(
        normalizeEmbeddingRecord(
          embeddings[index],
          profileId,
          index,
          `${path}[${index}]`,
          approvalState,
        ),
      );
    } catch (error) {
      if (error instanceof VoiceprintApprovalStateMismatchError) {
        throw error;
      }
      if (requireUsableEmbeddings) {
        throw error;
      }
    }
  }

  if (requireUsableEmbeddings && normalizedEmbeddings.length === 0) {
    throw new Error(`${path} must include at least one embedding`);
  }

  return normalizedEmbeddings;
}

function normalizeEmbeddingRecord(
  embedding,
  profileId,
  index,
  path,
  profileApprovalState,
) {
  if (Array.isArray(embedding)) {
    return {
      id: `${profileId}:embedding:${index + 1}`,
      modelId: DEFAULT_VOICE_EMBEDDING_MODEL_ID,
      approvalState: profileApprovalState,
      vector: normalizeEmbeddingVector(embedding, path),
    };
  }

  if (!isRecord(embedding)) {
    throw new Error(`${path} must be an embedding vector or record`);
  }

  const id = normalizeOptionalString(
    embedding.id ?? embedding.embeddingId,
    `${path}.id`,
  );
  const approvalState = normalizeVoiceprintApprovalState(
    embedding,
    profileApprovalState,
    path,
  );

  return removeUndefinedFields({
    id: id || `${profileId}:embedding:${index + 1}`,
    modelId:
      normalizeOptionalString(
        embedding.modelId ?? embedding.model,
        `${path}.modelId`,
      ) || DEFAULT_VOICE_EMBEDDING_MODEL_ID,
    approvalState,
    createdAtMs: normalizeOptionalTimestamp(
      embedding.createdAtMs,
      `${path}.createdAtMs`,
    ),
    vector: normalizeEmbeddingVector(
      embedding.vector ?? embedding.embedding,
      `${path}.vector`,
    ),
  });
}

function normalizeEmbeddingVector(vector, path) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error(`${path} must include a non-empty embedding vector`);
  }

  const normalizedVector = vector.map((value, index) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new Error(`${path}[${index}] must be a finite number`);
    }
    return numberValue;
  });
  const magnitude = Math.sqrt(
    normalizedVector.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) {
    throw new Error(`${path} must not be a zero-vector embedding`);
  }

  return normalizedVector;
}

function toVoiceGateApprovedVoiceProfiles(source) {
  const profiles = normalizeApprovedVoiceProfiles(
    getApprovedVoiceRecognitionCandidateProfileInputs(source),
  );

  return profiles.map((profile) => ({
    id: profile.identityId,
    identityId: profile.identityId,
    profileId: profile.profileId,
    displayName: profile.displayName,
    enabled: true,
    approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    approved: true,
    enrolled: true,
    embeddings: profile.voiceprintData.map((embedding) => embedding.vector),
    voiceprintData: profile.voiceprintData.map(cloneVoiceprintRecord),
  }));
}

function toApprovedVoiceManagementProfiles(source) {
  const profiles = normalizeApprovedVoiceProfiles(
    getApprovedVoiceManagementProfileInputs(source),
  );

  return profiles.map(toApprovedVoiceManagementProfile);
}

function toEnrolledApprovedVoiceProfiles(source) {
  return toApprovedVoiceManagementProfiles(source);
}

function getApprovedVoiceRecognitionCandidateProfileInputs(source) {
  if (Array.isArray(source)) {
    return source.filter(isRawApprovedVoiceGateCandidateProfile);
  }
  if (isApprovedVoiceProfilesByIdSource(source)) {
    return getApprovedVoiceProfileCollectionRawProfiles(source)
      .filter(isRawApprovedVoiceGateCandidateProfile);
  }

  const store = assertApprovedVoiceRecognitionProfileStore(source);
  const updatedAtMs = normalizeOptionalTimestamp(
    store.updatedAtMs,
    "updatedAtMs",
    Date.now(),
  );

  return getApprovedVoiceProfileStoreRawProfiles(store)
    .filter(isRawApprovedVoiceGateCandidateProfile)
    .map((profile) => withEnrollmentTimestampFallback(profile, updatedAtMs));
}

function getApprovedVoiceManagementProfileInputs(source) {
  if (Array.isArray(source)) {
    return source.filter(isRawEnrolledApprovedVoiceProfile);
  }
  if (isApprovedVoiceProfilesByIdSource(source)) {
    return getApprovedVoiceProfileCollectionRawProfiles(source)
      .filter(isRawEnrolledApprovedVoiceProfile);
  }

  const store = assertApprovedVoiceRecognitionProfileStore(source);
  const updatedAtMs = normalizeOptionalTimestamp(
    store.updatedAtMs,
    "updatedAtMs",
    Date.now(),
  );

  return getApprovedVoiceProfileStoreRawProfiles(store)
    .filter(isRawEnrolledApprovedVoiceProfile)
    .map((profile) => withEnrollmentTimestampFallback(profile, updatedAtMs));
}

function assertApprovedVoiceRecognitionProfileStore(store) {
  if (!isRecord(store)) {
    throw new Error("approved voice profile store must be an object");
  }

  const schemaVersion = Number(store.schemaVersion);
  if (schemaVersion !== APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION) {
    throw new Error(
      `unsupported approved voice profile store schema version: ${store.schemaVersion}`,
    );
  }

  if (
    !isRecord(store.approvedVoiceProfilesById) &&
    !Array.isArray(store.approvedVoices)
  ) {
    throw new Error(
      "approved voice profile store must include approvedVoiceProfilesById",
    );
  }

  return store;
}

function getApprovedVoiceProfileStoreRawProfiles(store) {
  return getApprovedVoiceProfileStoreInputEntries(store).map(
    (entry) => entry.profile,
  );
}

function getApprovedVoiceProfileCollectionRawProfiles(
  approvedVoiceProfilesById,
) {
  return getApprovedVoiceProfileCollectionInputEntries(
    approvedVoiceProfilesById,
    "approvedVoiceProfilesById",
  ).map((entry) => entry.profile);
}

function isApprovedVoiceProfilesByIdSource(source) {
  return (
    isRecord(source) &&
    !hasDefinedOwnProperty(source, "schemaVersion") &&
    Object.values(source).every(isRecord)
  );
}

function normalizeApprovedVoiceProfileStoreForCompatibility(store, options) {
  return (
    migrateSingleEnrolledVoiceToApprovedVoiceProfile(store, options) ||
    normalizeApprovedVoiceProfileStore(store)
  );
}

function migrateSingleEnrolledVoiceToApprovedVoiceProfile(
  source,
  { updatedAtMs } = {},
) {
  const legacyVoiceInput = getLegacySingleEnrolledVoiceProfileInput(source);
  if (!legacyVoiceInput) return null;

  const normalizedUpdatedAtMs = normalizeOptionalTimestamp(
    updatedAtMs ??
      getLegacySingleEnrolledVoiceUpdatedAtMs(
        source,
        legacyVoiceInput.profile,
      ),
    "updatedAtMs",
    Date.now(),
  );
  const approvedVoice = createLegacySingleEnrolledApprovedVoiceProfile(
    legacyVoiceInput.profile,
    {
      path: legacyVoiceInput.path,
      updatedAtMs: normalizedUpdatedAtMs,
    },
  );

  return createApprovedVoiceProfileStore({
    updatedAtMs: normalizedUpdatedAtMs,
    approvedVoices: [approvedVoice],
  });
}

function getLegacySingleEnrolledVoiceProfileInput(source) {
  if (Array.isArray(source)) {
    if (
      source.length === 1 &&
      isLegacySingleEnrolledVoiceProfileCandidate(source[0])
    ) {
      return {
        profile: source[0],
        path: "legacySingleEnrolledVoices[0]",
      };
    }
    return null;
  }

  if (!isRecord(source) || isCurrentApprovedVoiceProfileStoreShape(source)) {
    return null;
  }

  for (const field of LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_FIELDS) {
    if (isLegacySingleEnrolledVoiceProfileCandidate(source[field])) {
      return {
        profile: source[field],
        path: field,
      };
    }
  }

  for (const field of LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_LIST_FIELDS) {
    const legacyProfiles = source[field];
    if (
      Array.isArray(legacyProfiles) &&
      legacyProfiles.length === 1 &&
      isLegacySingleEnrolledVoiceProfileCandidate(legacyProfiles[0])
    ) {
      return {
        profile: legacyProfiles[0],
        path: `${field}[0]`,
      };
    }
  }

  const nestedProfileInput =
    getNestedLegacySingleEnrolledVoiceProfileInput(source);
  if (nestedProfileInput) return nestedProfileInput;

  if (isLegacySingleEnrolledVoiceProfileCandidate(source)) {
    return {
      profile: source,
      path: "legacySingleEnrolledVoice",
    };
  }

  return null;
}

function isCurrentApprovedVoiceProfileStoreShape(source) {
  return (
    hasDefinedOwnProperty(source, "approvedVoiceProfilesById") ||
    hasDefinedOwnProperty(source, "approvedVoices")
  );
}

function getNestedLegacySingleEnrolledVoiceProfileInput(source) {
  const nestedContainers = [
    ["voiceEnrollment", source.voiceEnrollment],
    ["enrollment", source.enrollment],
    ["legacyVoiceEnrollment", source.legacyVoiceEnrollment],
  ];
  const nestedProfileFields = [
    "profile",
    "voiceProfile",
    "enrolledVoice",
    "enrolledVoiceProfile",
  ];

  for (const [containerPath, container] of nestedContainers) {
    if (!isRecord(container)) continue;

    for (const field of nestedProfileFields) {
      if (isLegacySingleEnrolledVoiceProfileCandidate(container[field])) {
        return {
          profile: container[field],
          path: `${containerPath}.${field}`,
        };
      }
    }
  }

  return null;
}

function isLegacySingleEnrolledVoiceProfileCandidate(profile) {
  if (!isRecord(profile) || profile.enrolled === false) return false;

  const explicitApprovalState =
    getExplicitLegacySingleEnrolledVoiceApprovalState(profile);
  if (
    explicitApprovalState !== undefined &&
    explicitApprovalState !== APPROVED_VOICE_APPROVAL_STATE.APPROVED
  ) {
    return false;
  }

  return getRawLegacySingleEnrolledVoiceprintData(profile) !== undefined;
}

function getExplicitLegacySingleEnrolledVoiceApprovalState(profile) {
  if (
    hasDefinedOwnProperty(profile, "approvalState") ||
    hasDefinedOwnProperty(profile, "approved")
  ) {
    return normalizeApprovalState(
      profile.approvalState,
      profile.approved,
      "legacySingleEnrolledVoice.approvalState",
    );
  }

  return getConsistentVoiceprintApprovalState(
    getRawLegacySingleEnrolledVoiceprintData(profile),
    "legacySingleEnrolledVoice.voiceprintData",
  );
}

function createLegacySingleEnrolledApprovedVoiceProfile(
  legacyProfile,
  { path, updatedAtMs },
) {
  const identityId = getLegacySingleEnrolledVoiceIdentityId(
    legacyProfile,
    path,
  );
  const profileId = getLegacySingleEnrolledVoiceProfileId(
    legacyProfile,
    identityId,
    path,
  );
  const voiceprintData = normalizeLegacySingleEnrolledVoiceprintDataInput(
    getRawLegacySingleEnrolledVoiceprintData(legacyProfile),
  );
  const legacyTimestamps = getLegacySingleEnrolledVoiceTimestamps(
    legacyProfile,
    updatedAtMs,
    path,
  );

  return withStableApprovedVoiceEnrollmentIdentifiers(
    {
      ...legacyProfile,
      enabled: legacyProfile.enabled !== false,
      approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
      approved: true,
      enrolled: true,
      enrolledAtMs: legacyTimestamps.enrolledAtMs,
      updatedAtMs: legacyTimestamps.updatedAtMs,
      embeddings: voiceprintData,
      voiceprintData,
    },
    { identityId, profileId },
  );
}

function getLegacySingleEnrolledVoiceIdentityId(legacyProfile, path) {
  const rawIdentityId = getRawVoiceIdentityId(legacyProfile);

  if (rawIdentityId === undefined || rawIdentityId === null) {
    return LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID;
  }

  return normalizeStableProfileId(rawIdentityId, `${path}.identityId`);
}

function getLegacySingleEnrolledVoiceProfileId(
  legacyProfile,
  identityId,
  path,
) {
  const rawProfileId = getRawProfileId(legacyProfile, identityId);

  if (rawProfileId === undefined || rawProfileId === null) {
    return identityId;
  }

  return normalizeStableProfileId(rawProfileId, `${path}.profileId`);
}

function getLegacySingleEnrolledVoiceTimestamps(
  legacyProfile,
  updatedAtMs,
  path,
) {
  const enrollmentMetadata = getRawEnrollmentMetadata(legacyProfile);

  return {
    enrolledAtMs: normalizeOptionalTimestamp(
      legacyProfile.enrolledAtMs ??
        enrollmentMetadata.enrolledAtMs ??
        enrollmentMetadata.createdAtMs ??
        legacyProfile.createdAtMs,
      `${path}.enrolledAtMs`,
      updatedAtMs,
    ),
    updatedAtMs: normalizeOptionalTimestamp(
      legacyProfile.updatedAtMs ?? enrollmentMetadata.updatedAtMs,
      `${path}.updatedAtMs`,
      updatedAtMs,
    ),
  };
}

function getLegacySingleEnrolledVoiceUpdatedAtMs(source, legacyProfile) {
  const sourceMetadata = getRawEnrollmentMetadata(source);
  const legacyMetadata = getRawEnrollmentMetadata(legacyProfile);

  return (
    source?.updatedAtMs ??
    sourceMetadata.updatedAtMs ??
    source?.lastUpdatedAtMs ??
    legacyProfile.updatedAtMs ??
    legacyMetadata.updatedAtMs ??
    legacyProfile.enrolledAtMs ??
    legacyMetadata.enrolledAtMs ??
    legacyMetadata.createdAtMs ??
    legacyProfile.createdAtMs
  );
}

function getRawLegacySingleEnrolledVoiceprintData(profile) {
  if (!isRecord(profile)) return undefined;

  return (
    profile.voiceprintData ??
    profile.embeddings ??
    profile.voiceprints ??
    profile.samples ??
    profile.voiceprint ??
    profile.voiceprintRecord ??
    profile.embedding ??
    profile.embeddingVector ??
    profile.vector
  );
}

function normalizeLegacySingleEnrolledVoiceprintDataInput(voiceprintData) {
  if (isLegacyEmbeddingVectorInput(voiceprintData)) {
    return [voiceprintData];
  }
  if (isRecord(voiceprintData)) {
    return [voiceprintData];
  }
  return voiceprintData;
}

function isLegacyEmbeddingVectorInput(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => !Array.isArray(entry) && !isRecord(entry))
  );
}

function parseApprovedVoiceProfileStore(serializedStore) {
  if (typeof serializedStore !== "string") {
    throw new Error("serialized approved voice profile store must be a string");
  }

  try {
    return normalizeApprovedVoiceProfileStoreForCompatibility(
      JSON.parse(serializedStore),
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("approved voice profile store must be valid JSON");
    }
    throw error;
  }
}

function serializeApprovedVoiceProfileStore(store) {
  return JSON.stringify(
    normalizeApprovedVoiceProfileStoreForCompatibility(store),
  );
}

async function persistApprovedVoiceProfileEnrollment(
  storage,
  approvedVoice,
  {
    storageKey = APPROVED_VOICE_PROFILE_STORE_KEY,
    updatedAtMs = Date.now(),
    duplicateIdentityPolicy =
      APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.REJECT,
  } = {},
) {
  assertApprovedVoiceProfileStorage(storage);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const existingStore = await loadApprovedVoiceProfileStoreForMutation(
    storage,
    {
      storageKey: normalizedStorageKey,
      updatedAtMs,
    },
  );
  const nextStore = appendApprovedVoiceProfileEnrollment(
    existingStore,
    approvedVoice,
    { duplicateIdentityPolicy, updatedAtMs },
  );

  await storage.setItem(
    normalizedStorageKey,
    serializeApprovedVoiceProfileStore(nextStore),
  );
  return nextStore;
}

async function createApprovedVoiceProfile(
  storage,
  approvedVoiceOrIdentifier,
  optionsOrApprovedVoice = {},
  maybeOptions,
) {
  if (typeof approvedVoiceOrIdentifier === "string") {
    return createApprovedVoiceProfileByIdentifier(
      storage,
      approvedVoiceOrIdentifier,
      optionsOrApprovedVoice,
      maybeOptions || {},
    );
  }

  return createApprovedVoiceProfileFromInput(
    storage,
    approvedVoiceOrIdentifier,
    optionsOrApprovedVoice,
  );
}

async function createApprovedVoiceProfileByIdentifier(
  storage,
  profileIdentifier,
  approvedVoice,
  options = {},
) {
  const normalizedProfileIdentifier = normalizeStableProfileId(
    profileIdentifier,
    "profileIdentifier",
  );
  const identifiedApprovedVoice = withApprovedVoiceProfileCreateIdentifier(
    approvedVoice,
    normalizedProfileIdentifier,
  );

  return createApprovedVoiceProfileFromInput(
    storage,
    identifiedApprovedVoice,
    options,
  );
}

async function createApprovedVoiceProfileFromInput(
  storage,
  approvedVoice,
  options = {},
) {
  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    approvedVoice,
    {
      ...options,
      duplicateIdentityPolicy: APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.REJECT,
    },
  );
  const identityId = getOptionalApprovedVoiceProfileIdentity(approvedVoice);
  const createdProfile = identityId
    ? findApprovedVoiceProfileByStableId(nextStore.approvedVoices, identityId)
    : nextStore.approvedVoices[nextStore.approvedVoices.length - 1];

  if (!createdProfile) {
    throw new Error(
      `approved voice profile not found: ${identityId || "new enrollment"}`,
    );
  }

  return cloneStoredApprovedVoiceProfile(createdProfile);
}

async function addApprovedVoiceProfile(
  storage,
  approvedVoice,
  options = {},
) {
  assertApprovedVoiceManagementAddInput(approvedVoice);

  const newApprovedVoice = withApprovedVoiceManagementAddDefaults(
    approvedVoice,
  );
  const nextStore = await persistApprovedVoiceProfileEnrollment(
    storage,
    newApprovedVoice,
    {
      ...options,
      duplicateIdentityPolicy: APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY.REJECT,
    },
  );
  const identityId = getOptionalApprovedVoiceProfileIdentity(newApprovedVoice);
  const addedProfile = identityId
    ? findApprovedVoiceProfileByStableId(nextStore.approvedVoices, identityId)
    : nextStore.approvedVoices[nextStore.approvedVoices.length - 1];

  if (!addedProfile) {
    throw new Error(
      `approved voice profile not found: ${identityId || "new approved voice"}`,
    );
  }

  return cloneStoredApprovedVoiceProfile(addedProfile);
}

async function readApprovedVoiceProfile(
  storage,
  profileId,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  const store = await loadApprovedVoiceProfileStoreForRead(storage, {
    storageKey,
  });
  const profile = findApprovedVoiceProfileByStableId(
    store.approvedVoices,
    profileId,
  );

  return profile ? cloneStoredApprovedVoiceProfile(profile) : null;
}

async function retrieveApprovedVoiceProfile(storage, profileId, options = {}) {
  return readApprovedVoiceProfile(storage, profileId, options);
}

async function retrieveApprovedVoiceProfileByIdentifier(
  storage,
  profileIdentifier,
  options = {},
) {
  return readApprovedVoiceProfile(storage, profileIdentifier, options);
}

async function updateApprovedVoiceProfile(
  storage,
  profileId,
  profileUpdate,
  {
    storageKey = APPROVED_VOICE_PROFILE_STORE_KEY,
    updatedAtMs = Date.now(),
  } = {},
) {
  assertApprovedVoiceProfileStorage(storage);
  assertApprovedVoiceProfileUpdate(profileUpdate);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const normalizedUpdatedAtMs = normalizeOptionalTimestamp(
    updatedAtMs,
    "updatedAtMs",
  );
  const existingStore = await loadApprovedVoiceProfileStoreForMutation(
    storage,
    {
      storageKey: normalizedStorageKey,
      updatedAtMs: normalizedUpdatedAtMs,
    },
  );
  const matchingProfileIndex = findApprovedVoiceProfileIndexByStableId(
    existingStore.approvedVoices,
    profileId,
  );

  if (matchingProfileIndex < 0) {
    throw new Error(`approved voice profile not found: ${profileId}`);
  }

  const existingProfile = existingStore.approvedVoices[matchingProfileIndex];
  const mergedProfile = mergeApprovedVoiceProfileUpdate(
    existingProfile,
    profileUpdate,
    normalizedUpdatedAtMs,
  );
  const updatedProfile = normalizeApprovedVoiceProfiles([
    withEnrollmentTimestampFallback(
      mergedProfile,
      normalizedUpdatedAtMs,
      existingProfile,
    ),
  ])[0];
  const approvedVoices = replaceApprovedVoiceProfileAtIndex(
    existingStore.approvedVoices,
    matchingProfileIndex,
    updatedProfile,
  );
  assertUniqueApprovedVoiceProfileIds(approvedVoices);

  const nextStore = createApprovedVoiceProfileStoreSnapshot(
    approvedVoices,
    normalizedUpdatedAtMs,
  );

  await storage.setItem(
    normalizedStorageKey,
    serializeApprovedVoiceProfileStore(nextStore),
  );
  return cloneStoredApprovedVoiceProfile(updatedProfile);
}

async function disableApprovedVoiceProfile(
  storage,
  profileId,
  options = {},
) {
  return updateApprovedVoiceProfile(
    storage,
    profileId,
    { enabled: false },
    options,
  );
}

async function deleteApprovedVoiceProfile(
  storage,
  profileId,
  {
    storageKey = APPROVED_VOICE_PROFILE_STORE_KEY,
    updatedAtMs = Date.now(),
  } = {},
) {
  assertApprovedVoiceProfileStorage(storage);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const normalizedUpdatedAtMs = normalizeOptionalTimestamp(
    updatedAtMs,
    "updatedAtMs",
  );
  const existingStore = await loadApprovedVoiceProfileStoreForMutation(
    storage,
    {
      storageKey: normalizedStorageKey,
      updatedAtMs: normalizedUpdatedAtMs,
    },
  );
  const matchingProfileIndex = findApprovedVoiceProfileIndexByStableId(
    existingStore.approvedVoices,
    profileId,
  );

  if (matchingProfileIndex < 0) return false;

  const nextStore = createApprovedVoiceProfileStoreSnapshot(
    existingStore.approvedVoices.filter(
      (_profile, index) => index !== matchingProfileIndex,
    ),
    normalizedUpdatedAtMs,
  );

  await storage.setItem(
    normalizedStorageKey,
    serializeApprovedVoiceProfileStore(nextStore),
  );
  return true;
}

async function removeApprovedVoiceProfile(storage, profileId, options = {}) {
  return deleteApprovedVoiceProfile(storage, profileId, options);
}

async function removeApprovedVoiceProfileByIdentifier(
  storage,
  profileIdentifier,
  options = {},
) {
  return removeApprovedVoiceProfile(storage, profileIdentifier, options);
}

async function listApprovedVoiceProfiles(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  const store = await loadApprovedVoiceProfileStoreForRead(storage, {
    storageKey,
  });

  return store.approvedVoices.map(cloneStoredApprovedVoiceProfile);
}

async function listApprovedVoiceProfilesById(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  const store = await loadApprovedVoiceProfileStoreForRead(storage, {
    storageKey,
  });
  const approvedVoiceProfilesById = {};

  for (const profile of store.approvedVoices) {
    approvedVoiceProfilesById[profile.id] =
      cloneStoredApprovedVoiceProfile(profile);
  }

  return approvedVoiceProfilesById;
}

async function listApprovedVoiceProfileIdentifiers(storage, options = {}) {
  const approvedVoiceProfilesById = await listApprovedVoiceProfilesById(
    storage,
    options,
  );

  return Object.keys(approvedVoiceProfilesById);
}

async function listApprovedVoiceManagementProfiles(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  const store = await loadApprovedVoiceProfileStoreForManagement(storage, {
    storageKey,
  });

  return toApprovedVoiceManagementProfiles(store);
}

async function listEnrolledApprovedVoiceProfiles(storage, options) {
  return listApprovedVoiceManagementProfiles(storage, options);
}

async function loadApprovedVoiceProfilesForRecognition(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  assertApprovedVoiceProfileReadableStorage(storage);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const serializedStore = await storage.getItem(normalizedStorageKey);
  if (serializedStore === null || serializedStore === undefined) {
    return [];
  }

  return toVoiceGateApprovedVoiceProfiles(
    parseApprovedVoiceProfileStoreForRecognition(serializedStore),
  );
}

async function loadApprovedEnrolledVoiceProfilesForRecognition(
  storage,
  options,
) {
  return loadApprovedVoiceProfilesForRecognition(storage, options);
}

async function loadApprovedVoiceProfileStoreForRead(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  assertApprovedVoiceProfileReadableStorage(storage);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const serializedStore = await storage.getItem(normalizedStorageKey);
  if (serializedStore === null || serializedStore === undefined) {
    return createApprovedVoiceProfileStore({
      approvedVoices: [],
    });
  }

  return parseApprovedVoiceProfileStore(serializedStore);
}

async function loadApprovedVoiceProfileStoreForMutation(
  storage,
  {
    storageKey = APPROVED_VOICE_PROFILE_STORE_KEY,
    updatedAtMs = Date.now(),
  } = {},
) {
  const serializedStore = await storage.getItem(storageKey);
  if (serializedStore === null || serializedStore === undefined) {
    return createApprovedVoiceProfileStore({
      approvedVoices: [],
      updatedAtMs,
    });
  }

  return parseApprovedVoiceProfileStore(serializedStore);
}

async function loadApprovedVoiceProfileStoreForManagement(
  storage,
  { storageKey = APPROVED_VOICE_PROFILE_STORE_KEY } = {},
) {
  assertApprovedVoiceProfileReadableStorage(storage);

  const normalizedStorageKey = normalizeRequiredStorageKey(
    storageKey,
    "storageKey",
  );
  const serializedStore = await storage.getItem(normalizedStorageKey);
  if (serializedStore === null || serializedStore === undefined) {
    return createApprovedVoiceProfileStore({
      approvedVoices: [],
    });
  }

  return parseApprovedVoiceProfileStoreForRecognition(serializedStore);
}

function parseApprovedVoiceProfileStoreForRecognition(serializedStore) {
  if (typeof serializedStore !== "string") {
    throw new Error("serialized approved voice profile store must be a string");
  }

  try {
    const parsedStore = JSON.parse(serializedStore);
    return (
      migrateSingleEnrolledVoiceToApprovedVoiceProfile(parsedStore) ||
      parsedStore
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("approved voice profile store must be valid JSON");
    }
    throw error;
  }
}

function assertApprovedVoiceProfileReadableStorage(storage) {
  if (!isRecord(storage) || typeof storage.getItem !== "function") {
    throw new Error(
      "approved voice profile loading requires getItem storage",
    );
  }
}

function assertApprovedVoiceProfileStorage(storage) {
  if (
    !isRecord(storage) ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    throw new Error(
      "approved voice profile persistence requires getItem and setItem storage",
    );
  }
}

function assertApprovedVoiceProfileUpdate(profileUpdate) {
  if (!isRecord(profileUpdate)) {
    throw new Error("approved voice profile update must be an object");
  }
}

function assertApprovedVoiceManagementAddInput(approvedVoice) {
  if (!isRecord(approvedVoice)) {
    throw new Error("approved voice profile add requires an object");
  }

  const requestedApprovalState = normalizeApprovalState(
    approvedVoice.approvalState,
    approvedVoice.approved,
    "approvedVoice.approvalState",
    getConsistentVoiceprintApprovalState(
      approvedVoice.voiceprintData ??
        approvedVoice.embeddings ??
        approvedVoice.voiceprints ??
        approvedVoice.samples,
      "approvedVoice.voiceprintData",
    ) || APPROVED_VOICE_APPROVAL_STATE.APPROVED,
  );

  if (requestedApprovalState !== APPROVED_VOICE_APPROVAL_STATE.APPROVED) {
    throw new Error("approved voice profile add requires an approved voice");
  }
  if (approvedVoice.enrolled === false) {
    throw new Error("approved voice profile add requires an enrolled voice");
  }
  if (approvedVoice.enabled === false) {
    throw new Error("approved voice profile add requires an enabled voice");
  }
}

function withApprovedVoiceManagementAddDefaults(approvedVoice) {
  return {
    approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    enrolled: true,
    enabled: true,
    ...approvedVoice,
  };
}

function normalizeRequiredStorageKey(value, path) {
  const normalizedValue = normalizeOptionalString(value, path);
  if (!normalizedValue) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return normalizedValue;
}

function assertUniqueApprovedVoiceProfileIds(profiles) {
  const seen = new Set();

  for (const profile of profiles) {
    const profileKey = getApprovedVoiceProfileRecordKey(profile);
    if (seen.has(profileKey)) {
      throw new Error(`duplicate approved voice profile id: ${profileKey}`);
    }
    seen.add(profileKey);
  }
}

function getApprovedVoiceProfileRecordKey(profile) {
  return normalizeStableProfileId(
    profile.id ?? profile.identityId,
    "approvedVoice.id",
  );
}

function normalizeDuplicateIdentityPolicy(policy) {
  const allowedPolicies = Object.values(
    APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY,
  );
  if (allowedPolicies.includes(policy)) return policy;

  throw new Error(
    `duplicateIdentityPolicy must be one of: ${allowedPolicies.join(", ")}`,
  );
}

function resolveApprovedVoiceEnrollmentForPersistence(
  existingProfiles,
  approvedVoice,
  { updatedAtMs },
) {
  if (!isRecord(approvedVoice)) {
    return {
      matchingProfileIndex: -1,
      enrollmentProfile: approvedVoice,
    };
  }

  const matchingProfileIndex =
    findApprovedVoiceEnrollmentMatchIndex(existingProfiles, approvedVoice);
  if (matchingProfileIndex >= 0) {
    return {
      matchingProfileIndex,
      enrollmentProfile: approvedVoice,
    };
  }

  if (getOptionalApprovedVoiceProfileIdentity(approvedVoice)) {
    return {
      matchingProfileIndex: -1,
      enrollmentProfile: approvedVoice,
    };
  }

  const generatedProfileId = createGeneratedApprovedVoiceProfileId(
    existingProfiles,
    updatedAtMs,
  );

  return {
    matchingProfileIndex: -1,
    enrollmentProfile: withGeneratedApprovedVoiceStableIdentifiers(
      approvedVoice,
      generatedProfileId,
    ),
  };
}

function findApprovedVoiceEnrollmentMatchIndex(existingProfiles, approvedVoice) {
  const identityId = getOptionalApprovedVoiceProfileIdentity(approvedVoice);
  if (!identityId) return -1;

  return findApprovedVoiceProfileIndexByStableId(
    existingProfiles,
    identityId,
  );
}

function createGeneratedApprovedVoiceProfileId(existingProfiles, updatedAtMs) {
  const timestampIdSegment = String(Math.trunc(updatedAtMs));
  const baseProfileId = `${APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX}-${timestampIdSegment}`;
  const usedStableIds = new Set();

  for (const profile of existingProfiles) {
    usedStableIds.add(profile.id);
    usedStableIds.add(profile.identityId);
    usedStableIds.add(profile.profileId);
  }

  let candidateProfileId = baseProfileId;
  let suffix = 2;
  while (usedStableIds.has(candidateProfileId)) {
    candidateProfileId = `${baseProfileId}-${suffix}`;
    suffix += 1;
  }

  return candidateProfileId;
}

function withGeneratedApprovedVoiceStableIdentifiers(
  approvedVoice,
  generatedProfileId,
) {
  return withStableApprovedVoiceEnrollmentIdentifiers(approvedVoice, {
    identityId: generatedProfileId,
    profileId: generatedProfileId,
  });
}

function withExistingApprovedVoiceStableIdentifiers(
  approvedVoice,
  existingProfile,
) {
  return withStableApprovedVoiceEnrollmentIdentifiers(approvedVoice, {
    identityId: existingProfile.identityId,
    profileId: existingProfile.profileId,
  });
}

function withStableApprovedVoiceEnrollmentIdentifiers(
  approvedVoice,
  { identityId, profileId },
) {
  return {
    ...approvedVoice,
    id: identityId,
    identityId,
    profileId,
    enrollmentMetadata: {
      ...getRawEnrollmentMetadata(approvedVoice),
      profileId,
      identityId,
    },
  };
}

function withApprovedVoiceProfileCreateIdentifier(
  approvedVoice,
  profileIdentifier,
) {
  if (!isRecord(approvedVoice)) {
    throw new Error("approved voice profile create requires an object");
  }

  const enrollmentMetadata = getRawEnrollmentMetadata(approvedVoice);
  const identifierFields = [
    ["approvedVoice.id", approvedVoice.id],
    ["approvedVoice.identityId", approvedVoice.identityId],
    ["approvedVoice.voiceIdentityId", approvedVoice.voiceIdentityId],
    ["approvedVoice.voiceId", approvedVoice.voiceId],
    [
      "approvedVoice.enrollmentMetadata.identityId",
      enrollmentMetadata.identityId,
    ],
  ];

  for (const [path, value] of identifierFields) {
    if (value === undefined || value === null) continue;
    const normalizedValue = normalizeStableProfileId(value, path);
    if (normalizedValue !== profileIdentifier) {
      throw new Error(
        "approved voice profile create identifier must match stable identity fields",
      );
    }
  }

  return {
    ...approvedVoice,
    id: profileIdentifier,
    identityId: profileIdentifier,
    enrollmentMetadata: {
      ...enrollmentMetadata,
      identityId: profileIdentifier,
    },
  };
}

function findApprovedVoiceProfileByStableId(profiles, profileId) {
  const matchingProfileIndex = findApprovedVoiceProfileIndexByStableId(
    profiles,
    profileId,
  );

  return matchingProfileIndex >= 0 ? profiles[matchingProfileIndex] : null;
}

function findApprovedVoiceProfileIndexByStableId(profiles, profileId) {
  const normalizedProfileId = normalizeStableProfileId(
    profileId,
    "profileId",
  );
  const directMatchIndex = profiles.findIndex(
    (profile) =>
      profile.identityId === normalizedProfileId ||
      profile.id === normalizedProfileId,
  );

  if (directMatchIndex >= 0) return directMatchIndex;

  const profileIdMatchIndexes = profiles
    .map((profile, index) =>
      profile.profileId === normalizedProfileId ? index : -1,
    )
    .filter((index) => index >= 0);

  if (profileIdMatchIndexes.length > 1) {
    throw new Error(
      `ambiguous approved voice profile id: ${normalizedProfileId}; use identityId`,
    );
  }

  return profileIdMatchIndexes.length === 1 ? profileIdMatchIndexes[0] : -1;
}

function getApprovedVoiceProfileIdentity(profile) {
  const identityId = getOptionalApprovedVoiceProfileIdentity(profile);
  if (identityId) return identityId;

  throw new Error(
    "approvedVoice.identityId must be a stable non-empty profile id",
  );
}

function getOptionalApprovedVoiceProfileIdentity(profile) {
  if (!isRecord(profile)) return undefined;
  const rawIdentityId = getRawVoiceIdentityId(profile);
  if (rawIdentityId === undefined || rawIdentityId === null) return undefined;

  return normalizeStableProfileId(rawIdentityId, "approvedVoice.identityId");
}

function getRawVoiceIdentityId(profile) {
  const enrollmentMetadata = getRawEnrollmentMetadata(profile);

  return (
    profile.identityId ??
    profile.voiceIdentityId ??
    profile.voiceId ??
    enrollmentMetadata.identityId ??
    profile.id ??
    profile.profileId ??
    enrollmentMetadata.profileId
  );
}

function getRawProfileId(profile, identityId) {
  if (profile.profileId !== undefined && profile.profileId !== null) {
    return profile.profileId;
  }

  const enrollmentMetadata = getRawEnrollmentMetadata(profile);
  if (
    enrollmentMetadata.profileId !== undefined &&
    enrollmentMetadata.profileId !== null
  ) {
    return enrollmentMetadata.profileId;
  }

  const hasExplicitVoiceIdentity =
    profile.identityId !== undefined ||
    profile.voiceIdentityId !== undefined ||
    profile.voiceId !== undefined ||
    enrollmentMetadata.identityId !== undefined;
  if (
    !hasExplicitVoiceIdentity ||
    profile.id === undefined ||
    profile.id === null
  ) {
    return undefined;
  }

  const profileId = normalizeOptionalString(profile.id, "approvedVoice.id");
  return profileId === identityId ? undefined : profileId;
}

function replaceApprovedVoiceProfileAtIndex(profiles, index, profile) {
  return profiles.map((existingProfile, existingIndex) =>
    existingIndex === index ? profile : existingProfile,
  );
}

function mergeApprovedVoiceProfileUpdate(
  existingProfile,
  profileUpdate,
  updatedAtMs,
) {
  assertApprovedVoiceProfileUpdateKeepsStableIdentifiers(
    existingProfile,
    profileUpdate,
  );

  const existingProfileBase = { ...existingProfile };
  const hasVoiceprintDataUpdate =
    hasDefinedOwnProperty(profileUpdate, "embeddings") ||
    hasDefinedOwnProperty(profileUpdate, "voiceprintData") ||
    hasDefinedOwnProperty(profileUpdate, "voiceprints") ||
    hasDefinedOwnProperty(profileUpdate, "samples");
  if (hasVoiceprintDataUpdate) {
    delete existingProfileBase.embeddings;
    delete existingProfileBase.voiceprintData;
  }

  const mergedProfile = {
    ...existingProfileBase,
    ...removeUndefinedFields(profileUpdate),
    updatedAtMs,
  };
  if (
    hasDefinedOwnProperty(profileUpdate, "approved") &&
    !hasDefinedOwnProperty(profileUpdate, "approvalState")
  ) {
    delete mergedProfile.approvalState;
  }
  if (
    !hasVoiceprintDataUpdate &&
    (hasDefinedOwnProperty(profileUpdate, "approvalState") ||
      hasDefinedOwnProperty(profileUpdate, "approved"))
  ) {
    const nextApprovalState = normalizeApprovalState(
      profileUpdate.approvalState,
      profileUpdate.approved,
      "approvedVoice.approvalState",
      existingProfile.approvalState,
    );
    const nextVoiceprintData = existingProfile.voiceprintData.map(
      (voiceprint) => ({
        ...voiceprint,
        approvalState: nextApprovalState,
      }),
    );

    mergedProfile.embeddings = nextVoiceprintData;
    mergedProfile.voiceprintData = nextVoiceprintData;
  }
  mergedProfile.enrollmentMetadata = mergeApprovedVoiceProfileUpdateMetadata(
    existingProfile,
    profileUpdate,
  );

  return mergedProfile;
}

function mergeApprovedVoiceProfileUpdateMetadata(
  existingProfile,
  profileUpdate,
) {
  const existingEnrollmentMetadata = getRawEnrollmentMetadata(existingProfile);
  const updateEnrollmentMetadata = getRawEnrollmentMetadata(profileUpdate);
  const mergedMetadata = removeUndefinedFields({
    source: existingEnrollmentMetadata.source,
    enrollmentSessionId: existingEnrollmentMetadata.enrollmentSessionId,
    deviceId: existingEnrollmentMetadata.deviceId,
    ...updateEnrollmentMetadata,
  });

  return Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined;
}

function assertApprovedVoiceProfileUpdateKeepsStableIdentifiers(
  existingProfile,
  profileUpdate,
  { allowProfileIdAsId = false } = {},
) {
  const explicitIdentityFields = ["identityId", "voiceIdentityId", "voiceId"];
  const hasExplicitIdentity = explicitIdentityFields.some((field) =>
    hasDefinedOwnProperty(profileUpdate, field),
  );

  for (const field of explicitIdentityFields) {
    if (!hasDefinedOwnProperty(profileUpdate, field)) continue;

    const normalizedIdentityId = normalizeStableProfileId(
      profileUpdate[field],
      `approvedVoice.${field}`,
    );
    if (normalizedIdentityId !== existingProfile.identityId) {
      throw new Error(
        "approved voice profile update cannot change stable profile identifiers",
      );
    }
  }

  if (hasDefinedOwnProperty(profileUpdate, "id")) {
    const normalizedId = normalizeStableProfileId(
      profileUpdate.id,
      "approvedVoice.id",
    );
    const allowedIds = hasExplicitIdentity || allowProfileIdAsId
      ? [existingProfile.identityId, existingProfile.profileId]
      : [existingProfile.identityId];

    if (!allowedIds.includes(normalizedId)) {
      throw new Error(
        "approved voice profile update cannot change stable profile identifiers",
      );
    }
  }

  if (hasDefinedOwnProperty(profileUpdate, "profileId")) {
    const normalizedProfileId = normalizeStableProfileId(
      profileUpdate.profileId,
      "approvedVoice.profileId",
    );
    if (normalizedProfileId !== existingProfile.profileId) {
      throw new Error(
        "approved voice profile update cannot change stable profile identifiers",
      );
    }
  }

  const enrollmentMetadata = getRawEnrollmentMetadata(profileUpdate);
  if (hasDefinedOwnProperty(enrollmentMetadata, "identityId")) {
    const normalizedIdentityId = normalizeStableProfileId(
      enrollmentMetadata.identityId,
      "approvedVoice.enrollmentMetadata.identityId",
    );
    if (normalizedIdentityId !== existingProfile.identityId) {
      throw new Error(
        "approved voice profile update cannot change stable profile identifiers",
      );
    }
  }
  if (hasDefinedOwnProperty(enrollmentMetadata, "profileId")) {
    const normalizedProfileId = normalizeStableProfileId(
      enrollmentMetadata.profileId,
      "approvedVoice.enrollmentMetadata.profileId",
    );
    if (normalizedProfileId !== existingProfile.profileId) {
      throw new Error(
        "approved voice profile update cannot change stable profile identifiers",
      );
    }
  }
}

function getRawEnrollmentMetadata(profile) {
  return isRecord(profile) && isRecord(profile.enrollmentMetadata)
    ? profile.enrollmentMetadata
    : {};
}

function normalizeEnrollmentMetadata(
  profile,
  path,
  { profileId, identityId, enrolledAtMs, updatedAtMs, voiceprintData },
) {
  const enrollmentMetadata = getRawEnrollmentMetadata(profile);
  const metadataProfileId = normalizeOptionalString(
    enrollmentMetadata.profileId,
    `${path}.enrollmentMetadata.profileId`,
  );
  const metadataIdentityId = normalizeOptionalString(
    enrollmentMetadata.identityId,
    `${path}.enrollmentMetadata.identityId`,
  );

  if (metadataProfileId && metadataProfileId !== profileId) {
    throw new Error(
      `${path}.enrollmentMetadata.profileId must match profileId`,
    );
  }
  if (metadataIdentityId && metadataIdentityId !== identityId) {
    throw new Error(
      `${path}.enrollmentMetadata.identityId must match identityId`,
    );
  }

  return removeUndefinedFields({
    profileId,
    identityId,
    enrolledAtMs,
    updatedAtMs,
    source:
      normalizeOptionalString(
        profile.enrollmentSource ?? enrollmentMetadata.source,
        `${path}.enrollmentMetadata.source`,
      ) || DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE,
    enrollmentSessionId: normalizeOptionalString(
      profile.enrollmentSessionId ?? enrollmentMetadata.enrollmentSessionId,
      `${path}.enrollmentMetadata.enrollmentSessionId`,
    ),
    deviceId: normalizeOptionalString(
      profile.enrollmentDeviceId ??
        profile.deviceId ??
        enrollmentMetadata.deviceId,
      `${path}.enrollmentMetadata.deviceId`,
    ),
    voiceprintCount: voiceprintData.length,
    embeddingModelIds: uniqueStrings(
      voiceprintData.map((voiceprint) => voiceprint.modelId),
    ),
  });
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string"))];
}

function isApprovedVoiceGateCandidateProfile(profile) {
  return (
    profile.enabled &&
    profile.approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED &&
    profile.enrolled
  );
}

function isRawApprovedVoiceGateCandidateProfile(profile) {
  if (!isRecord(profile)) return true;
  const approvalState = normalizeRawApprovalState(profile);

  return (
    profile.enabled !== false &&
    approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED &&
    profile.enrolled === true
  );
}

function isRawEnrolledApprovedVoiceProfile(profile) {
  if (!isRecord(profile)) return true;
  const approvalState = normalizeRawApprovalState(profile);

  return (
    approvalState === APPROVED_VOICE_APPROVAL_STATE.APPROVED &&
    profile.enrolled === true
  );
}

function normalizeRawApprovalState(profile) {
  if (!isRecord(profile)) return undefined;
  if (profile.approvalState !== undefined && profile.approvalState !== null) {
    return normalizeApprovalState(
      profile.approvalState,
      undefined,
      "approvedVoice.approvalState",
    );
  }
  if (profile.approved === true) return APPROVED_VOICE_APPROVAL_STATE.APPROVED;
  if (profile.approved === false) {
    return APPROVED_VOICE_APPROVAL_STATE.REVOKED;
  }
  return getConsistentVoiceprintApprovalState(
    profile.voiceprintData ??
      profile.embeddings ??
      profile.voiceprints ??
      profile.samples,
    "approvedVoice.voiceprintData",
  );
}

class VoiceprintApprovalStateMismatchError extends Error {}

function getConsistentVoiceprintApprovalState(voiceprintData, path) {
  if (!Array.isArray(voiceprintData)) return undefined;

  const states = new Set();
  for (let index = 0; index < voiceprintData.length; index += 1) {
    const voiceprint = voiceprintData[index];
    if (!hasExplicitVoiceprintApprovalState(voiceprint)) continue;

    states.add(
      normalizeApprovalState(
        voiceprint.approvalState,
        voiceprint.approved,
        `${path}[${index}].approvalState`,
      ),
    );
  }

  if (states.size > 1) {
    throw new Error(
      `${path} must not mix approval states for one voice identity`,
    );
  }

  return states.values().next().value;
}

function normalizeVoiceprintApprovalState(
  voiceprint,
  profileApprovalState,
  path,
) {
  if (!hasExplicitVoiceprintApprovalState(voiceprint)) {
    return profileApprovalState;
  }

  const voiceprintApprovalState = normalizeApprovalState(
    voiceprint.approvalState,
    voiceprint.approved,
    `${path}.approvalState`,
  );
  if (voiceprintApprovalState !== profileApprovalState) {
    throw new VoiceprintApprovalStateMismatchError(
      `${path}.approvalState must match voice identity approvalState`,
    );
  }

  return voiceprintApprovalState;
}

function hasExplicitVoiceprintApprovalState(voiceprint) {
  return (
    isRecord(voiceprint) &&
    (voiceprint.approvalState !== undefined ||
      voiceprint.approved !== undefined)
  );
}

function cloneVoiceprintRecord(voiceprint) {
  return {
    ...voiceprint,
    vector: [...voiceprint.vector],
  };
}

function cloneStoredApprovedVoiceProfile(profile) {
  return {
    ...profile,
    enrollmentMetadata: {
      ...profile.enrollmentMetadata,
      embeddingModelIds: [...profile.enrollmentMetadata.embeddingModelIds],
    },
    embeddings: profile.embeddings.map(cloneVoiceprintRecord),
    voiceprintData: profile.voiceprintData.map(cloneVoiceprintRecord),
  };
}

function toApprovedVoiceManagementProfile(profile) {
  const enabledStatus = profile.enabled
    ? APPROVED_VOICE_ENABLED_STATUS.ENABLED
    : APPROVED_VOICE_ENABLED_STATUS.DISABLED;

  return removeUndefinedFields({
    id: profile.identityId,
    identityId: profile.identityId,
    profileId: profile.profileId,
    displayName: profile.displayName,
    enabled: profile.enabled,
    disabled: !profile.enabled,
    enabledStatus,
    approvalState: APPROVED_VOICE_APPROVAL_STATE.APPROVED,
    approved: true,
    enrolled: true,
    enrolledAtMs: profile.enrolledAtMs,
    updatedAtMs: profile.updatedAtMs,
    enrollmentMetadata: {
      ...profile.enrollmentMetadata,
      embeddingModelIds: [
        ...profile.enrollmentMetadata.embeddingModelIds,
      ],
    },
    voiceprintCount: profile.voiceprintData.length,
  });
}

function normalizeApprovalState(
  approvalState,
  approvedFallback,
  path,
  stateFallback,
) {
  if (approvalState === undefined || approvalState === null) {
    if (approvedFallback === false) {
      return APPROVED_VOICE_APPROVAL_STATE.REVOKED;
    }
    if (approvedFallback === true) {
      return APPROVED_VOICE_APPROVAL_STATE.APPROVED;
    }
    return stateFallback || APPROVED_VOICE_APPROVAL_STATE.PENDING;
  }

  if (typeof approvalState === "boolean") {
    return approvalState
      ? APPROVED_VOICE_APPROVAL_STATE.APPROVED
      : APPROVED_VOICE_APPROVAL_STATE.REVOKED;
  }

  const normalizedState = String(approvalState)
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (
    normalizedState === APPROVED_VOICE_APPROVAL_STATE.APPROVED ||
    normalizedState === "allow" ||
    normalizedState === "allowed" ||
    normalizedState === "active"
  ) {
    return APPROVED_VOICE_APPROVAL_STATE.APPROVED;
  }
  if (
    normalizedState === APPROVED_VOICE_APPROVAL_STATE.REVOKED ||
    normalizedState === "unapproved" ||
    normalizedState === "not_approved" ||
    normalizedState === "rejected" ||
    normalizedState === "denied" ||
    normalizedState === "revoked"
  ) {
    return APPROVED_VOICE_APPROVAL_STATE.REVOKED;
  }
  if (normalizedState === APPROVED_VOICE_APPROVAL_STATE.PENDING) {
    return APPROVED_VOICE_APPROVAL_STATE.PENDING;
  }

  throw new Error(
    `${path} must be one of: ${APPROVED_VOICE_APPROVAL_STATE_VALUES.join(", ")}`,
  );
}

function normalizeStableProfileId(id, path) {
  const normalizedId = normalizeOptionalString(id, path);
  if (!normalizedId) {
    throw new Error(`${path} must be a stable non-empty profile id`);
  }
  return normalizedId;
}

function normalizeOptionalString(value, path) {
  if (value === undefined || value === null) return undefined;

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return normalizedValue;
}

function normalizeOptionalTimestamp(value, path, fallback) {
  if (value === undefined || value === null) return fallback;

  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw new Error(`${path} must be a non-negative timestamp`);
  }
  return normalizedValue;
}

function removeUndefinedFields(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function hasDefinedOwnProperty(record, field) {
  return (
    Object.prototype.hasOwnProperty.call(record, field) &&
    record[field] !== undefined
  );
}

function withEnrollmentTimestampFallback(
  profile,
  timestampFallback,
  existingProfile,
) {
  if (!isRecord(profile)) return profile;
  const enrollmentMetadata = getRawEnrollmentMetadata(profile);
  const existingEnrollmentMetadata = getRawEnrollmentMetadata(existingProfile);

  return {
    ...profile,
    enrollmentMetadata: mergeEnrollmentMetadataFallbacks(
      enrollmentMetadata,
      existingEnrollmentMetadata,
    ),
    enrolledAtMs:
      profile.enrolledAtMs ??
      enrollmentMetadata.enrolledAtMs ??
      enrollmentMetadata.createdAtMs ??
      existingProfile?.enrolledAtMs ??
      timestampFallback,
    updatedAtMs:
      profile.updatedAtMs ?? enrollmentMetadata.updatedAtMs ?? timestampFallback,
  };
}

function mergeEnrollmentMetadataFallbacks(
  enrollmentMetadata,
  existingEnrollmentMetadata,
) {
  const mergedMetadata = removeUndefinedFields({
    source: existingEnrollmentMetadata.source,
    enrollmentSessionId: existingEnrollmentMetadata.enrollmentSessionId,
    deviceId: existingEnrollmentMetadata.deviceId,
    ...enrollmentMetadata,
  });

  return Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = {
  APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION,
  APPROVED_VOICE_PROFILE_STORE_KEY,
  APPROVED_VOICE_PROFILE_STORE_SCHEMA,
  APPROVED_VOICE_IDENTITY_STORAGE_MODEL,
  VOICE_IDENTITY_STORAGE_MODEL,
  APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA,
  APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS,
  APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX,
  LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID,
  APPROVED_VOICE_APPROVAL_STATE,
  APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY,
  APPROVED_VOICE_ENABLED_STATUS,
  DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE,
  DEFAULT_VOICE_EMBEDDING_MODEL_ID,
  createApprovedVoiceProfileStore,
  appendApprovedVoiceProfileEnrollment,
  normalizeApprovedVoiceProfileStore,
  normalizeApprovedVoiceProfiles,
  migrateSingleEnrolledVoiceToApprovedVoiceProfile,
  parseApprovedVoiceProfileStore,
  persistApprovedVoiceProfileEnrollment,
  createApprovedVoiceProfile,
  createApprovedVoiceProfileByIdentifier,
  addApprovedVoiceProfile,
  readApprovedVoiceProfile,
  retrieveApprovedVoiceProfile,
  retrieveApprovedVoiceProfileByIdentifier,
  updateApprovedVoiceProfile,
  disableApprovedVoiceProfile,
  deleteApprovedVoiceProfile,
  removeApprovedVoiceProfile,
  removeApprovedVoiceProfileByIdentifier,
  listApprovedVoiceProfiles,
  listApprovedVoiceProfilesById,
  listApprovedVoiceProfileIdentifiers,
  listApprovedVoiceManagementProfiles,
  listEnrolledApprovedVoiceProfiles,
  loadApprovedVoiceProfilesForRecognition,
  loadApprovedEnrolledVoiceProfilesForRecognition,
  serializeApprovedVoiceProfileStore,
  toVoiceGateApprovedVoiceProfiles,
  toApprovedVoiceManagementProfiles,
  toEnrolledApprovedVoiceProfiles,
};
