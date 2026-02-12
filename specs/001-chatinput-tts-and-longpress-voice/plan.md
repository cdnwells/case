# ChatInput: TTS Button + Long-Press Voice Input

## Context

The current ChatInput has a left voice-input (mic) button and a right send button. The user wants to:
1. Replace the left button with a **TTS (text-to-speech) toggle** that reads assistant responses aloud
2. Add a **3-second long-press** on the right send button to enter **speech-input mode**

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `android/hooks/useTextToSpeech.ts` | **CREATE** | New TTS hook wrapping `expo-speech` |
| `android/components/ui/icon-symbol.tsx` | **MODIFY** | Add speaker icon mappings |
| `android/components/chat/ChatScreen.tsx` | **MODIFY** | Pass `lastAssistantMessage` to ChatInput |
| `android/components/chat/ChatInput.tsx` | **MODIFY** | Replace left button, add long-press to right button |

No changes to `useVoiceInput.ts`, `useChat.ts`, or `theme.ts`.

---

## 1. Create `useTextToSpeech.ts`

**Path:** `android/hooks/useTextToSpeech.ts`

- Wrap `expo-speech` (already installed v14.0.8, currently unused)
- Returns `{ isSpeaking, speak(text), stop() }`
- On mount, use `Speech.getAvailableVoicesAsync()` to find a Korean male voice and store its identifier
- `speak()`: stops any current speech, then calls `Speech.speak(text, { language: 'ko-KR', voice: maleVoiceId, onStart, onDone, onStopped, onError })`
- `stop()`: calls `Speech.stop()`, resets state
- Cleanup on unmount: `Speech.stop()`

## 2. Add Icon Mappings in `icon-symbol.tsx`

Add to the `MAPPING` object:
```
'speaker.wave.2.fill' → 'volume-up'      // TTS button icon (speaker with sound)
'speaker.slash.fill'  → 'volume-off'      // TTS active icon (press to stop)
```

## 3. Update `ChatScreen.tsx`

- Compute `lastAssistantMessage` from the messages array (last message with `role === 'assistant'`)
- Pass it as a new prop to `<ChatInput lastAssistantMessage={lastAssistantMessage} />`

## 4. Refactor `ChatInput.tsx`

### Props
Add `lastAssistantMessage?: string` to `ChatInputProps`.

### Left Button → TTS Toggle
- Replace the voice-input mic button with a TTS toggle
- Use `useTextToSpeech` hook
- Remove the old pulse animation from left button (move to right button)

**Blue-and-black color scheme:**
| State | Background | Icon Color |
|-------|-----------|------------|
| Idle (has content) | `#1A1A2E` (deep dark navy) | `#4A90D9` (blue) |
| Idle (no content) | `transparent` | `placeholderColor` |
| Speaking | `#4A90D9` (blue) | `#FFFFFF` |

**Icons:** `speaker.wave.2.fill` when idle, `speaker.slash.fill` when speaking

### Right Button → Send + Long-Press Voice Input
- Keep normal press → send message
- Add `onLongPress` with `delayLongPress={3000}` → enter voice-input mode
- New state: `isVoiceMode` (boolean)
- The `useVoiceInput` hook stays in the component; it powers the long-press mode
- `onTranscript`: set text, auto-send, revert `isVoiceMode` to false

**Send button states:**
| State | Background | Icon |
|-------|-----------|------|
| Can send | `caseColor` (#4A5568) | `arrow.up` |
| Cannot send | `transparent` | `arrow.up` (gray) |
| Voice mode (recording) | `#ff4444` (red) | `mic.fill` (white) |
| Voice mode (processing) | `#ff4444` (red) | ActivityIndicator |

- Pulse animation moves here (applied when `isRecording`)
- Button is always enabled (not disabled) so long-press always works; `handleSend` guards internally
- When long-press triggers, stop TTS if speaking, start recording with haptic (Heavy)

### Edge Cases
- **Voice input while TTS speaking**: `handleLongPressStart` stops TTS first
- **Voice mode exits on error**: `useEffect` watches `voiceState` and resets `isVoiceMode` when idle
- **Text input focus during recording**: cancels recording and resets `isVoiceMode`

---

## Verification

Manual testing on a physical Android device:
1. Send a message, get an assistant response → left button should show blue speaker icon on dark background
2. Tap left button → assistant response read aloud in Korean male voice, button turns blue with white icon
3. Tap left button again → speech stops, button reverts
4. Long-press send button for 3+ seconds → heavy haptic, button turns red with mic icon, recording starts
5. Speak → silence timeout → transcript auto-sent, button reverts to send icon
6. Verify: long-press while TTS is speaking → TTS stops, voice input starts
7. Verify: tap text input during recording → recording cancels, button reverts
