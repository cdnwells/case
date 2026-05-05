import { useEffect, useRef, useState, useCallback } from "react";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { Alert } from "react-native";
import {
  APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE,
  APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
  APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE,
  createApprovedVoiceProcessingStart,
  type ApprovedVoiceSpeechProcessingAudioSource,
} from "@/services/voice/approvedVoiceProcessingLatency";
import {
  assertApprovedVoiceVerifiedForBufferedAudioDownstream,
  createAudioSafeLogArgs,
  releaseTranscriptionAudioAfterCompletionWithoutSaveIntent,
  type ApprovedSpeechRollingBufferAudioSegment,
  type ApprovedVoiceDownstreamAuthorizationMetadata,
  type ApprovedSpeechAudioReleaseReason,
} from "@/constants/audioBuffer";

type VoiceState = "idle" | "recording" | "processing" | "error";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  locale?: string;
  silenceTimeout?: number;
  active?: boolean;
  requireApprovedVoiceGate?: boolean;
}

interface UseVoiceInputReturn {
  state: VoiceState;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: (options?: StartRecordingOptions) => Promise<boolean>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

interface StartRecordingOptions {
  approvedVoiceGateRequired?: boolean;
  approvedVoiceGateAccepted?: boolean;
  approvedVoiceMatchedVoiceId?: string | null;
  approvedVoiceRecognizedAtMs?: number;
  approvedVoiceDownstreamAuthorization?:
    | ApprovedVoiceDownstreamAuthorizationMetadata
    | null;
  approvedSpeechAudioSegment?: ApprovedSpeechRollingBufferAudioSegment | null;
  approvedSpeechProcessingAudioSource?: ApprovedVoiceSpeechProcessingAudioSource;
  processingStartLatencyLimitMs?: number;
  releaseCapturedAudio?: (
    reason?: ApprovedSpeechAudioReleaseReason,
  ) => boolean;
}

export function useVoiceInput({
  onTranscript,
  locale = "ko-KR",
  silenceTimeout = 4000,
  active = true,
  requireApprovedVoiceGate = false,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const releaseCapturedAudioRef = useRef<
    ((reason?: ApprovedSpeechAudioReleaseReason) => boolean) | null
  >(null);
  const approvedSpeechAudioSegmentRef =
    useRef<ApprovedSpeechRollingBufferAudioSegment | null>(null);
  const approvedSpeechProcessingAudioSourceRef =
    useRef<ApprovedVoiceSpeechProcessingAudioSource | null>(null);

  // Ref to avoid stale closures in event handlers
  const activeRef = useRef(active);
  activeRef.current = active;

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const releaseApprovedSpeechAudio = useCallback((
    reason: ApprovedSpeechAudioReleaseReason,
  ) => {
    const releaseCapturedAudio = releaseCapturedAudioRef.current;
    releaseCapturedAudioRef.current = null;
    approvedSpeechAudioSegmentRef.current = null;
    approvedSpeechProcessingAudioSourceRef.current = null;
    releaseCapturedAudio?.(reason);
  }, []);

  const releaseTranscribedAudioWithoutSaveIntent = useCallback(() => {
    const releaseCapturedAudio = releaseCapturedAudioRef.current;
    releaseCapturedAudioRef.current = null;
    approvedSpeechAudioSegmentRef.current = null;
    approvedSpeechProcessingAudioSourceRef.current = null;
    releaseTranscriptionAudioAfterCompletionWithoutSaveIntent({
      releaseCapturedAudio,
    });
  }, []);

  // Start silence detection timer
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    lastSpeechTimeRef.current = Date.now();

    const checkSilence = () => {
      const now = Date.now();
      const timeSinceLastSpeech = lastSpeechTimeRef.current
        ? now - lastSpeechTimeRef.current
        : 0;

      if (timeSinceLastSpeech >= silenceTimeout) {
        stopRecording();
      } else {
        silenceTimerRef.current = setTimeout(checkSilence, 500);
      }
    };

    silenceTimerRef.current = setTimeout(checkSilence, 500);
  }, [silenceTimeout]);

  // Listen to speech recognition results
  useSpeechRecognitionEvent("result", (event) => {
    if (!activeRef.current) return;
    const transcript = event.results[0]?.transcript;
    if (transcript && transcript !== currentTranscriptRef.current) {
      currentTranscriptRef.current = transcript;
      lastSpeechTimeRef.current = Date.now();
    }
  });

  // Listen to speech recognition end
  useSpeechRecognitionEvent("end", () => {
    if (!activeRef.current) return;
    clearSilenceTimer();
    const transcript = currentTranscriptRef.current;
    try {
      releaseTranscribedAudioWithoutSaveIntent();
      if (transcript.trim()) {
        onTranscript(transcript);
      }
    } finally {
      setState("idle");
      currentTranscriptRef.current = "";
    }
  });

  // Listen to speech recognition errors
  useSpeechRecognitionEvent("error", (event) => {
    if (!activeRef.current) return;
    if (event.error === "aborted") {
      clearSilenceTimer();
      releaseApprovedSpeechAudio("processing_cancelled");
      setState("idle");
      currentTranscriptRef.current = "";
      return;
    }
    if (event.error === "no-speech") {
      clearSilenceTimer();
      releaseApprovedSpeechAudio("processing_error");
      setState("idle");
      currentTranscriptRef.current = "";
      return;
    }
    console.error(...createAudioSafeLogArgs("Speech error:", event));
    setState("error");
    setError(event.error || "Voice recognition failed");
    clearSilenceTimer();
    releaseApprovedSpeechAudio("processing_error");

    // Auto-reset to idle after 1s
    setTimeout(() => {
      setState("idle");
      setError(null);
    }, 1000);
  });

