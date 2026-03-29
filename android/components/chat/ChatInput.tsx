import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useWakeWord } from "@/hooks/useWakeWord";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  lastAssistantMessage?: string;
  onLocalMessage?: (content: string, role?: "user" | "assistant") => void;
}

export function ChatInput({
  onSend,
  disabled,
  lastAssistantMessage,
  onLocalMessage,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const hasStartedRecording = useRef(false);
  const textInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();

  const backgroundColor = colorScheme === "dark" ? "#2c2c2e" : "#f5f5f5";
  const textColor = useThemeColor({}, "text");
  const caseColor = useThemeColor({}, "symbolColor");
  const placeholderColor = colorScheme === "dark" ? "#636366" : "#8e8e93";

  // TTS toggle state and hook
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isTTSButtonToggled, setIsTTSButtonToggled] = useState(false);
  const prevMessageRef = useRef<string | undefined>(undefined);
  const {
    isSpeaking,
    speak,
    speakAsync,
    stop: stopSpeaking,
  } = useTextToSpeech({
    language: "ko-KR",
    pitch: 1.0,
    rate: 1.0,
  });

  // Auto-speak new assistant responses when TTS is enabled
  useEffect(() => {
    if (
      isTTSEnabled &&
      lastAssistantMessage &&
      lastAssistantMessage !== prevMessageRef.current
    ) {
      speak(lastAssistantMessage);
    }
    prevMessageRef.current = lastAssistantMessage;
  }, [isTTSEnabled, lastAssistantMessage, speak]);

  // Voice input hook for right button long-press
  const {
    state: voiceState,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceInput({
    onTranscript: (transcript) => {
      setText(transcript);
      if (transcript.trim()) {
        onSend(transcript);
        setText("");
      }
      setIsVoiceMode(false);
    },
    locale: "ko-KR",
    silenceTimeout: 4000,
    active: isVoiceMode,
  });

  // Track when recording actually starts
  useEffect(() => {
    if (isRecording) {
      hasStartedRecording.current = true;
    }
  }, [isRecording]);

  // Reset voice mode only after recording has started and then returned to idle
  useEffect(() => {
    if (
      isVoiceMode &&
      hasStartedRecording.current &&
      voiceState === "idle" &&
      !isRecording &&
      !isProcessing
    ) {
      setIsVoiceMode(false);
      hasStartedRecording.current = false;
    }
  }, [isVoiceMode, voiceState, isRecording, isProcessing]);

  // Wake word detection — always-on listener for "case"
  const WAKE_WORD_RESPONSES = ["안녕, 인간", "대답해라", "무엇인가?"];

  const handleWakeWordDetected = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    if (isSpeaking) {
      stopSpeaking();
    }

    hasStartedRecording.current = false;
    setIsVoiceMode(true);
    textInputRef.current?.blur();

    // Speak a random greeting (voice only, no chat message)
    const response =
      WAKE_WORD_RESPONSES[
        Math.floor(Math.random() * WAKE_WORD_RESPONSES.length)
      ];
    setIsTTSButtonToggled(true);
    await speakAsync(response);

    await startRecording();

    setIsTTSEnabled(true);
  }, [
    isSpeaking,
    isTTSButtonToggled,
    isTTSEnabled,
    stopSpeaking,
    speakAsync,
    startRecording,
  ]);

  useWakeWord({
    enabled: !isVoiceMode && !isRecording && !isProcessing && !isSpeaking,
    onDetected: handleWakeWordDetected,
  });

  // Pulse animation for send button in voice mode
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(0.95, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));


  // --- TTS toggle (left button) ---
  const handleTTSToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isTTSEnabled) {
      setIsTTSButtonToggled(false);
      setIsTTSEnabled(false);
      stopSpeaking();
    } else {
      setIsTTSButtonToggled(true);
      setIsTTSEnabled(true);
    }
  };

  // --- Send button (right) ---
  const handleSend = () => {
    if (!text.trim() || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSend(text);
    setText("");
  };

  const handleLongPressStart = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    // Stop TTS if speaking
    if (isSpeaking) {
      stopSpeaking();
    }
    hasStartedRecording.current = false;
    setIsVoiceMode(true);
    textInputRef.current?.blur();
    await startRecording();
  };

  const handleStopVoiceInput = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await stopRecording();
  };

  const handleTextInputFocus = () => {
    if (isRecording) {
      cancelRecording();
      setIsVoiceMode(false);
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { paddingBottom: 8 }]}>
        <View style={[styles.inputContainer, { backgroundColor }]}>
          {/* TTS toggle button (left) */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              {
                backgroundColor: isTTSButtonToggled ? "#4A90D9" : "#e9e9e9",
              },
            ]}
            onPress={handleTTSToggle}
            accessibilityLabel={
              isTTSButtonToggled ? "음성 출력 끄기" : "음성 출력 켜기"
            }
          >
            <IconSymbol
              name={
                isTTSButtonToggled
                  ? "speaker.wave.2.fill"
                  : "speaker.slash.fill"
              }
              size={20}
              color={isTTSButtonToggled ? "#FFFFFF" : placeholderColor}
            />
          </TouchableOpacity>

          <TextInput
            ref={textInputRef}
            style={[styles.input, { color: textColor }]}
            value={text}
            onChangeText={setText}
            onFocus={handleTextInputFocus}
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={4000}
            editable={!disabled && !isRecording && !isProcessing}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          {/* Send / Voice input button (right) */}
          <Animated.View style={isVoiceMode ? animatedStyle : undefined}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: isVoiceMode
                    ? "gray"
                    : canSend
                      ? caseColor
                      : "transparent",
                },
              ]}
              onPress={isVoiceMode ? handleStopVoiceInput : handleSend}
              onLongPress={handleLongPressStart}
              delayLongPress={3000}
              disabled={false}
              accessibilityLabel={
                isVoiceMode ? "음성 입력 중지" : "메시지 보내기"
              }
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol
                  name={isVoiceMode ? "mic.fill" : "arrow.up"}
                  size={20}
                  color={
                    isVoiceMode ? "#fff" : canSend ? "#fff" : placeholderColor
                  }
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 9,
    paddingVertical: 4,
    minHeight: 44,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    paddingLeft: 10,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 3,
  },
});
