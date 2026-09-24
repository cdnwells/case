# Case Realtime broker

This is the only trusted-server component required by Case Live voice. It exchanges an Android WebRTC SDP offer for an OpenAI Live SDP answer. Audio and data-channel traffic then flow directly between the phone and OpenAI.

Required secrets:

- `OPENAI_API_KEY`: OpenAI project key; server-side only.
- `CASE_REALTIME_TOKEN`: separate credential shared with the Case app.

Optional configuration:

- `OPENAI_LIVE_MODEL` (default `gpt-live-1`)
- `OPENAI_LIVE_VOICE` (default `marin`)
- `OPENAI_LIVE_INSTRUCTIONS`

Expose the worker over HTTPS and set the Android build variables:

```dotenv
EXPO_PUBLIC_CASE_REALTIME_URL=https://your-realtime-broker.example
EXPO_PUBLIC_CASE_REALTIME_TOKEN=your-broker-specific-token
```

Never set `OPENAI_API_KEY` in the Android environment or Expo configuration.

The request/response contract follows the official OpenAI WebRTC connection flow:
<https://developers.openai.com/api/docs/guides/voice-webrtc>
