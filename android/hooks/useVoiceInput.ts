import { useEffect, useRef, useState, useCallback } from "react";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { Alert } from "react-native";

type VoiceState = "idle" | "recording" | "processing" | "error";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  locale?: string;
  silenceTimeout?: number;
  active?: boolean;
}

interface UseVoiceInputReturn {
  state: VoiceState;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceInput({
  onTranscript,
  locale = "ko-KR",
  silenceTimeout = 4000,
  active = true,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const currentTranscriptRef = useRef<string>("");

  // Ref for active flag to avoid stale closures in event handlers
  const activeRef = useRef(active);
  activeRef.current = active;

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
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
    if (transcript.trim()) {
      onTranscript(transcript);
    }
    setState("idle");
    currentTranscriptRef.current = "";
  });

  // Listen to speech recognition errors
  useSpeechRecognitionEvent("error", (event) => {
    if (!activeRef.current) return;
    // Ignore "aborted" errors — normal during wake word → voice input handoff
    if (event.error === "aborted") return;
    console.error("Speech error:", event);
    setState("error");
    setError(event.error || "Voice recognition failed");
    clearSilenceTimer();

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
      console.error("Failed to stop recording:", error);
      setState("error");
      setTimeout(() => setState("idle"), 1000);
    }
  }, [clearSilenceTimer]);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "권한 거부됨",
          "음성 인식을 사용하려면 설정에서 마이크 권한을 허용해주세요.",
        );
        return;
      }

      // Start recording
      currentTranscriptRef.current = "";
      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: [],
        androidIntentOptions: {
          EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        },
      });

      setState("recording");
      startSilenceTimer();
    } catch (error: any) {
      console.error("Failed to start recording:", error);

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
      setTimeout(() => setState("idle"), 1000);
    }
  }, [locale, startSilenceTimer]);

  const cancelRecording = useCallback(async () => {
    try {
      clearSilenceTimer();
      await ExpoSpeechRecognitionModule.abort();
      setState("idle");
      currentTranscriptRef.current = "";
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    }
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      ExpoSpeechRecognitionModule.abort();
    };
  }, [clearSilenceTimer]);

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
