import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  appendCapturedFrameToCircularBuffer,
  assertAnalyticsPayloadExcludesCapturedAudio,
  assertBackgroundWorkerPayloadExcludesCapturedAudio,
  assertLogPayloadExcludesCapturedAudio,
  assertQueuePayloadExcludesCapturedAudio,
  attachNonPersistableAudioBytes,
  createAnalyticsSafeJsonBody,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createApprovedSpeechAudioRelease,
  createBackgroundWorkerSafeJsonBody,
  createDurableApprovedAudioClipStore,
  createLogSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent,
  saveApprovedAudioClipFromExplicitSaveAction,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
} from "../../constants/audioBuffer.ts";
import { triggerSpeechProcessingPipelineFromApprovedVoiceEvent } from "./approvedVoiceProcessingLatency.ts";
import { createApprovedVoiceGate } from "./voiceGate.js";

const artifactSurfaces = Object.freeze([
  "logs",
  "caches",
  "analytics",
  "temp files",
  "background storage",
]);

function createShortRollingAudioBuffer(initialAudioBytes = []) {
  const buffer = createOnDeviceCircularAudioBuffer(
    {
      sampleRateHz: 4,
      channelCount: 1,
      bytesPerSample: 1,
    },
    {
      rollingBufferActiveDurationSeconds: 1,
    },
  );

  if (initialAudioBytes.length > 0) {
    buffer.append(Uint8Array.from(initialAudioBytes), { timestampMs: 1000 });
  }

  return buffer;
}

function createApprovedVoices() {
  return [
    {
      id: "case-owner",
      approved: true,
      enrolled: true,
      embeddings: [[1, 0, 0]],
    },
  ];
}

function createApprovedAudioSaveRequestInput({
  approvedVoiceId = "case-owner",
  requestedAtMs = 1_700_000_000_000,
  userVisiblePurpose = "Save this approved clip for note playback",
} = {}) {
  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: approvedVoiceId,
      confidence: 0.98,
      recognizedAtMs: requestedAtMs - 120,
      recognitionLatencyMs: 120,
      reason: "approved_voice_match",
    },
    approvedUserIdentity: {
      approvedVoiceId,
      approvedUserId: `user-${approvedVoiceId}`,
      displayName: "Case Owner",
    },
    userVisiblePurpose,
    purposeMetadata: {
      kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
      userVisiblePurpose,
      requestedAtMs,
    },
    retentionMetadata: {
      requestedAtMs,
      retentionDurationSeconds: 3600,
      expiresAtMs: requestedAtMs + 3_600_000,
      storageLocation: BUFFER_LOCATION_ON_DEVICE,
      retentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
    },
  };
}

function createArtifactDirectories(rootDir) {
  return {
    explicitSavePath: path.join(rootDir, "explicit-approved-audio-save-path"),
    logs: path.join(rootDir, "logs"),
    caches: path.join(rootDir, "caches"),
    analytics: path.join(rootDir, "analytics"),
    tempFiles: path.join(rootDir, "temp-files"),
    backgroundStorage: path.join(rootDir, "background-storage"),
  };
}

async function createDirectories(directories) {
  for (const directory of Object.values(directories)) {
    await mkdir(directory, { recursive: true });
  }
}

function forbiddenFragmentsForAudioBytes(audioBytes) {
  const compactArray = `[${audioBytes.join(",")}]`;
  const spacedArray = `[${audioBytes.join(", ")}]`;
  const inspectedArray = audioBytes.join(", ");
  const typedArrayJson = audioBytes
    .map((value, index) => `"${index}":${value}`)
    .join(",");

  return [compactArray, spacedArray, inspectedArray, typedArrayJson];
}

function createForbiddenAudioFragments(audioByteSets) {
  return [
    ...audioByteSets.flatMap(forbiddenFragmentsForAudioBytes),
    "audioBytes",
    "capturedAudioBytes",
    "rawAudioBytes",
    "encodedAudioBytes",
    "bufferedAudio",
    "rollingAudioBuffer",
    "temporaryCapturedAudioFile",
    "temporaryCapturedAudioFiles",
    "unsavedCapturedAudioCache",
    "unsavedCapturedAudioCaches",
  ];
}

async function listFilesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files.sort();
}

function isPathInside(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return (
    relativePath === "" ||
    (relativePath.length > 0 &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath))
  );
}

