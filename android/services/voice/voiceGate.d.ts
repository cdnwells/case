import type {
  ApprovedVoiceProfileStore,
  ApprovedVoiceProfilesById,
  VoiceEmbedding,
  VoiceGateApprovedVoiceAuthorizationProfile,
  VoiceGateApprovedVoiceProfile,
} from "./approvedVoiceProfiles";

export type {
  ApprovedVoiceEmbeddingRecord,
  ApprovedVoiceEnrollmentMetadata,
  ApprovedVoiceEnrollmentMetadataInput,
  ApprovedVoiceEnrollmentMetadataSchema,
  ApprovedVoiceProfileId,
  ApprovedVoiceProfileStore,
  ApprovedVoiceProfileStoreSchema,
  ApprovedVoiceProfilesById,
  StoredApprovedVoiceEmbeddingRecord,
  StoredApprovedVoiceProfile,
  VoiceGateApprovedVoiceAuthorizationProfile,
  ApprovedVoiceApprovalState,
  ApprovedVoiceIdentityStorageModel,
  VoiceEmbedding,
} from "./approvedVoiceProfiles";

export type ApprovedVoiceProfile = VoiceGateApprovedVoiceProfile;
export type ApprovedVoiceProfileSource =
  | ApprovedVoiceProfile[]
  | ApprovedVoiceProfileStore
  | ApprovedVoiceProfilesById;

export interface VoiceGateFrame {
  embedding: VoiceEmbedding;
  timestampMs?: number;
  utteranceId?: string;
}

export interface VoiceGateConfig {
  recallTargetPer100: number;
  falseAcceptanceLimitPer100: number;
  maxRecognitionLatencyMs: number;
  frameWindowMs: number;
  voiceGateDecisionThreshold: number;
  highConfidenceThreshold: number;
  averageConfidenceThreshold: number;
  recallConfidenceThreshold: number;
  minAverageFrames: number;
  minRecallFrames: number;
  topFrameCount: number;
}

export type ApprovedVoiceDownstreamAuthorizationDecisionRule =
  | "high_confidence_match"
  | "average_confidence_match"
  | "recall_biased_match"
  | "approved_voice_match";

export interface ApprovedVoiceDownstreamAuthorization {
  authorized: true;
  matchedVoiceId: string;
  score: number;
  threshold: number;
  decisionRule: ApprovedVoiceDownstreamAuthorizationDecisionRule;
  supportingFrameCount: number;
  requiredFrameCount: number;
}

export interface MatchedApprovedVoiceProfileMetadata {
  id: string;
  identityId: string;
  profileId: string;
  displayName: string | null;
  label: string;
  approvalState: "approved" | string;
  approved: true;
  enrolled: true;
}

export interface ApprovedVoiceCandidateScore {
  profileId: string;
  score: number | null;
}

export interface ApprovedVoiceSampleScore {
  candidateScores: ApprovedVoiceCandidateScore[];
  bestCandidateScore: ApprovedVoiceCandidateScore | null;
  bestApprovedVoiceId: string | null;
  bestApprovedVoiceScore: number | null;
}

export interface ApprovedVoiceCandidateWindowScore {
  profileId: string;
  score: number | null;
  topScore: number | null;
  averageTopScore: number | null;
  recallFrameCount: number;
  scoredFrameCount: number;
}

export interface VoiceGateRecognitionResultSchema {
  schemaVersion: typeof VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION;
  resultKindField: "accepted";
  matchedApprovedVoiceIdentifierField: "matchedVoiceId";
  matchedApprovedVoiceProfileIdentifierField: "matchedApprovedVoiceProfileId";
  matchedApprovedVoiceHumanReadableLabelField: "matchedApprovedVoiceLabel";
  matchedApprovedVoiceProfileMetadataField:
    "matchedApprovedVoiceProfileMetadata";
  approvedVoiceClassificationTimestampField: "recognizedAtMs";
  acceptedSpeechRequiresMatchedApprovedVoiceIdentifier: true;
  acceptedSpeechRequiresMatchedApprovedVoiceProfileIdentifier: true;
  acceptedSpeechRequiresMatchedApprovedVoiceHumanReadableLabel: true;
  acceptedSpeechRequiresMatchedApprovedVoiceProfileMetadata: true;
  acceptedSpeechRequiresApprovedVoiceClassificationTimestamp: true;
  rejectedSpeechMatchedApprovedVoiceIdentifier: null;
  rejectedSpeechMatchedApprovedVoiceProfileIdentifier: null;
  rejectedSpeechMatchedApprovedVoiceHumanReadableLabel: null;
  rejectedSpeechMatchedApprovedVoiceProfileMetadata: null;
  rejectedSpeechApprovedVoiceClassificationTimestamp: null;
  downstreamAuthorizationMatchedVoiceIdentifierField:
    "downstreamAuthorization.matchedVoiceId";
  approvedVoiceIdentifierSourceField: "approvedVoiceProfilesById.*.id";
  approvedVoiceProfileIdentifierSourceField:
    "approvedVoiceProfilesById.*.profileId";
  approvedVoiceHumanReadableLabelSourceField:
    "approvedVoiceProfilesById.*.displayName";
  supportsMultipleApprovedVoices: true;
}

