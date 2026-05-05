import assert from "node:assert/strict";
import { appendFileSync, rmSync, writeFileSync } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inspect } from "node:util";
import {
  APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
  APPROVED_AUDIO_SAVE_ACTION_KIND,
  APPROVED_AUDIO_SAVE_PURPOSE_KIND,
  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
  AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
  BUFFER_LOCATION_ON_DEVICE,
  CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
  CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
  TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
  UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY,
  appendCapturedFrameToCircularBuffer,
  assertAnalyticsPayloadExcludesCapturedAudio,
  assertCrashReportPayloadExcludesCapturedAudio,
  assertDebugTracePayloadExcludesCapturedAudio,
  assertLogPayloadExcludesCapturedAudio,
  assertTelemetryPayloadExcludesCapturedAudio,
  attachNonPersistableAudioBytes,
  createAnalyticsSafeJsonBody,
  createAudioSafeDebugTraceArgs,
  createApprovedAudioSaveAction,
  createApprovedAudioSaveAuthorization,
  createApprovedSpeechAudioRelease,
  createCrashReportSafeJsonBody,
  createDurableApprovedAudioClipStore,
  createLogSafeJsonBody,
  createOnDeviceCircularAudioBuffer,
  createTelemetrySafeJsonBody,
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent,
  saveApprovedAudioClipFromExplicitSaveAction,
  selectEligibleRollingBufferAudioSegmentForSpeechProcessing,
} from "../../constants/audioBuffer.ts";
import { triggerSpeechProcessingPipelineFromApprovedVoiceEvent } from "./approvedVoiceProcessingLatency.ts";
import { createApprovedVoiceGate } from "./voiceGate.js";

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
    buffer.append(Uint8Array.from(initialAudioBytes));
  }

  return buffer;
}