async function auditNoCapturedAudioArtifactsOutsideExplicitSavePath({
  rootDir,
  explicitSavePath,
  forbiddenFragments,
}) {
  const files = await listFilesRecursively(rootDir);
  const audioArtifactFilePattern =
    /(?:^|[-_.])(audio|captured|microphone|pcm|raw|voice|wav)(?:[-_.]|$)|\.(aac|flac|m4a|opus|pcm|raw|wav)$/i;
  const violations = [];

  for (const filePath of files) {
    if (isPathInside(explicitSavePath, filePath)) continue;

    const relativeFilePath = path.relative(rootDir, filePath);
    if (audioArtifactFilePattern.test(path.basename(filePath))) {
      violations.push(`${relativeFilePath} is named like an audio artifact`);
    }

    const fileBody = await readFile(filePath, "utf8");
    for (const forbiddenFragment of forbiddenFragments) {
      if (fileBody.includes(forbiddenFragment)) {
        violations.push(
          `${relativeFilePath} contains captured-audio fragment ${forbiddenFragment}`,
        );
      }
    }
  }

  return violations;
}

function assertBlockedRawAudioPayloadsDoNotCreateSurfaceArtifacts(
  directories,
) {
  const rawPayload = {
    utteranceId: "blocked-captured-audio-artifact",
    audioBytes: Uint8Array.from([91, 92, 93]),
  };

  assert.throws(
    () => assertLogPayloadExcludesCapturedAudio(rawPayload),
    /logs .*audioBytes/,
    "logs reject raw captured audio before an artifact can be written",
  );
  assert.throws(
    () => assertAnalyticsPayloadExcludesCapturedAudio(rawPayload),
    /analytics .*audioBytes/,
    "analytics reject raw captured audio before an artifact can be written",
  );
  assert.throws(
    () => assertQueuePayloadExcludesCapturedAudio(rawPayload),
    /queue .*audioBytes/,
    "cache/queue storage rejects raw captured audio before an artifact can be written",
  );
  assert.throws(
    () => assertBackgroundWorkerPayloadExcludesCapturedAudio(rawPayload),
    /background-worker .*audioBytes/,
    "background storage rejects raw captured audio before an artifact can be written",
  );

  const blockedTempFilePath = path.join(
    directories.tempFiles,
    "blocked-temp-captured-audio.raw",
  );
  const blockedTempFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: "blocked-temp-file-backed-frame",
      timestampMs: 100,
      embedding: [1, 0, 0],
      filePath: blockedTempFilePath,
    },
    Uint8Array.from([81, 82]),
  );
  const blockedTempFrameAudioBytes = blockedTempFrame.audioBytes;

  assert.throws(
    () =>
      createApprovedSpeechAudioRelease({
        capturedFrames: [blockedTempFrame],
        scheduleProcessingWindowExpiry: false,
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes(
        CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
      ) &&
      error.message.includes("filePath"),
    "temp file-backed captured audio is rejected outside the explicit save path",
  );
  assert.deepEqual(
    Array.from(blockedTempFrameAudioBytes),
    [0, 0],
    "blocked temp file-backed frame zeroes raw bytes before any artifact write",
  );
  assert.equal(
    "audioBytes" in blockedTempFrame,
    false,
    "blocked temp file-backed frame removes raw audio metadata",
  );
}

async function writeMetadataOnlyArtifacts(directories, artifacts) {
  await writeFile(
    path.join(directories.logs, "approved-processing-release.jsonl"),
    `${artifacts.logs.join("\n")}\n`,
  );
  await writeFile(
    path.join(directories.analytics, "approved-processing-release.jsonl"),
    `${artifacts.analytics.join("\n")}\n`,
  );
  await writeFile(
    path.join(directories.backgroundStorage, "approved-processing-job.json"),
    artifacts.backgroundStorage,
  );
}

async function runApprovedNoSaveArtifactAudit(directories) {
  const rollingAudioBuffer = createShortRollingAudioBuffer();
  const approvedRecognitionEvents = [];
  const unsavedCacheKey = "approved-processing-unsaved-cache";
  const unsavedCache = new Map([
    [unsavedCacheKey, Uint8Array.from([61, 62, 63])],
  ]);
  const purgedCacheKeys = [];
  const metadataArtifacts = {
    logs: [],
    analytics: [],
    backgroundStorage: "",
  };
  const gate = createApprovedVoiceGate({
    approvedVoices: createApprovedVoices(),
    nowMs: () => 1_700_000_000_000,
    onApprovedVoiceRecognized(event) {
      approvedRecognitionEvents.push(event);
    },
  });
  const approvedCapturedFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: "approved-no-save-artifact-audit",
      timestampMs: 300,
      embedding: [1, 0, 0],
    },
    Uint8Array.from([11, 12, 13, 14]),
  );
  const approvedCapturedAudioBytes = approvedCapturedFrame.audioBytes;
  const recognitionFrame = appendCapturedFrameToCircularBuffer(
    rollingAudioBuffer,
    approvedCapturedFrame,
  );
  const recognitionResult = gate.observeFrame(recognitionFrame);
  const approvedSpeechAudioSegment =
    selectEligibleRollingBufferAudioSegmentForSpeechProcessing({
      rollingAudioBuffer,
      recognitionResult,
      downstreamPath: "transcription",
      selectedAtMs: 1_700_000_000_050,
    });

  assert.equal(
    recognitionResult.accepted,
    true,
    "approved voice is recognized before artifact audit processing starts",
  );
  assert.notEqual(
    approvedSpeechAudioSegment,
    null,
    "approved voice selects local rolling-buffer audio for no-save processing",
  );
  assert.deepEqual(
    Array.from(approvedCapturedAudioBytes),
    [0, 0, 0, 0],
    "approved recognition handoff zeroes source captured audio",
  );
  assert.equal(
    "audioBytes" in approvedCapturedFrame,
    false,
    "approved recognition handoff removes source captured audio metadata",
  );

  const approvedSpeechAudioSegmentBytes =
    approvedSpeechAudioSegment.audioBytes;
  const transcriptionFrame = attachNonPersistableAudioBytes(
    {
      utteranceId: "approved-transcription-artifact-audit",
      timestampMs: 420,
      embedding: [1, 0, 0],
    },
    Uint8Array.from([21, 22, 23]),
  );
  const transcriptionAudioBytes = transcriptionFrame.audioBytes;
  const approvedSpeechAudioRelease = createApprovedSpeechAudioRelease({
    rollingAudioBuffer,
    capturedFrames: [transcriptionFrame],
    rollingBufferAudioSegments: [approvedSpeechAudioSegment],
    unsavedCapturedAudioCaches: [
      {
        cacheKey: unsavedCacheKey,
        clear(cacheKey) {
          purgedCacheKeys.push(cacheKey);
          unsavedCache.delete(cacheKey);
        },
      },
    ],
    scheduleProcessingWindowExpiry: false,
    onRelease(reason) {
      const metadata = {
        event: "approved-no-save-captured-audio-released",
        releaseReason: reason,
        retainedAudioArtifactCountOutsideExplicitSavePath: 0,
        explicitSavePath: path.basename(directories.explicitSavePath),
        bufferLocation: BUFFER_LOCATION_ON_DEVICE,
        audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
      };

      metadataArtifacts.logs.push(createLogSafeJsonBody(metadata));
      metadataArtifacts.analytics.push(createAnalyticsSafeJsonBody(metadata));
      metadataArtifacts.backgroundStorage =
        createBackgroundWorkerSafeJsonBody({
          ...metadata,
          jobName: "approved-processing-release-cleanup",
        });
    },
  });

  const processingTrigger =
    triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
      approvedVoiceEvent: {
        ...approvedRecognitionEvents[0],
        approvedSpeechAudioSegment,
      },
      processingStartedAtMs: approvedRecognitionEvents[0].recognizedAtMs + 250,
      startSpeechProcessing(
        approvedVoiceEvent,
        approvedSpeechAudioSegmentForProcessing,
      ) {
        assert.equal(
          approvedSpeechAudioSegmentForProcessing,
          approvedSpeechAudioSegment,
          "no-save processing receives only the approved rolling-buffer segment",
        );
        const transcriptionCleanup =
          releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
            releaseCapturedAudio: approvedSpeechAudioRelease.release,
          });

        return {
          transcript: "turn on the office lights",
          matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
          transcriptionCleanup,
        };
      },
    });

  assert.equal(
    processingTrigger.triggered,
    true,
    "approved no-save processing starts within the latency window",
  );
  assert.equal(
    processingTrigger.processingResult.transcriptionCleanup.releaseReason,
    TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
    "approved no-save processing releases captured audio after transcription",
  );
  assert.deepEqual(
    Array.from(approvedSpeechAudioSegmentBytes),
    [0, 0, 0, 0],
    "approved no-save processing zeroes the selected rolling audio segment",
  );
  assert.equal(
    "audioBytes" in approvedSpeechAudioSegment,
    false,
    "approved no-save processing removes selected rolling audio metadata",
  );
  assert.deepEqual(
    Array.from(transcriptionAudioBytes),
    [0, 0, 0],
    "approved no-save processing zeroes transcription audio bytes",
  );
  assert.equal(
    "audioBytes" in transcriptionFrame,
    false,
    "approved no-save processing removes transcription audio metadata",
  );
  assert.deepEqual(
    Array.from(rollingAudioBuffer.read()),
    [],
    "approved no-save processing clears the rolling buffer",
  );
  assert.deepEqual(
    purgedCacheKeys,
    [unsavedCacheKey],
    "approved no-save processing purges unsaved captured-audio cache entries",
  );
  assert.equal(
    unsavedCache.has(unsavedCacheKey),
    false,
    "approved no-save processing leaves no captured audio in cache storage",
  );

  await writeMetadataOnlyArtifacts(directories, metadataArtifacts);
}

