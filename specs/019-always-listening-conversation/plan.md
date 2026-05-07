# 019 - Always-Listening Conversation

## Goal

Make Case feel like a human conversation partner on Android: he keeps listening in the background, responds only when addressed by an approved voice or a Case wake phrase, sends the request through the existing chat path, and speaks the assistant response aloud while also showing it in chat.

## Current Condition

- `ChatInput` already supports manual long-press voice input, wake-word handoff, approved-voice handoff, and TTS for assistant messages.
- Wake-word listening is currently used only when no approved voice profiles are loaded, so enrolled users cannot also activate Case by saying "case" or "케이스".
- Voice-triggered requests already submit through `onSend`, but the reply behavior should be explicit: voice activation should make the next assistant response both visible and spoken.
- `expo-speech-recognition` remains a single global speech-recognition resource, so wake-word and voice-input sessions must stay mutually exclusive.

## Plan

1. Update the `ChatInput` activation guards so wake-word listening can run after approved voice profile loading even when approved voices exist, while still disabling it during recording, processing, TTS playback, attachment work, disabled chat state, or active voice mode.
2. Keep approved-voice listening enabled for enrolled voices and preserve its downstream authorization metadata, rolling-buffer audio release behavior, and explicit audio-save prompt.
3. Make wake-word and approved-voice activation share the same visible voice-mode lifecycle where practical: stop current TTS, authorize transcript submission, clear stale save state, blur text input, start speech recognition, and reset authorization if start fails.
4. Ensure voice-triggered chat turns on spoken reply for the resulting assistant message without removing the existing chat bubble. Prefer a dedicated "speak next voice reply" state if changing the persistent TTS toggle would make typed chat unexpectedly auto-speak later.
5. Prevent double activation by relying on the existing `canListenForVoiceActivation` guard and the active recognition ownership checks in `useWakeWord` and `useVoiceInput`.

## Files To Update

- `android/components/chat/ChatInput.tsx`
- `android/hooks/useWakeWord.ts`, only if listener ownership needs a small guard adjustment
- `android/components/chat/ChatInput.node-test.mjs`
- `android/services/voice/speechRecognitionAccuracy.node-test.mjs`, only if wake phrase matching changes

## Verification

- Run focused source regression tests with `pnpm` from `android`, including the chat input and speech-recognition accuracy node tests.
- Run `pnpm typecheck` from `android` if the current worktree state allows it.
- Manual Android checks on a physical device: approved voice activates Case, "case/케이스" activates Case even with approved voices enrolled, non-addressed ambient speech is ignored, voice-triggered replies are spoken and shown, and listening resumes after the reply.
- Do not run an Android virtual machine and do not start Expo or any other dev server.

## Assumptions

- "Listen everything" means continuous local activation listening, not storing all ambient speech or sending non-triggered speech to the Hub.
- "If my voice indicate him" means either an approved/enrolled voice or a Case wake phrase can activate the conversation.
- No Hub API changes are needed; requests continue through `POST /chat`.
- Existing uncommitted repository changes are user-owned and must not be reverted.