export interface VoiceGateRecognitionResultBase {
  recognizedAtMs: number | null;
  confidence: number;
  latencyMs: number | null;
  evaluatedFrameCount: number;
  reason: string;
  candidateScores: ApprovedVoiceCandidateWindowScore[];
  bestCandidateScore: ApprovedVoiceCandidateScore | null;
  bestApprovedVoiceId: string | null;
  bestApprovedVoiceScore: number | null;
}

export interface AcceptedVoiceGateRecognitionResult
  extends VoiceGateRecognitionResultBase {
  accepted: true;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata;
  rejectedVoiceId: null;
  recognizedAtMs: number;
  latencyMs: number;
  downstreamAuthorization: ApprovedVoiceDownstreamAuthorization;
}

export interface RejectedVoiceGateRecognitionResult
  extends VoiceGateRecognitionResultBase {
  accepted: false;
  matchedVoiceId: null;
  matchedApprovedVoiceProfileId: null;
  matchedApprovedVoiceLabel: null;
  matchedApprovedVoiceProfileMetadata: null;
  rejectedVoiceId: string | null;
  recognizedAtMs: null;
  downstreamAuthorization: null;
}

export type VoiceGateRecognitionResult =
  | AcceptedVoiceGateRecognitionResult
  | RejectedVoiceGateRecognitionResult;

export interface ApprovedVoiceRecognitionEvent
  extends AcceptedVoiceGateRecognitionResult {
  eventType: typeof APPROVED_VOICE_RECOGNITION_EVENT_TYPE;
  timestamp: string;
  recognizedAtMs: number;
  accepted: true;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata;
  rejectedVoiceId: null;
  downstreamAuthorization: ApprovedVoiceDownstreamAuthorization;
}

export type ApprovedVoiceRecognitionEventListener = (
  event: ApprovedVoiceRecognitionEvent,
) => void;

export interface QuietRoomRecallBaselineResult {
  testEnvironment: {
    roomType: "quiet_indoor_room";
    speakingVolume: "normal";
    captureMode: "local_embedding_fixture";
  };
  approvedRecognized: number;
  approvedTotal: number;
  recallTargetPer100: number;
  passedRecall: boolean;
  maxAcceptedLatencyMs: number;
  recognitionLatencyLimitMs: number;
  passedLatency: boolean;
  misses: Array<{
    utteranceIndex: number;
    confidence: number;
    reason: string;
  }>;
}

export interface NonApprovedVoiceFalseAcceptance {
  utteranceIndex: number;
  utteranceId: string;
  speakerId: string | null;
  matchedVoiceId: string | null;
  matchedApprovedVoiceProfileId: string | null;
  matchedApprovedVoiceLabel: string | null;
  matchedApprovedVoiceProfileMetadata: MatchedApprovedVoiceProfileMetadata | null;
  confidence: number;
  latencyMs: number | null;
  reason: string;
  evaluatedFrameCount: number;
}

export interface NonApprovedVoiceUtteranceMeasurement
  extends NonApprovedVoiceFalseAcceptance {
  expectedVoiceGateDecision: "reject";
  accepted: boolean;
  rejectedVoiceId: string | null;
}

export interface NonApprovedVoiceFalseAcceptanceMeasurementResult {
  falseAccepted: number;
  falseAcceptanceCount: number;
  falseAcceptanceRatePer100: number;
  nonApprovedTotal: number;
  falseAcceptanceLimitPer100: number;
  allowedFalseAcceptances: number;
  passedFalseAcceptance: boolean;
  measuredUtterances: NonApprovedVoiceUtteranceMeasurement[];
  falseAcceptances: NonApprovedVoiceFalseAcceptance[];
}

export type QuietRoomFalseAcceptanceBaselineResult =
  NonApprovedVoiceFalseAcceptanceMeasurementResult;

export interface ApprovedVoiceGate {
  observeFrame(frame: VoiceGateFrame): VoiceGateRecognitionResult;
  reset(): void;
  getApprovedVoiceCount(): number;
  getConfig(): VoiceGateConfig;
}