function saveExplicitApprovedAudioArtifact(directories) {
  const explicitSaveWrites = [];
  const explicitSaveStore = createDurableApprovedAudioClipStore({
    write(clip) {
      const filePath = path.join(
        directories.explicitSavePath,
        `${clip.clipId}.raw`,
      );
      explicitSaveWrites.push(filePath);
      writeFileSync(filePath, clip.audioBytes);
    },
  });
  const saveAction = createApprovedAudioSaveAction(
    createApprovedAudioSaveRequestInput({
      userVisiblePurpose: "Explicit playback from the saved-audio list",
    }),
  );
  const savedClip = saveApprovedAudioClipFromExplicitSaveAction(
    explicitSaveStore,
    {
      saveAction,
      saveAuthorization: createApprovedAudioSaveAuthorization(saveAction),
      rollingAudioBuffer: createShortRollingAudioBuffer([101, 102, 103]),
      clipId: "explicitly-saved-approved-audio",
      savedAtMs: 1_700_000_000_100,
    },
  );

  assert.deepEqual(
    explicitSaveWrites.map((filePath) =>
      path.relative(directories.explicitSavePath, filePath),
    ),
    ["explicitly-saved-approved-audio.raw"],
    "explicit save writes raw audio only under the explicit save path",
  );
  assert.equal(
    savedClip.userVisiblePurpose,
    "Explicit playback from the saved-audio list",
    "explicit save records the user-visible later-use purpose",
  );

  return explicitSaveWrites[0];
}