function createObservedRollingAudioBuffer(initialAudioBytes) {
  const buffer = createShortRollingAudioBuffer(initialAudioBytes);
  let readCalled = false;

  return {
    rollingAudioBuffer: {
      read(...args) {
        readCalled = true;
        return buffer.read(...args);
      },
      clear() {
        buffer.clear();
      },
    },
    getReadCalled() {
      return readCalled;
    },
    readRemainingAudio() {
      return buffer.read();
    },
  };
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

function createApprovedSaveRequestInput(overrides = {}) {
  const requestedAtMs = 1_700_000_000_000;
  const userVisiblePurpose = "Save the approved clip for note playback";

  return {
    capturedAudioSaveIntent: CAPTURED_AUDIO_SAVE_INTENT_PRESENT,
    saveActionKind: APPROVED_AUDIO_SAVE_ACTION_KIND,
    approvedVoiceMatch: {
      accepted: true,
      matchedVoiceId: "case-owner",
      confidence: 0.98,
      recognizedAtMs: requestedAtMs - 120,
      recognitionLatencyMs: 120,
      reason: "approved_voice_match",
    },
    approvedUserIdentity: {
      approvedVoiceId: "case-owner",
      approvedUserId: "user-case-owner",
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
    ...overrides,
  };
}

async function createAuditedDurableStorageTargets(rootDir) {
  const databaseJournalPath = path.join(rootDir, "captured-audio-db.jsonl");
  const fileBackedAudioDir = path.join(rootDir, "file-backed-audio-clips");
  const databaseRows = [];
  const fileBackedWrites = [];

  await mkdir(fileBackedAudioDir);

  const databaseClipStore = createDurableApprovedAudioClipStore({
    write(clip) {
      const row = {
        clipId: clip.clipId,
        byteLength: clip.byteLength,
        audioBytes: Array.from(clip.audioBytes),
        saveActionKind: clip.saveActionKind,
        capturedAudioSaveIntent: clip.capturedAudioSaveIntent,
        userVisiblePurpose: clip.userVisiblePurpose,
      };
      databaseRows.push(row);
      appendFileSync(databaseJournalPath, `${JSON.stringify(row)}\n`);
    },
  });

  const fileBackedClipStore = createDurableApprovedAudioClipStore({
    write(clip) {
      const filePath = path.join(fileBackedAudioDir, `${clip.clipId}.raw`);
      fileBackedWrites.push({
        clipId: clip.clipId,
        filePath,
        byteLength: clip.byteLength,
      });
      writeFileSync(filePath, clip.audioBytes);
    },
  });

  return {
    databaseClipStore,
    fileBackedClipStore,
    async assertNoDurableWrites(message) {
      assert.equal(
        databaseRows.length,
        0,
        `${message}: no durable database rows are written`,
      );
      assert.equal(
        databaseClipStore.list().length,
        0,
        `${message}: no durable database clip records are retained`,
      );
      assert.equal(
        await pathExists(databaseJournalPath),
        false,
        `${message}: no durable database journal file is created`,
      );
      assert.equal(
        fileBackedWrites.length,
        0,
        `${message}: no file-backed audio writes are attempted`,
      );
      assert.equal(
        fileBackedClipStore.list().length,
        0,
        `${message}: no file-backed clip records are retained`,
      );
      assert.deepEqual(
        await readdir(fileBackedAudioDir),
        [],
        `${message}: no file-backed audio blobs are created`,
      );
    },
  };
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertApprovedNoSaveProcessingSkipsDurableStorage() {
  const storageRoot = await mkdtemp(
    path.join(tmpdir(), "case-unsaved-audio-storage-"),
  );

  try {
    const storageTargets =
      await createAuditedDurableStorageTargets(storageRoot);
    const rollingAudioBuffer = createShortRollingAudioBuffer();
    const approvedRecognitionEvents = [];
    const diagnosticLogEntries = [];
    const crashReports = [];
    const telemetryEvents = [];
    const analyticsEvents = [];
    const debugOutputEntries = [];

    const gate = createApprovedVoiceGate({
      approvedVoices: createApprovedVoices(),
      nowMs: () => 1_700_000_000_000,
      onApprovedVoiceRecognized(event) {
        approvedRecognitionEvents.push(event);
      },
    });
    const approvedCapturedFrame = attachNonPersistableAudioBytes(
      {
        utteranceId: "approved-processing-without-save-intent",
        timestampMs: 300,
        embedding: [1, 0, 0],
      },
      Uint8Array.from([41, 42, 43, 44]),
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
    assert.notEqual(
      approvedSpeechAudioSegment,
      null,
      "approved no-save voice-gate session selects local rolling audio for speech processing",
    );
    const approvedSpeechAudioSegmentBytes =
      approvedSpeechAudioSegment.audioBytes;
    const transcriptionFrame = attachNonPersistableAudioBytes(
      {
        utteranceId: "approved-transcription-without-save-intent",
        timestampMs: 420,
        embedding: [1, 0, 0],
      },
      Uint8Array.from([51, 52, 53]),
    );
    const transcriptionAudioBytes = transcriptionFrame.audioBytes;
    const blockedFileBackedFrame = attachNonPersistableAudioBytes(
      {
        utteranceId: "blocked-file-backed-processing-resource",
        timestampMs: 430,
        embedding: [1, 0, 0],
        filePath: path.join(storageRoot, "blocked-unsaved-audio.raw"),
      },
      Uint8Array.from([61, 62]),
    );
    const blockedFileBackedAudioBytes = blockedFileBackedFrame.audioBytes;
    assert.throws(
      () =>
        createApprovedSpeechAudioRelease({
          capturedFrames: [blockedFileBackedFrame],
          scheduleProcessingWindowExpiry: false,
        }),
      (error) =>
        error instanceof Error &&
        error.message.includes(
          CAPTURED_AUDIO_MEMORY_ONLY_UNLESS_EXPLICIT_SAVE_ERROR,
        ) &&
        error.message.includes("filePath"),
      "approved no-save processing rejects file-backed captured-audio resources",
    );
    assert.deepEqual(
      Array.from(blockedFileBackedAudioBytes),
      [0, 0],
      "rejected file-backed no-save resource zeroes captured audio bytes",
    );
    assert.equal(
      "audioBytes" in blockedFileBackedFrame,
      false,
      "rejected file-backed no-save resource removes captured audio metadata",
    );
    const temporaryCapturedAudioFilePath = path.join(
      storageRoot,
      "blocked-temp.raw",
    );
    const unsavedCapturedAudioCacheKey = "blocked-unsaved-audio-cache";
    const purgedTemporaryCapturedAudioFilePaths = [];
    const purgedUnsavedCapturedAudioCacheKeys = [];
    const unsavedCapturedAudioCache = new Map([
      [unsavedCapturedAudioCacheKey, Uint8Array.from([71, 72, 73])],
    ]);
    writeFileSync(
      temporaryCapturedAudioFilePath,
      Uint8Array.from([67, 68, 69, 70]),
    );
    const externalResourcePurgeRelease = createApprovedSpeechAudioRelease({
      temporaryCapturedAudioFiles: [
        {
          filePath: temporaryCapturedAudioFilePath,
          deleteFile(filePath) {
            purgedTemporaryCapturedAudioFilePaths.push(filePath);
            rmSync(filePath, { force: true });
          },
        },
      ],
      unsavedCapturedAudioCaches: [
        {
          cacheKey: unsavedCapturedAudioCacheKey,
          clear(cacheKey) {
            purgedUnsavedCapturedAudioCacheKeys.push(cacheKey);
            unsavedCapturedAudioCache.delete(cacheKey);
          },
        },
      ],
      scheduleProcessingWindowExpiry: false,
    });
    assert.equal(
      externalResourcePurgeRelease.release("processing_complete"),
      true,
      "approved no-save processing purges cache/temp resources before retention",
    );
    assert.deepEqual(
      purgedTemporaryCapturedAudioFilePaths,
      [temporaryCapturedAudioFilePath],
      "approved no-save processing deletes temporary captured-audio files outside the explicit save path",
    );
    assert.equal(
      await pathExists(temporaryCapturedAudioFilePath),
      false,
      "approved no-save processing leaves no temporary captured-audio file on disk",
    );
    assert.deepEqual(
      purgedUnsavedCapturedAudioCacheKeys,
      [unsavedCapturedAudioCacheKey],
      "approved no-save processing clears unsaved captured-audio caches",
    );
    assert.equal(
      unsavedCapturedAudioCache.has(unsavedCapturedAudioCacheKey),
      false,
      "approved no-save processing leaves no captured audio in unsaved caches",
    );
    assert.equal(
      externalResourcePurgeRelease.getProcessingWindowState()
        .audioRetentionPolicy,
      AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
      "approved no-save purge preserves discard-unless-saved retention policy",
    );
    assert.equal(
      UNSAVED_CAPTURED_AUDIO_EXTERNAL_RESOURCE_PURGE_POLICY,
      "purge-unsaved-captured-audio-cache-and-temp-files-outside-explicit-save-path",
      "approved no-save purge policy names cache/temp cleanup outside the explicit save path",
    );
    const approvedSpeechAudioRelease = createApprovedSpeechAudioRelease({
      rollingAudioBuffer,
      capturedFrames: [transcriptionFrame],
      rollingBufferAudioSegments: [approvedSpeechAudioSegment],
      scheduleProcessingWindowExpiry: false,
      onRelease(reason) {
        const diagnosticLogEntry = JSON.parse(
          createLogSafeJsonBody({
            event: "approved-unsaved-captured-audio-release",
            releaseReason: reason,
            retainedAudioRecordCount:
              storageTargets.databaseClipStore.list().length +
              storageTargets.fileBackedClipStore.list().length,
            bufferLocation: BUFFER_LOCATION_ON_DEVICE,
            audioRetentionPolicy: AUDIO_RETENTION_POLICY_DISCARD_UNLESS_SAVED,
          }),
        );
        const telemetryEvent = JSON.parse(
          createTelemetrySafeJsonBody({
            event: "approved_unsaved_captured_audio_released",
            releaseReason: reason,
            retainedAudioRecordCount:
              storageTargets.databaseClipStore.list().length +
              storageTargets.fileBackedClipStore.list().length,
          }),
        );
        const analyticsEvent = JSON.parse(
          createAnalyticsSafeJsonBody({
            event: "approved_unsaved_captured_audio_released",
            releaseReason: reason,
            retainedAudioRecordCount:
              storageTargets.databaseClipStore.list().length +
              storageTargets.fileBackedClipStore.list().length,
          }),
        );
        const crashReport = JSON.parse(
          createCrashReportSafeJsonBody({
            event: "approved-unsaved-captured-audio-release",
            releaseReason: reason,
            retainedAudioRecordCount:
              storageTargets.databaseClipStore.list().length +
              storageTargets.fileBackedClipStore.list().length,
          }),
        );
        const debugArgs = createAudioSafeDebugTraceArgs(
          "approved unsaved captured audio release",
          {
            releaseReason: reason,
            retainedAudioRecordCount:
              storageTargets.databaseClipStore.list().length +
              storageTargets.fileBackedClipStore.list().length,
          },
        );
        const debugOutput = inspect(debugArgs);

        assertLogPayloadExcludesCapturedAudio(diagnosticLogEntry);
        assertTelemetryPayloadExcludesCapturedAudio(telemetryEvent);
        assertAnalyticsPayloadExcludesCapturedAudio(analyticsEvent);
        assertCrashReportPayloadExcludesCapturedAudio(crashReport);
        assertDebugTracePayloadExcludesCapturedAudio(debugArgs);

        diagnosticLogEntries.push(diagnosticLogEntry);
        crashReports.push(crashReport);
        telemetryEvents.push(telemetryEvent);
        analyticsEvents.push(analyticsEvent);
        debugOutputEntries.push(debugOutput);
      },
    });

    assert.equal(
      recognitionResult.accepted,
      true,
      "approved voice is recognized before speech processing begins",
    );
    assert.equal(
      approvedRecognitionEvents.length,
      1,
      "approved voice recognition emits one metadata-only event",
    );
    assert.deepEqual(
      Array.from(approvedCapturedAudioBytes),
      [0, 0, 0, 0],
      "approved recognition handoff zeroes transient captured audio bytes",
    );
    assert.equal(
      "audioBytes" in approvedCapturedFrame,
      false,
      "approved recognition handoff removes transient audio metadata",
    );

    const processingTrigger =
      triggerSpeechProcessingPipelineFromApprovedVoiceEvent({
        approvedVoiceEvent: {
          ...approvedRecognitionEvents[0],
          approvedSpeechAudioSegment,
        },
        processingStartedAtMs:
          approvedRecognitionEvents[0].recognizedAtMs + 250,
        startSpeechProcessing(
          approvedVoiceEvent,
          approvedSpeechAudioSegmentForProcessing,
        ) {
          assert.equal(
            approvedSpeechAudioSegmentForProcessing,
            approvedSpeechAudioSegment,
            "approved no-save session processes only the voice-gated rolling audio segment",
          );
          const transcriptionCleanup =
            releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
              releaseCapturedAudio: approvedSpeechAudioRelease.release,
            });

          return {
            transcript: "turn on the office lights",
            matchedVoiceId: approvedVoiceEvent.matchedVoiceId,
            approvedSpeechAudioSegmentByteLength:
              approvedSpeechAudioSegmentForProcessing.byteLength,
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
      processingTrigger.processingResult.approvedSpeechAudioSegmentByteLength,
      approvedSpeechAudioSegmentBytes.byteLength,
      "approved no-save session processing receives the voice-gated rolling audio segment",
    );
    assert.equal(
      processingTrigger.processingResult.transcriptionCleanup.released,
      true,
      "approved no-save transcription releases captured audio",
    );
    assert.equal(
      processingTrigger.processingResult.transcriptionCleanup.releaseReason,
      TRANSCRIPTION_COMPLETE_NO_SAVE_INTENT_RELEASE_REASON,
      "approved no-save transcription records the discard release reason",
    );
    assert.deepEqual(
      Array.from(rollingAudioBuffer.read()),
      [],
      "approved no-save processing clears the rolling buffer",
    );
    assert.deepEqual(
      Array.from(approvedSpeechAudioSegmentBytes),
      [0, 0, 0, 0],
      "approved no-save voice-gate/session processing zeroes the selected rolling audio segment",
    );
    assert.equal(
      "audioBytes" in approvedSpeechAudioSegment,
      false,
      "approved no-save voice-gate/session processing removes selected rolling audio metadata",
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
    assert.equal(
      diagnosticLogEntries.length,
      1,
      "approved no-save release emits one diagnostic log entry after in-memory cleanup",
    );
    assert.equal(
      telemetryEvents.length,
      1,
      "approved no-save release emits one telemetry event after in-memory cleanup",
    );
    assert.equal(
      analyticsEvents.length,
      1,
      "approved no-save release emits one analytics event after in-memory cleanup",
    );
    assert.equal(
      crashReports.length,
      1,
      "approved no-save release emits one crash-report-safe entry after in-memory cleanup",
    );
    assert.equal(
      debugOutputEntries.length,
      1,
      "approved no-save release emits one debug output entry after in-memory cleanup",
    );

    const diagnosticOutputBySurface = [
      {
        name: "diagnostic logs",
        output: JSON.stringify(diagnosticLogEntries),
      },
      {
        name: "telemetry",
        output: JSON.stringify(telemetryEvents),
      },
      {
        name: "analytics",
        output: JSON.stringify(analyticsEvents),
      },
      {
        name: "crash reports",
        output: JSON.stringify(crashReports),
      },
      {
        name: "debug output",
        output: debugOutputEntries.join("\n"),
      },
    ];
    const forbiddenUnsavedAudioFragments = [
      "[41,42,43,44]",
      '"0":41,"1":42,"2":43,"3":44',
      "41, 42, 43, 44",
      "[51,52,53]",
      '"0":51,"1":52,"2":53',
      "51, 52, 53",
      "[61,62]",
      '"0":61,"1":62',
      "61, 62",
      "audioBytes",
      "bufferedAudio",
      "filePath",
      "temporaryCapturedAudioFiles",
      "unsavedCapturedAudioCaches",
    ];

    for (const { name, output } of diagnosticOutputBySurface) {
      for (const forbiddenFragment of forbiddenUnsavedAudioFragments) {
        assert.equal(
          output.includes(forbiddenFragment),
          false,
          `approved no-save ${name} excludes unsaved captured audio fragment ${forbiddenFragment}`,
        );
      }
    }
    await storageTargets.assertNoDurableWrites(
      "approved no-save processing",
    );
    assert.deepEqual(
      {
        rollingBufferBytes: rollingAudioBuffer.getState().sizeBytes,
        selectedRollingSegmentHasAudioBytes:
          "audioBytes" in approvedSpeechAudioSegment,
        selectedRollingSegmentBytes: Array.from(
          approvedSpeechAudioSegmentBytes,
        ),
        transcriptionFrameHasAudioBytes: "audioBytes" in transcriptionFrame,
        transcriptionFrameBytes: Array.from(transcriptionAudioBytes),
        retainedDatabaseClipCount:
          storageTargets.databaseClipStore.list().length,
        retainedFileBackedClipCount:
          storageTargets.fileBackedClipStore.list().length,
      },
      {
        rollingBufferBytes: 0,
        selectedRollingSegmentHasAudioBytes: false,
        selectedRollingSegmentBytes: [0, 0, 0, 0],
        transcriptionFrameHasAudioBytes: false,
        transcriptionFrameBytes: [0, 0, 0],
        retainedDatabaseClipCount: 0,
        retainedFileBackedClipCount: 0,
      },
      "approved no-save voice-gate/session processing leaves no captured audio in buffers, frames, or retained stores",
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
}

async function assertRejectedUnsavedSaveAttemptsSkipDurableStorage() {
  const storageRoot = await mkdtemp(
    path.join(tmpdir(), "case-rejected-audio-storage-"),
  );

  try {
    const storageTargets =
      await createAuditedDurableStorageTargets(storageRoot);
    const validSaveAction = createApprovedAudioSaveAction(
      createApprovedSaveRequestInput(),
    );
    const validSaveAuthorization =
      createApprovedAudioSaveAuthorization(validSaveAction);
    const durableTargets = [
      {
        name: "durable database",
        store: storageTargets.databaseClipStore,
      },
      {
        name: "file-backed storage",
        store: storageTargets.fileBackedClipStore,
      },
    ];
    const rejectedRequests = [
      {
        name: "missing explicit user save action",
        saveActionOverrides: {
          kind: undefined,
        },
        expectedContract: APPROVED_AUDIO_SAVE_ACTION_CONTRACT_ERROR,
        expectedMessage: `saveAction.kind must be ${APPROVED_AUDIO_SAVE_ACTION_KIND}`,
      },
      {
        name: "missing explicit save action marker",
        requestOverrides: {
          saveActionKind: undefined,
        },
        expectedContract: APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
        expectedMessage: `saveActionKind must be ${APPROVED_AUDIO_SAVE_ACTION_KIND}`,
      },
      {
        name: "missing captured-audio save intent",
        requestOverrides: {
          capturedAudioSaveIntent: undefined,
        },
        expectedMessage: "capturedAudioSaveIntent must be true",
      },
      {
        name: "missing user-visible later-use purpose",
        requestOverrides: {
          userVisiblePurpose: " ",
        },
        expectedMessage:
          "userVisiblePurpose must be a non-empty user-visible later-use purpose",
      },
      {
        name: "missing purpose metadata kind",
        requestOverrides: {
          purposeMetadata: {
            userVisiblePurpose: "Save the approved clip for note playback",
            requestedAtMs: 1_700_000_000_000,
          },
        },
        expectedContract: APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
        expectedMessage: `purposeMetadata.kind must be ${APPROVED_AUDIO_SAVE_PURPOSE_KIND}`,
      },
      {
        name: "missing purpose metadata request timestamp",
        requestOverrides: {
          purposeMetadata: {
            kind: APPROVED_AUDIO_SAVE_PURPOSE_KIND,
            userVisiblePurpose: "Save the approved clip for note playback",
          },
        },
        expectedContract: APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
        expectedMessage:
          "purposeMetadata.requestedAtMs must be a non-negative millisecond timestamp",
      },
    ];

    for (const durableTarget of durableTargets) {
      for (const rejectedRequest of rejectedRequests) {
        const observedBuffer = createObservedRollingAudioBuffer([81, 82, 83]);

        assert.throws(
          () =>
            saveApprovedAudioClipFromExplicitSaveAction(durableTarget.store, {
              saveAction: {
                kind: APPROVED_AUDIO_SAVE_ACTION_KIND,
                request: createApprovedSaveRequestInput(
                  rejectedRequest.requestOverrides,
                ),
                ...rejectedRequest.saveActionOverrides,
              },
              saveAuthorization: validSaveAuthorization,
              rollingAudioBuffer: observedBuffer.rollingAudioBuffer,
              clipId: `${durableTarget.name.replaceAll(" ", "-")}-${
                rejectedRequest.name
              }`,
            }),
          (error) => {
            const message =
              error instanceof Error ? error.message : String(error);
            assert.ok(
              message.includes(
                rejectedRequest.expectedContract ??
                  APPROVED_AUDIO_SAVE_REQUEST_CONTRACT_ERROR,
              ),
              "rejected save attempt explains the explicit save contract",
            );
            assert.ok(
              message.includes(rejectedRequest.expectedMessage),
              "rejected save attempt explains the missing intent or purpose",
            );
            return true;
          },
          `${durableTarget.name} rejects ${rejectedRequest.name} before storage`,
        );
        assert.equal(
          observedBuffer.getReadCalled(),
          false,
          `${durableTarget.name} ${rejectedRequest.name} is rejected before reading captured audio`,
        );
        assert.deepEqual(
          Array.from(observedBuffer.readRemainingAudio()),
          [],
          `${durableTarget.name} ${rejectedRequest.name} discards buffered audio after rejection`,
        );
        await storageTargets.assertNoDurableWrites(
          `${durableTarget.name} ${rejectedRequest.name}`,
        );
      }
    }
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
}

await assertApprovedNoSaveProcessingSkipsDurableStorage();
await assertRejectedUnsavedSaveAttemptsSkipDurableStorage();