  // Listen to speech recognition start
  useSpeechRecognitionEvent("start", () => {
    if (!activeRef.current) return;
    setState("recording");
  });

  const stopRecording = useCallback(async () => {
    try {
      clearSilenceTimer();
      setState("processing");
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error(
        ...createAudioSafeLogArgs("Failed to stop recording:", error),
      );
      setState("error");
      releaseApprovedSpeechAudio("processing_error");
      setTimeout(() => setState("idle"), 1000);
    }
  }, [clearSilenceTimer, releaseApprovedSpeechAudio]);

  const startRecording = useCallback(async (
    {
      approvedVoiceGateRequired = requireApprovedVoiceGate,
      approvedVoiceGateAccepted = false,
      approvedVoiceMatchedVoiceId = null,
      approvedVoiceRecognizedAtMs,
      approvedVoiceDownstreamAuthorization = null,
      approvedSpeechAudioSegment = null,
      approvedSpeechProcessingAudioSource,
      processingStartLatencyLimitMs =
        APPROVED_VOICE_PROCESSING_START_LATENCY_LIMIT_MS,
      releaseCapturedAudio,
    }: StartRecordingOptions = {},
  ) => {
    releaseApprovedSpeechAudio("processing_replaced");
    releaseCapturedAudioRef.current = releaseCapturedAudio || null;
    const eligibleRollingBufferAudioSegment =
      approvedSpeechAudioSegment?.byteLength
        ? approvedSpeechAudioSegment
        : null;
    approvedSpeechAudioSegmentRef.current = eligibleRollingBufferAudioSegment;
    const resolvedApprovedSpeechProcessingAudioSource =
      approvedSpeechProcessingAudioSource ??
      (eligibleRollingBufferAudioSegment
        ? APPROVED_VOICE_ROLLING_BUFFER_AUDIO_SOURCE
        : APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE);
    approvedSpeechProcessingAudioSourceRef.current = approvedVoiceGateAccepted
      ? resolvedApprovedSpeechProcessingAudioSource
      : null;

    if (
      approvedVoiceGateAccepted &&
      !eligibleRollingBufferAudioSegment &&
      resolvedApprovedSpeechProcessingAudioSource !==
        APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE
    ) {
      releaseApprovedSpeechAudio("processing_start_failed");
      setState("idle");
      setError("Live audio stream fallback required for approved speech");
      return false;
    }

    if (approvedVoiceGateRequired) {
      try {
        assertApprovedVoiceVerifiedForBufferedAudioDownstream({
          downstreamPath: "transcription",
          recognitionResult: {
            accepted: approvedVoiceGateAccepted,
            matchedVoiceId: approvedVoiceMatchedVoiceId,
            downstreamAuthorization: approvedVoiceDownstreamAuthorization,
          },
        });
      } catch {
        releaseApprovedSpeechAudio("processing_start_failed");
        setState("idle");
        setError("Approved voice gate required before speech recognition");
        return false;
      }
    }

    try {
      // Request permissions
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "권한 거부됨",
          "음성 인식을 사용하려면 설정에서 마이크 권한을 허용해주세요.",
        );
        releaseApprovedSpeechAudio("processing_start_failed");
        return false;
      }

      if (
        approvedVoiceGateAccepted &&
        approvedVoiceRecognizedAtMs !== undefined
      ) {
        const processingStart = createApprovedVoiceProcessingStart({
          approvedVoiceRecognizedAtMs,
          latencyLimitMs: processingStartLatencyLimitMs,
        });

        if (!processingStart.withinLimit) {
          setState("idle");
          setError(
            "Approved voice processing did not start within the latency limit",
          );
          releaseApprovedSpeechAudio("processing_start_failed");
          return false;
        }
      }

      // Start recording
      currentTranscriptRef.current = "";
      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: !approvedVoiceGateAccepted,
        addsPunctuation: false,
        contextualStrings: [],
        androidIntentOptions: {
          EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        },
      });

      setState("recording");
      startSilenceTimer();
      return true;
    } catch (error: any) {
      console.error(
        ...createAudioSafeLogArgs("Failed to start recording:", error),
      );

      if (
        error?.message?.includes("not available") ||
        error?.message?.includes("not supported")
      ) {
        Alert.alert(
          "음성 인식 불가",
          "이 기기에서는 음성 인식을 사용할 수 없습니다.",
        );
      } else if (error?.message?.includes("permission")) {
        Alert.alert(
          "권한 오류",
          "마이크 권한이 필요합니다. 설정에서 권한을 확인해주세요.",
        );
      } else {
        Alert.alert(
          "오류",
          "음성 인식을 시작할 수 없습니다. 앱을 다시 시작해주세요.",
        );
      }

      setState("error");
      releaseApprovedSpeechAudio("processing_start_failed");
      setTimeout(() => setState("idle"), 1000);
      return false;
    }
  }, [
    locale,
    releaseApprovedSpeechAudio,
    requireApprovedVoiceGate,
    startSilenceTimer,
  ]);

  const cancelRecording = useCallback(async () => {
    try {
      clearSilenceTimer();
      await ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      console.error(
        ...createAudioSafeLogArgs("Failed to cancel recording:", error),
      );
    } finally {
      releaseApprovedSpeechAudio("processing_cancelled");
      setState("idle");
      currentTranscriptRef.current = "";
    }
  }, [clearSilenceTimer, releaseApprovedSpeechAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      releaseApprovedSpeechAudio("processing_unmounted");
      ExpoSpeechRecognitionModule.abort();
    };
  }, [clearSilenceTimer, releaseApprovedSpeechAudio]);

  return {
    state,
    error,
    isRecording: state === "recording",
    isProcessing: state === "processing",
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
