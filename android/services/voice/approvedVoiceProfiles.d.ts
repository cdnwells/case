export type VoiceEmbedding = number[];
export type ApprovedVoiceProfileId = string;
export type ApprovedVoiceApprovalState = "approved" | "pending" | "revoked";
export type ApprovedVoiceEnabledStatus = "enabled" | "disabled";

export interface ApprovedVoiceEnrollmentMetadata {
  profileId: ApprovedVoiceProfileId;
  identityId: ApprovedVoiceProfileId;
  enrolledAtMs: number;
  updatedAtMs: number;
  source: string;
  enrollmentSessionId?: string;
  deviceId?: string;
  voiceprintCount: number;
  embeddingModelIds: string[];
}

export interface ApprovedVoiceEnrollmentMetadataInput {
  profileId?: ApprovedVoiceProfileId;
  identityId?: ApprovedVoiceProfileId;
  enrolledAtMs?: number;
  updatedAtMs?: number;
  createdAtMs?: number;
  source?: string;
  enrollmentSessionId?: string;
  deviceId?: string;
}

export interface ApprovedVoiceEnrollmentMetadataSchema {
  enrollmentMetadataField: "enrollmentMetadata";
  profileIdField: "profileId";
  identityIdField: "identityId";
  enrolledAtMsField: "enrolledAtMs";
  updatedAtMsField: "updatedAtMs";
  sourceField: "source";
  enrollmentSessionIdField: "enrollmentSessionId";
  deviceIdField: "deviceId";
  voiceprintCountField: "voiceprintCount";
  embeddingModelIdsField: "embeddingModelIds";
}

export interface ApprovedVoiceEmbeddingRecord {
  id: string;
  modelId: string;
  approvalState?: ApprovedVoiceApprovalState;
  vector: VoiceEmbedding;
  createdAtMs?: number;
}

export interface StoredApprovedVoiceEmbeddingRecord
  extends ApprovedVoiceEmbeddingRecord {
  approvalState: ApprovedVoiceApprovalState;
}

export interface StoredApprovedVoiceProfile {
  id: ApprovedVoiceProfileId;
  identityId: ApprovedVoiceProfileId;
  profileId: ApprovedVoiceProfileId;
  displayName?: string;
  enabled: boolean;
  approvalState: ApprovedVoiceApprovalState;
  approved: boolean;
  enrolled: boolean;
  enrolledAtMs: number;
  updatedAtMs: number;
  enrollmentMetadata: ApprovedVoiceEnrollmentMetadata;
  embeddings: StoredApprovedVoiceEmbeddingRecord[];
  voiceprintData: StoredApprovedVoiceEmbeddingRecord[];
}

export interface ApprovedVoiceManagementProfile {
  id: ApprovedVoiceProfileId;
  identityId: ApprovedVoiceProfileId;
  profileId: ApprovedVoiceProfileId;
  displayName?: string;
  enabled: boolean;
  disabled: boolean;
  enabledStatus: ApprovedVoiceEnabledStatus;
  approvalState: "approved";
  approved: true;
  enrolled: true;
  enrolledAtMs: number;
  updatedAtMs: number;
  enrollmentMetadata: ApprovedVoiceEnrollmentMetadata;
  voiceprintCount: number;
}

export interface ApprovedVoiceProfileStore {
  schemaVersion: typeof APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION;
  updatedAtMs: number;
  approvedVoiceProfilesById: Record<
    ApprovedVoiceProfileId,
    StoredApprovedVoiceProfile
  >;
  approvedVoices: StoredApprovedVoiceProfile[];
}

export interface ApprovedVoiceProfileStoreSchema {
  schemaVersion: typeof APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION;
  storageKey: typeof APPROVED_VOICE_PROFILE_STORE_KEY;
  rootField: "approvedVoiceProfilesById";
  collectionKeyField: "id";
  legacyRootField: "approvedVoices";
  profileIdField: "profileId";
  profileIdentityField: "identityId";
  identityIdField: "identityId";
  stableProfileIdentifierFields: readonly ["profileId", "identityId"];
  approvalStateField: "approvalState";
  approvalBooleanField: "approved";
  enrollmentStateField: "enrolled";
  enrollmentMetadataField: "enrollmentMetadata";
  enrollmentMetadataSchema: ApprovedVoiceEnrollmentMetadataSchema;
  voiceprintDataField: "voiceprintData";
  voiceprintApprovalStateField: "approvalState";
  embeddingRecordsField: "embeddings";
  embeddingVectorField: "vector";
  legacyProfileIdentityField: "id";
  legacyVoiceprintDataField: "embeddings";
  legacyApprovalBooleanField: "approved";
  profileIdRequired: true;
  approvalStateRequired: true;
  supportsMultipleApprovedProfiles: true;
  supportsMultipleVoiceIdentitiesPerProfile: true;
}