const rootDir = await mkdtemp(
  path.join(tmpdir(), "case-captured-audio-artifact-boundary-"),
);

try {
  const directories = createArtifactDirectories(rootDir);
  await createDirectories(directories);

  assert.deepEqual(
    Array.from(artifactSurfaces),
    ["logs", "caches", "analytics", "temp files", "background storage"],
    "artifact audit covers logs, caches, analytics, temp files, and background storage",
  );

  assertBlockedRawAudioPayloadsDoNotCreateSurfaceArtifacts(directories);
  await runApprovedNoSaveArtifactAudit(directories);
  const explicitAudioArtifactPath =
    saveExplicitApprovedAudioArtifact(directories);
  const explicitAudioArtifactBytes = await readFile(explicitAudioArtifactPath);

  assert.deepEqual(
    Array.from(explicitAudioArtifactBytes),
    [101, 102, 103],
    "positive control keeps explicitly saved approved audio in the explicit save path",
  );
  assert.deepEqual(
    (await listFilesRecursively(directories.caches)).map((filePath) =>
      path.relative(rootDir, filePath),
    ),
    [],
    "cache storage creates no captured-audio artifacts outside the explicit save path",
  );
  assert.deepEqual(
    (await listFilesRecursively(directories.tempFiles)).map((filePath) =>
      path.relative(rootDir, filePath),
    ),
    [],
    "temp file storage creates no captured-audio artifacts outside the explicit save path",
  );

  const auditViolations =
    await auditNoCapturedAudioArtifactsOutsideExplicitSavePath({
      rootDir,
      explicitSavePath: directories.explicitSavePath,
      forbiddenFragments: createForbiddenAudioFragments([
        [11, 12, 13, 14],
        [21, 22, 23],
        [61, 62, 63],
        [81, 82],
        [91, 92, 93],
        [101, 102, 103],
      ]),
    });

  assert.deepEqual(
    auditViolations,
    [],
    "no captured audio artifacts are created outside the explicit save path across logs, caches, analytics, temp files, or background storage",
  );
} finally {
  await rm(rootDir, { recursive: true, force: true });
}
