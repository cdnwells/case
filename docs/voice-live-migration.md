# GPT Live 1 voice migration

## Architecture Before

```text
Manual / approved speaker / wake word
  → React Native getUserMedia → WebRTC ↔ gpt-realtime-2 → speaker
  → on startup failure: device recognition → Hub /chat → provider
      → optional Hub /speech → gpt-4o-mini-tts → MP3 playback

Setup: frontend SDP → Hub /realtime/calls → OpenAI /v1/realtime/calls
Captions: completed Realtime transcripts → local chat messages
```

The old session enabled semantic VAD and `gpt-4o-mini-transcribe` captions.
It had no peer-connection recovery or server-session graceful close. The UI did
not supply previous conversation history. Wake-word recognition and approved
speaker capture are separate local activation mechanisms.

## Architecture After

```text
Activation → stop local activation capture → microphone permission
  → Hub /live/sessions → OpenAI /v1/live/sessions → SDP answer
  → WebRTC session.started → listening

Microphone ↔ frontend WebRTC media tracks ↔ gpt-live-1 ↔ speaker
                    │
                    └─ data channel → incremental user/assistant captions
                                      → existing chat message list

Optional delegation → Hub text-only GPT/Ollama dispatch → Live commentary
Stop → session.close → session.closed (or timeout) → tracks/connection released
```

The Hub pins `gpt-live-1`, supplies voice instructions and bounded prior text,
and keeps the project key server-side. Session responses contain SDP, a session
ID, voice/model metadata, and a random Hub control token. They contain no OpenAI
key or client secret. Control tokens expire with the Hub's in-memory session.
The Hub's existing lack of token enforcement for general API routes is unchanged.

Live manages continuous speech without manual audio commits, response triggers,
or a separate STT/TTS chain. Audio-level statistics drive listening/speaking
status and local barge-in suppression; the microphone continues running while
output is suppressed. WebRTC consumes media continuously rather than queueing
recorded files. Native audio focus failures and browser autoplay failures surface
as voice errors. Device-specific audio levels and echo cancellation need manual
verification; transcript arrival is not treated as proof of playback.

Caption fragments update per-speaker message rows. A 1.5-second timestamp gap
is a display grouping heuristic, not an authoritative turn boundary. User and
assistant rows can overlap. Duplicate events are suppressed. The service restores
recent text in replacement sessions, with a conservative UTF-8 size limit.
Context is kept within the active chat; this migration does not introduce durable
chat history or a new database schema. Older history beyond that bound is omitted.

Temporary connection failures retry up to three times with exponential backoff.
Permission/authentication failures require an explicit restart. Stop cancels
retries and pending HTTP work. Late microphone/session creation results are
reclaimed. Closing waits up to three seconds for finalization, then attempts Hub
hangup. A session is not reported as finalized merely because its transport closed.
The Hub also bounds session registry lifetime to one hour.

`store: false` prevents enabling Live session recordings/forks. Existing local
approved-audio explicit-save rules remain. Buffered activation audio is not
uploaded as a recorded file; speech-to-speech starts from the live microphone.

Client delegation uses accumulated captions and rejects stale results after new
speech. Delegation IDs prevent duplicate Hub dispatch. GPT/Ollama results never
enter command queuing or file-upload paths. Codex/Claude CLI dispatch can execute
tools, so those tasks continue through text chat, consistent with the previous
voice-mode execution restriction.

## Changed Files

- `hub/live.js`, `hub/hub.js`: Live sessions, bounded history, safe error responses,
  per-session controls, and text-only delegation.
- `android/services/voice/liveConversation.ts`: transport lifecycle, captions,
  context recovery, interruption, and delegation state.
- `android/services/voice/liveTransport.ts` and `.web.ts`: native/browser WebRTC.
- `android/hooks/useOpenAILiveConversation.ts`: React binding and background cleanup.
- `android/services/api/{chatService,types,mockChatService}.ts`: Live contracts.
- `android/components/chat/{ChatInput,ChatScreen}.tsx`, `android/hooks/useChat.ts`:
  existing controls, status/error display, and caption updates.
- Wake-word, approved-voice, native capture, and audio-session wrappers: awaited
  microphone handoff, canceled permission results, and audio focus errors.
- Voice tests, this document, README, and environment examples.

## Removed Files

- `android/hooks/useOpenAIRealtimeConversation.ts` and its old source-only test.
- `android/hooks/useVoiceInput.ts` and its dedicated legacy recognition test.
- `hub/realtime.test.js`, replaced by Live session tests.