export interface ApprovedVoiceIdentityStorageModel {
  schemaVersion: typeof APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION;
  storageKey: typeof APPROVED_VOICE_PROFILE_STORE_KEY;
  rootField: "approvedVoiceProfilesById";
  collectionKeyField: "id";
  legacyRootField: "approvedVoices";
  profileIdField: "profileId";
  identityIdField: "identityId";
  stableProfileIdentifierFields: readonly ["profileId", "identityId"];
  voiceprintDataField: "voiceprintData";
  approvalStateField: "approvalState";
  voiceprintApprovalStateField: "approvalState";
  enrollmentMetadataField: "enrollmentMetadata";
  enrollmentMetadataSchema: ApprovedVoiceEnrollmentMetadataSchema;
  legacyProfileIdentityField: "id";
  legacyVoiceprintDataField: "embeddings";
  legacyApprovalBooleanField: "approved";
  supportsMultipleApprovedProfiles: true;
  supportsMultipleVoiceIdentitiesPerProfile: true;
}

export interface VoiceGateApprovedVoiceProfile {
  id?: ApprovedVoiceProfileId;
  identityId?: ApprovedVoiceProfileId;
  voiceIdentityId?: ApprovedVoiceProfileId;
  profileId?: ApprovedVoiceProfileId;
  voiceId?: ApprovedVoiceProfileId;
  displayName?: string;
  name?: string;
  label?: string;
  enabled?: boolean;
  approvalState?: ApprovedVoiceApprovalState | string | boolean;
  approved?: boolean;
  enrolled?: boolean;
  enrolledAtMs?: number;
  updatedAtMs?: number;
  enrollmentMetadata?: ApprovedVoiceEnrollmentMetadataInput;
  enrollmentSource?: string;
  enrollmentSessionId?: string;
  enrollmentDeviceId?: string;
  deviceId?: string;
  embeddings?: Array<VoiceEmbedding | ApprovedVoiceEmbeddingRecord>;
  voiceprintData?: Array<VoiceEmbedding | ApprovedVoiceEmbeddingRecord>;
  voiceprints?: VoiceEmbedding[];
  samples?: VoiceEmbedding[];
}

export type VoiceGateApprovedVoiceAuthorizationProfile = Required<
  Pick<
    VoiceGateApprovedVoiceProfile,
    | "id"
    | "identityId"
    | "approvalState"
    | "approved"
    | "enrolled"
    | "profileId"
    | "embeddings"
    | "voiceprintData"
  >
> &
  Pick<VoiceGateApprovedVoiceProfile, "displayName" | "enabled">;

export type ApprovedVoiceDuplicateIdentityPolicy =
  | "reject"
  | "update_matching_profile";

export type ApprovedVoiceProfileUpdate =
  Partial<VoiceGateApprovedVoiceProfile>;

export type ApprovedVoiceProfilesById = Record<
  ApprovedVoiceProfileId,
  VoiceGateApprovedVoiceProfile
>;

export interface ApprovedVoiceProfilePersistenceAdapter {
  getItem(
    key: string,
  ): string | null | undefined | Promise<string | null | undefined>;
  setItem(key: string, value: string): void | Promise<void>;
}

export interface ApprovedVoiceProfilePersistenceReadAdapter {
  getItem(
    key: string,
  ): string | null | undefined | Promise<string | null | undefined>;
}

export const APPROVED_VOICE_PROFILE_STORE_SCHEMA_VERSION: 1;
export const APPROVED_VOICE_PROFILE_STORE_KEY: "case.voiceGate.approvedVoiceProfiles.v1";
export const APPROVED_VOICE_PROFILE_STORE_SCHEMA: ApprovedVoiceProfileStoreSchema;
export const APPROVED_VOICE_IDENTITY_STORAGE_MODEL: ApprovedVoiceIdentityStorageModel;
export const VOICE_IDENTITY_STORAGE_MODEL: ApprovedVoiceIdentityStorageModel;
export const APPROVED_VOICE_ENROLLMENT_METADATA_SCHEMA: ApprovedVoiceEnrollmentMetadataSchema;
export const APPROVED_VOICE_STABLE_PROFILE_IDENTIFIER_FIELDS: readonly [
  "profileId",
  "identityId",
];
export const APPROVED_VOICE_GENERATED_PROFILE_ID_PREFIX: "case-approved-voice";
export const LEGACY_SINGLE_ENROLLED_VOICE_PROFILE_ID: "case-approved-voice-legacy-single-enrolled-voice";
export const APPROVED_VOICE_APPROVAL_STATE: Readonly<{
  APPROVED: "approved";
  PENDING: "pending";
  REVOKED: "revoked";
  UNAPPROVED: "revoked";
}>;
export const APPROVED_VOICE_DUPLICATE_IDENTITY_POLICY: Readonly<{
  REJECT: "reject";
  UPDATE_MATCHING_PROFILE: "update_matching_profile";
}>;
export const APPROVED_VOICE_ENABLED_STATUS: Readonly<{
  ENABLED: "enabled";
  DISABLED: "disabled";
}>;
export const DEFAULT_APPROVED_VOICE_ENROLLMENT_SOURCE: "local_device";
export const DEFAULT_VOICE_EMBEDDING_MODEL_ID: "case-local-speaker-embedding-v1";

