# Voice Input Implementation Plan

## Context

Add voice input functionality to the chat interface, allowing users to speak their messages instead of typing. When the user taps a microphone button (positioned left of the send button), the app will start recording, automatically stop after 4 seconds of silence, convert speech to text, and send it to the GPT worker.

The project already has @react-native-voice/voice@3.2.4 installed but not configured. This is an Expo managed workflow (React Native 0.81.5, Expo 54) with existing message sending infrastructure through ChatService → Hub → GPT worker.

## Implementation Steps

### 1. Configure Voice Plugin and Permissions

**File: `/home/cdnwell/projects/case/android/app.json`**

Add the voice plugin to enable microphone permissions:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-local-authentication",
      [
        "@react-native-voice/voice",
        {
          "microphonePermission": "이 앱이 음성 명령을 인식하려면 마이크 접근 권한이 필요합니다.",
          "speechRecognitionPermission": "이 앱이 음성을 텍스트로 변환하려면 음성 인식 권한이 필요합니다."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "이 앱이 음성 명령을 인식하려면 마이크 접근 권한이 필요합니다.",
        "NSSpeechRecognitionUsageDescription": "이 앱이 음성을 텍스트로 변환하려면 음성 인식 권한이 필요합니다."
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
}
```

**After config change**: Run `npx expo prebuild --clean` to regenerate native files.

### 2. Add Voice Icon Mappings

**File: `/home/cdnwell/projects/case/android/components/ui/icon-symbol.tsx`**

Add microphone icons to the MAPPING object:

```typescript
const MAPPING = {
  // ... existing mappings ...
  'mic.fill': 'mic',
  'stop.circle.fill': 'stop',
} as const satisfies IconMapping;
```

### 3. Create Voice Input Hook

**File: `/home/cdnwell/projects/case/android/hooks/useVoiceInput.ts` (NEW)**

Implement a custom hook that encapsulates voice recording logic:

**Key responsibilities:**
- Manage voice state machine: `idle` → `recording` → `processing` → `idle`
- Handle Voice library events: onSpeechStart, onSpeechEnd, onSpeechResults, onSpeechError
- Implement 4-second silence detection using a timer that checks if no speech detected for 4000ms
- Request microphone permissions
- Provide startRecording, stopRecording, cancelRecording functions

**State machine:**
- `idle`: Ready to record
- `recording`: Actively listening (red background, pulse animation)
- `processing`: Converting speech to text (shows spinner)
- `error`: Brief error state (auto-resets to idle after 1s)

**Auto-stop logic:**
- Track last speech time in a ref
- Reset timer whenever Voice.onSpeechResults fires
- Auto-stop if no results received for 4000ms
- Also listen to Voice.onSpeechEnd for native detection

**Interface:**
```typescript
interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  locale?: string;
  silenceTimeout?: number;
}

export function useVoiceInput(options: UseVoiceInputOptions): {
  state: 'idle' | 'recording' | 'processing' | 'error';
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}
```

### 4. Integrate Voice Button into ChatInput

**File: `/home/cdnwell/projects/case/android/components/chat/ChatInput.tsx`**

**Changes:**

1. Import and use the voice hook:
```typescript
import { useVoiceInput } from '@/hooks/useVoiceInput';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const { isRecording, isProcessing, state: voiceState, startRecording, stopRecording, cancelRecording } = useVoiceInput({
  onTranscript: (transcript) => {
    setText(transcript);
    if (transcript.trim()) {
      onSend(transcript);
      setText('');
    }
  },
  locale: 'ko-KR',
  silenceTimeout: 4000,
});
```

2. Add pulse animation for recording state:
```typescript
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
```

3. Add voice button UI (insert BEFORE TextInput in the inputContainer):
```typescript
<Animated.View style={animatedStyle}>
  <TouchableOpacity
    style={[
      styles.voiceButton,
      { backgroundColor: isRecording ? '#ff4444' : 'transparent' },
    ]}
    onPress={isRecording ? stopRecording : startRecording}
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
```

4. Add haptic feedback to recording start:
```typescript
const handleStartRecording = async () => {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  textInputRef.current?.blur();
  await startRecording();
};
```

5. Add mutual exclusivity - cancel recording when text input focused:
```typescript
const handleTextInputFocus = () => {
  if (isRecording) {
    cancelRecording();
  }
};

// In TextInput:
<TextInput
  onFocus={handleTextInputFocus}
  editable={!disabled && !isRecording && !isProcessing}
  // ... other props
/>
```

6. Add style:
```typescript
voiceButton: {
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 8,
  marginBottom: 2,
},
```

## Critical Files to Modify

1. `/home/cdnwell/projects/case/android/app.json` - Add voice plugin and permissions
2. `/home/cdnwell/projects/case/android/components/ui/icon-symbol.tsx` - Add mic icons
3. `/home/cdnwell/projects/case/android/hooks/useVoiceInput.ts` - NEW: Voice input hook
4. `/home/cdnwell/projects/case/android/components/chat/ChatInput.tsx` - Integrate voice UI

## Existing Code to Reuse

- **Message sending flow**: Use existing `onSend` prop callback (no changes needed)
- **ChatService**: Already handles POST to `/chat` endpoint
- **Haptic feedback**: Already using `expo-haptics` in ChatInput
- **Icon system**: Reuse `IconSymbol` component with SF Symbols → Material Icons mapping
- **Animation**: Use existing `react-native-reanimated` (already used in TypingIndicator)

## Verification Steps

### 1. Configuration Verification
- Run `npx expo prebuild --clean`
- Build and run on physical device (voice requires real device, not simulator)
- Check app launches without crashes
- Verify icons render correctly

### 2. Permission Testing
- First tap on microphone button should request RECORD_AUDIO permission (Android)
- Grant permission and verify recording starts
- Test permission denial - should show appropriate error message

### 3. Voice Recording Flow
- Tap microphone button → red background appears → pulse animation starts
- Speak a message in Korean
- Verify auto-stop after ~4 seconds of silence
- Check transcript sent to GPT worker automatically
- Verify GPT worker response appears in chat

### 4. Edge Cases
- Tap microphone while already recording → should stop recording
- Start typing while recording → should cancel recording
- Record empty/unintelligible speech → should not send message
- Test with very short utterances (<1 second)
- Test with longer speech (10+ seconds with pauses)
- Test app going to background during recording → should cancel

### 5. Visual States
- Idle: Transparent background, gray mic icon
- Recording: Red background (#ff4444), white stop icon, pulse animation
- Processing: Same background as idle, shows ActivityIndicator
- Error: Brief flash, returns to idle after 1 second

### 6. End-to-End Test
- Open chat screen
- Tap microphone button
- Say: "오늘 날씨 알려줘" (Korean: "Tell me today's weather")
- Wait for auto-stop after 4 seconds
- Verify message appears in chat as user message
- Verify GPT response appears
- Verify can immediately record another message

## Notes

- The voice package is already installed (3.2.4), just needs configuration
- Korean locale (`ko-KR`) is used for speech recognition
- Auto-send after transcription provides seamless UX
- Recording and text input are mutually exclusive (only one active at a time)
- All error states auto-recover to idle after brief feedback
