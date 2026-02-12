# Wake Word Detection: Always-On "Case" Listener

## Context

The app should always listen for the wake word "case". When detected, voice input mode activates automatically (same as long-press behavior: send button turns red with mic icon). After voice input completes, the wake word listener resumes.

**Key constraint:** `expo-speech-recognition` is a single global resource. `useSpeechRecognitionEvent` dispatches events to ALL registered handlers. Only one recognition session can run at a time, so wake word and voice input must coordinate via `active` ref guards to avoid crosstalk.

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `android/hooks/useWakeWord.ts` | **CREATE** | Always-on listener for wake word "case" |
| `android/hooks/useVoiceInput.ts` | **MODIFY** | Add `active` flag to gate event handlers |
| `android/components/chat/ChatInput.tsx` | **MODIFY** | Integrate wake word, coordinate modes |

## 1. Modify `useVoiceInput.ts` — Add `active` Guard

Add `active?: boolean` (default `true`) to options. Use an `activeRef` to gate all four `useSpeechRecognitionEvent` handlers (`result`, `end`, `error`, `start`). When `active` is false, handlers are no-ops — this prevents voice input from reacting to wake word recognition events.

```typescript
// New option
active?: boolean; // default true

// Inside hook
const activeRef = useRef(active);
activeRef.current = active;

// Each handler gets:
useSpeechRecognitionEvent("result", (event) => {
  if (!activeRef.current) return;
  // ...existing logic
});
// Same for "end", "error", "start"
```

## 2. Create `useWakeWord.ts`

**Path:** `android/hooks/useWakeWord.ts`

Manages always-on speech recognition that listens for the wake word "case" (or "케이스").

**Interface:**
```typescript
interface UseWakeWordOptions {
  enabled: boolean;          // false when voice input is active
  wakeWords?: string[];      // default ["case", "케이스"]
  locale?: string;           // default "ko-KR"
  onDetected: () => void;    // called when wake word found
}
Returns: { isListening: boolean }
```

**Key design decisions:**
- Uses `useSpeechRecognitionEvent` with `enabledRef` guard (same pattern as voice input)
- Uses `sessionActiveRef` to track ownership of the current recognition session — prevents the cleanup `useEffect` from aborting a voice input session that took over
- Wake word detection flow: detect in "result" handler → set `wakeWordDetectedRef = true` → call `abort()` → in "end" handler check flag → call `onDetected()` (ensures recognition fully stopped before voice input starts)
- Auto-restarts on "end" if still enabled and no wake word detected
- Auto-restarts on "error" after 2s delay
- Uses `continuous: true` for persistent listening
- Cleanup on unmount only aborts if this hook still owns the session

## 3. Modify `ChatInput.tsx`

**Integration:**
- Add `useWakeWord({ enabled: !isVoiceMode && !isRecording && !isProcessing, onDetected: handleWakeWordDetected })`
- Pass `active: isVoiceMode` to `useVoiceInput` — voice input only processes events during voice mode
- Add `handleWakeWordDetected` callback: haptic feedback → stop TTS if speaking → enter voice input mode → start recording (same as `handleLongPressStart`)

**Flow:**
1. App mounts → wake word listener starts (continuous recognition)
2. User says "case" → detected in transcript → wake word aborts → "end" fires → `onDetected()` called
3. ChatInput enters voice mode → `isVoiceMode = true` → wake word `enabled` becomes `false`, voice input `active` becomes `true`
4. Voice input starts → user speaks command → silence timeout → transcript sent → `isVoiceMode = false`
5. Wake word `enabled` becomes `true` again → auto-restarts listening

## Verification

Manual testing on physical Android device:
1. Open app → wake word listener should start automatically (no visual indicator needed)
2. Say "case" → send button should turn red with mic icon (voice input mode)
3. Speak a command → silence timeout → message sent → button reverts to send icon
4. Wake word listener should resume automatically
5. Long-press send button (3s) still works independently
6. Verify wake word doesn't trigger false positives during normal typing
