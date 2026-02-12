import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect } from "react";
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
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();

  const backgroundColor = colorScheme === "dark" ? "#2c2c2e" : "#f5f5f5";
  const textColor = useThemeColor({}, "text");
  const caseColor = useThemeColor({}, "symbolColor");
  const placeholderColor = colorScheme === "dark" ? "#636366" : "#8e8e93";

  // Voice input hook
  const {
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
    },
    locale: "ko-KR",
    silenceTimeout: 4000,
  });

  // Animation for recording button
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(0.95, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleStartRecording = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    textInputRef.current?.blur();
    await startRecording();
  };

  const handleStopRecording = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await stopRecording();
  };

  const handleTextInputFocus = () => {
    if (isRecording) {
      cancelRecording();
    }
  };

  const handleSend = () => {
    if (text.trim() && !disabled) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSend(text);
      setText("");
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { paddingBottom: 8 }]}>
      <View style={[styles.inputContainer, { backgroundColor }]}>
        {/* Voice input button */}
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              { backgroundColor: isRecording ? "#ff4444" : "transparent" },
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={disabled || isProcessing}
            accessibilityLabel={isRecording ? "녹음 중지" : "음성 입력 시작"}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={placeholderColor} />
            ) : (
              <IconSymbol
                name={isRecording ? "stop.circle.fill" : "mic.fill"}
                size={20}
                color={isRecording ? "#fff" : placeholderColor}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          ref={textInputRef}
          style={[styles.input, { color: textColor }]}
          value={text}
          onChangeText={setText}
          onFocus={handleTextInputFocus}
          placeholder="임무를 말해주세요."
          placeholderTextColor={placeholderColor}
          multiline
          maxLength={4000}
          editable={!disabled && !isRecording && !isProcessing}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? caseColor : "transparent" },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <IconSymbol
            name="arrow.up"
            size={20}
            color={canSend ? "#fff" : placeholderColor}
          />
        </TouchableOpacity>
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
    marginRight: 8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
});