export function createApprovedVoiceProfileStore(options?: {
  approvedVoices?: VoiceGateApprovedVoiceProfile[];
  approvedVoiceProfilesById?: ApprovedVoiceProfilesById;
  updatedAtMs?: number;
}): ApprovedVoiceProfileStore;

export function appendApprovedVoiceProfileEnrollment(
  store: ApprovedVoiceProfileStore | null | undefined,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    updatedAtMs?: number;
    duplicateIdentityPolicy?: ApprovedVoiceDuplicateIdentityPolicy;
  },
): ApprovedVoiceProfileStore;

export function normalizeApprovedVoiceProfileStore(
  store: ApprovedVoiceProfileStore,
): ApprovedVoiceProfileStore;

export function normalizeApprovedVoiceProfiles(
  profiles: VoiceGateApprovedVoiceProfile[],
): StoredApprovedVoiceProfile[];

export function migrateSingleEnrolledVoiceToApprovedVoiceProfile(
  source: unknown,
  options?: {
    updatedAtMs?: number;
  },
): ApprovedVoiceProfileStore | null;

export function toVoiceGateApprovedVoiceProfiles(
  source:
    | ApprovedVoiceProfileStore
    | VoiceGateApprovedVoiceProfile[]
    | ApprovedVoiceProfilesById,
): VoiceGateApprovedVoiceAuthorizationProfile[];

export function toApprovedVoiceManagementProfiles(
  source:
    | ApprovedVoiceProfileStore
    | VoiceGateApprovedVoiceProfile[]
    | ApprovedVoiceProfilesById,
): ApprovedVoiceManagementProfile[];

export function toEnrolledApprovedVoiceProfiles(
  source:
    | ApprovedVoiceProfileStore
    | VoiceGateApprovedVoiceProfile[]
    | ApprovedVoiceProfilesById,
): ApprovedVoiceManagementProfile[];

export function parseApprovedVoiceProfileStore(
  serializedStore: string,
): ApprovedVoiceProfileStore;

export function serializeApprovedVoiceProfileStore(
  store: ApprovedVoiceProfileStore,
): string;

export function persistApprovedVoiceProfileEnrollment(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
    duplicateIdentityPolicy?: ApprovedVoiceDuplicateIdentityPolicy;
  },
): Promise<ApprovedVoiceProfileStore>;

export function createApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function createApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileIdentifier: ApprovedVoiceProfileId,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function createApprovedVoiceProfileByIdentifier(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileIdentifier: ApprovedVoiceProfileId,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function addApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  approvedVoice: VoiceGateApprovedVoiceProfile,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function readApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  profileId: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
  },
): Promise<StoredApprovedVoiceProfile | null>;

export function retrieveApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  profileId: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
  },
): Promise<StoredApprovedVoiceProfile | null>;

export function retrieveApprovedVoiceProfileByIdentifier(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  profileIdentifier: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
  },
): Promise<StoredApprovedVoiceProfile | null>;

export function updateApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileId: ApprovedVoiceProfileId,
  profileUpdate: ApprovedVoiceProfileUpdate,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function disableApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileId: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<StoredApprovedVoiceProfile>;

export function deleteApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileId: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<boolean>;

export function removeApprovedVoiceProfile(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileId: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<boolean>;

export function removeApprovedVoiceProfileByIdentifier(
  storage: ApprovedVoiceProfilePersistenceAdapter,
  profileIdentifier: ApprovedVoiceProfileId,
  options?: {
    storageKey?: string;
    updatedAtMs?: number;
  },
): Promise<boolean>;

export function listApprovedVoiceProfiles(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<StoredApprovedVoiceProfile[]>;

export function listApprovedVoiceProfilesById(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<Record<ApprovedVoiceProfileId, StoredApprovedVoiceProfile>>;

export function listApprovedVoiceProfileIdentifiers(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<ApprovedVoiceProfileId[]>;

export function listApprovedVoiceManagementProfiles(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<ApprovedVoiceManagementProfile[]>;

export function listEnrolledApprovedVoiceProfiles(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<ApprovedVoiceManagementProfile[]>;

export function loadApprovedVoiceProfilesForRecognition(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<VoiceGateApprovedVoiceAuthorizationProfile[]>;

export function loadApprovedEnrolledVoiceProfilesForRecognition(
  storage: ApprovedVoiceProfilePersistenceReadAdapter,
  options?: {
    storageKey?: string;
  },
): Promise<VoiceGateApprovedVoiceAuthorizationProfile[]>;