The old `/realtime/calls` route, Realtime configuration, and automatic chained
fallback are removed. `/speech`, device TTS, `expo-speech-recognition`,
`expo-audio`, voice profiles, and audio-buffer code remain because other active
features use them. Unused dictation vocabulary, confidence selection, and silence-threshold helpers
were also removed from `speechRecognitionAccuracy.ts`; wake-word helpers remain.
No package dependency changes are required.

## Environment Variables

| Variable | Location | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Hub environment / ignored `hub/.env` | Project key with GPT Live access |
| `OPENAI_LIVE_VOICE` | Hub | Voice, default `marin` |
| `OPENAI_LIVE_INSTRUCTIONS` | Hub | Optional startup instructions |
| `OPENAI_LIVE_TIMEOUT` | Hub | HTTP timeout, default 30 seconds |
| `OPENAI_BASE_URL` | Hub | Existing API base; must support `/live/sessions` |
| `EXPO_PUBLIC_CASE_HUB_URL` | Android | Hub URL only |

Remove unused `OPENAI_REALTIME_*` settings and
`EXPO_PUBLIC_OPENAI_REALTIME_ENABLED` from your local deployment configuration.
`OPENAI_TTS_*` still configures text-chat read-aloud. No populated `.env` files
are part of the migration commit.

## How to Run

Configure `hub/.env` from `hub/.env.example`. Keep the key out of frontend files.
From the repository root, run `./run_servers.sh` when you want to start the Hub.
For delegated text reasoning, select GPT or Ollama as usual; the Live audio
connection always uses OpenAI GPT Live 1 independently of that selection.

Build without starting a dev server or emulator:

```sh
pnpm --dir android typecheck
pnpm --dir android exec expo export --platform android --output-dir /tmp/case-live-android-js
cd android/android
APP_VARIANT=production ./gradlew :app:assembleRelease --console=plain --no-daemon --max-workers=2 \
  "-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=2g"
```

The build here needed regeneration of stale generated autolinking paths and the
JVM memory override above. No Gradle project settings were changed.

The configured app platforms contain Android only. A web export is not enabled;
the web transport is isolated for compatibility rather than enabling a new app
platform. Install the resulting release APK on your physical phone for testing.

## How to Test

Automated checks:

```sh
pnpm --dir hub test
pnpm --dir android typecheck
pnpm --dir android exec node --test services/voice/liveConversation.node-test.mjs hooks/useApprovedVoiceGate.node-test.mjs components/chat/ChatInput.node-test.mjs
```

On a physical Android phone:

1. Start voice with an empty composer. Deny microphone permission and check the
   actionable error; grant permission in Settings and retry.
2. Wait for the connecting indicator to become listening. Speak naturally in
   Korean. Verify immediate microphone streaming, audible replies, and captions.
3. Interrupt a long reply. Check that the mic stays active, old output stops,
   and the next reply follows the correction. Repeat using speakerphone and a headset.
4. Give a detail and ask a follow-up. Disconnect/reconnect the network and check
   that recent context remains, captions do not duplicate, and retries stop after
   the configured limit. Test invalid API credentials separately: no retry loop.
5. Press Stop during permission, SDP setup, playback, and reconnect. Confirm the
   phone's mic indicator goes away, audio focus returns, and no retry restarts it.
6. Background the app and return. Test another app taking audio focus. Restart
   voice explicitly after interruption and check output routing.
7. Check wake-word and approved-speaker activation, explicit audio saving,
   text-chat read-aloud, ordinary chat, and attachments.
8. Inspect Hub session HTTP responses and the frontend bundle: no permanent
   OpenAI key. Verify `store` remains false and logs contain no credentials/audio.

## Verification results

- Hub suite: 274 passed.
- Frontend TypeScript check: passed.
- Focused Live service, activation integration, and wake-word helper tests: passed.
- Android production JavaScript export: passed.
- Android release APK: built successfully without a dev server or emulator.
- Real GPT Live connection and physical audio checks: not run; no project key configured.

## Remaining Issues

Real OpenAI session startup, microphone/speaker quality, and natural interruption
require a configured project key and physical-device validation. No API key was
configured in the implementation shell, and no Android emulator or dev server
was started. Mock tests validate protocol handling, not model availability or
real audio quality.

The broader frontend suite has seven pre-existing failures (six image-attachment
source assertions and one README/audio-buffer assertion), reproduced against the
original commit. They are outside this voice migration. See the final task report
for completed build and focused test results.

## API References

- [Live WebRTC setup](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Create Live session schema](https://developers.openai.com/api/reference/typescript/resources/live/methods/create)
- [Realtime migration](https://developers.openai.com/api/docs/guides/live-migration)
- [Live lifecycle and captions](https://developers.openai.com/api/docs/guides/live-conversations)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