export const APPROVED_VOICE_RECALL_TARGET_PER_100: 90;
export const FALSE_ACCEPTANCE_LIMIT_PER_100: 5;
export const RECOGNITION_LATENCY_LIMIT_SECONDS: 1;
export const APPROVED_VOICE_RECOGNITION_EVENT_TYPE: "approvedVoiceRecognized";
export const VOICE_GATE_RECOGNITION_RESULT_SCHEMA_VERSION: 3;
export const VOICE_GATE_RECOGNITION_RESULT_SCHEMA: VoiceGateRecognitionResultSchema;
export const DEFAULT_VOICE_GATE_DECISION_THRESHOLD: 0.95;
export const VOICE_GATE_DECISION_THRESHOLD: 0.95;
export const DEFAULT_VOICE_GATE_CONFIG: VoiceGateConfig;
export const QUIET_ROOM_APPROVED_UTTERANCE_COUNT: 100;
export const QUIET_ROOM_APPROVED_VOICE_TEST_ENVIRONMENT: {
  readonly roomType: "quiet_indoor_room";
  readonly speakingVolume: "normal";
  readonly captureMode: "local_embedding_fixture";
};

export function normalizeEmbedding(embedding: VoiceEmbedding): VoiceEmbedding;

export function prepareApprovedVoiceProfiles(
  profiles: ApprovedVoiceProfileSource | null | undefined,
): VoiceGateApprovedVoiceAuthorizationProfile[];

export function scoreApprovedVoiceCandidates(
  incomingSpeechRepresentation: VoiceEmbedding | VoiceGateFrame,
  profiles: ApprovedVoiceProfileSource,
): ApprovedVoiceCandidateScore[];

export function scoreIncomingAudioSampleAgainstApprovedVoices(
  incomingSpeechRepresentation: VoiceEmbedding | VoiceGateFrame,
  profiles: ApprovedVoiceProfileSource,
): ApprovedVoiceSampleScore;

export function createApprovedVoiceRecognitionEvent(
  recognitionResult: VoiceGateRecognitionResult,
  options?: {
    recognizedAtMs?: number;
  },
): ApprovedVoiceRecognitionEvent;

export function createApprovedVoiceGate(options: {
  approvedVoices: ApprovedVoiceProfileSource;
  config?: Partial<VoiceGateConfig>;
  nowMs?: () => number;
  onApprovedVoiceRecognized?: ApprovedVoiceRecognitionEventListener;
}): ApprovedVoiceGate;

export function recognizeApprovedVoiceUtterance(
  frames: VoiceGateFrame[],
  approvedVoices: ApprovedVoiceProfileSource,
  config?: Partial<VoiceGateConfig>,
): VoiceGateRecognitionResult;

export function measureNonApprovedVoiceFalseAcceptances(options?: {
  evaluationFixture?: {
    utterances?: Array<
      | VoiceGateFrame[]
      | {
          utteranceId?: string;
          speakerId?: string;
          approved?: boolean;
          expectedVoiceGateDecision?: "accept" | "reject";
          frames?: VoiceGateFrame[];
        }
    >;
    approvedReferenceVoices?: ApprovedVoiceProfileSource;
  };
  fixture?: {
    utterances?: Array<
      | VoiceGateFrame[]
      | {
          utteranceId?: string;
          speakerId?: string;
          approved?: boolean;
          expectedVoiceGateDecision?: "accept" | "reject";
          frames?: VoiceGateFrame[];
        }
    >;
    approvedReferenceVoices?: ApprovedVoiceProfileSource;
  };
  utterances?: Array<
    | VoiceGateFrame[]
    | {
        utteranceId?: string;
        speakerId?: string;
        approved?: boolean;
        expectedVoiceGateDecision?: "accept" | "reject";
        frames?: VoiceGateFrame[];
      }
  >;
  approvedVoices?: ApprovedVoiceProfileSource;
  approvedReferenceVoices?: ApprovedVoiceProfileSource;
  config?: Partial<VoiceGateConfig>;
  falseAcceptanceLimitPer100?: number;
}): NonApprovedVoiceFalseAcceptanceMeasurementResult;

export function runQuietRoomApprovedVoiceRecallBaseline(options?: {
  seed?: number;
  utteranceTotal?: number;
  config?: Partial<VoiceGateConfig>;
}): QuietRoomRecallBaselineResult;

export function runQuietRoomNonApprovedFalseAcceptanceBaseline(options?: {
  seed?: number;
  utteranceTotal?: number;
  config?: Partial<VoiceGateConfig>;
}): QuietRoomFalseAcceptanceBaselineResult;
