# Case

Case is a personal AI assistant stack with an Android client and a merged Node.js Hub. The Android app captures text, files, images, and voice input; the Hub owns chat provider dispatch, memory injection, command result polling, OpenAI speech/realtime calls, and optional file-worker integration.

## Demo

![Case demo](repo/case_001.gif)

## Architecture

```text
Android app (Expo / React Native)
        |
        | HTTP
        v
Hub (Node.js / Fastify, port 5000)
        |
        +-- Chat providers: Codex CLI, Claude Code CLI, OpenAI GPT, Ollama
        +-- Memory: in-process file-backed Memory v2 store
        +-- Speech: OpenAI text-to-speech and Realtime WebRTC session bridge
        +-- Files: optional Drive worker proxy for uploads, downloads, and attachments
```

The current runtime is the merged Hub. Legacy Python workers and provider prompt assets remain under `hub/workers/`, but the main local runner starts only `hub/hub.js`.

## Features

- Text chat through selectable providers: `codex`, `claude`, `gpt`, or `ollama`.
- Image understanding for Codex and supported OpenAI GPT models.
- Google Drive file attachment handling through an optional Drive worker.
- Generated file upload/download flow through the same Drive worker interface.
- File-backed long-term memory with core, working, episodic, semantic, and procedural memory records.
- Command planning from provider responses with in-memory queue status and Android polling.
- OpenAI text-to-speech and OpenAI Realtime voice session endpoints.
- Android voice UX with biometric lock, battery optimization prompt, approved voice profiles, wake-word fallback, rolling audio buffer controls, and explicit approved-audio save flow.
- Android phone-only app configuration for physical Android devices.

## Repository Layout

```text
case/
|-- android/              # Expo / React Native Android app
|   |-- app/              # Expo Router entrypoints
|   |-- components/       # Chat, auth, and UI components
|   |-- hooks/            # Chat, voice, realtime, TTS, auth hooks
|   |-- modules/          # Local native Expo modules
|   `-- services/         # API and voice service code
|-- hub/                  # Fastify Hub
|   |-- hub.js            # Main server and route definitions
|   |-- memory-v2.js      # File-backed memory model
|   |-- provider*.js      # Provider menu, capabilities, validation
|   `-- workers/          # Legacy worker code and provider prompt assets
|-- specs/                # Numbered implementation plans
|-- repo/                 # Demo assets
`-- run_servers.sh        # Local Hub runner
```

## Requirements

- Node.js with `pnpm`.
- A real Android phone for manual Android testing.
- One or more chat provider dependencies:
  - Codex CLI for `CHAT_PROVIDER=codex`.
  - Claude Code CLI for `CHAT_PROVIDER=claude`.
  - `OPENAI_API_KEY` for `CHAT_PROVIDER=gpt`, `/speech`, and `/realtime/calls`.
  - A running Ollama daemon and installed model for `CHAT_PROVIDER=ollama`.
- Optional Drive worker if Drive file listing, attachment download, or generated file upload is needed.

## Install

Install Hub dependencies:

```bash
cd hub
pnpm install
```

Install Android dependencies:

```bash
cd android
pnpm install
```

## Run The Hub

From the repository root:

```bash
./run_servers.sh
```

The runner prompts for a chat provider unless `CHAT_PROVIDER` is already set. It writes logs under `.logs/<YYMMDD>/` by default and tails the Hub log until stopped.

Common examples:

```bash
./run_servers.sh --env development
CHAT_PROVIDER=codex ./run_servers.sh
CHAT_PROVIDER=gpt OPENAI_API_KEY=... ./run_servers.sh
CHAT_PROVIDER=ollama OLLAMA_MODEL=gpt-oss-20b ./run_servers.sh
./run_servers.sh --dry-run
```

Useful runner options:

| Option | Purpose |
| --- | --- |
| `--env development|production` | Sets the Hub `APP_ENV` value. |
| `--hub-port PORT` | Overrides the Hub port. Default: `5000`. |
| `--node-bin PATH` | Uses a specific Node executable. |
| `--log-dir DIR` | Changes the log root directory. |
| `--dry-run` | Prints the startup command without launching the server. |

## Android Configuration

The Android app reads its Hub URL and app environment from Expo public environment variables and Expo `extra` config.

For local development, create an Android environment file with values like:

```bash
EXPO_PUBLIC_CASE_HUB_URL=http://<hub-host>:5000
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_OPENAI_REALTIME_ENABLED=1
EXPO_PUBLIC_OPENAI_TTS_VOICE=marin
```

For production builds, use `android/.env.production.example` as the starting point.

The app variants are controlled by `APP_VARIANT`:

| Variant | Package suffix | Scheme suffix | Intended use |
| --- | --- | --- | --- |
| `development` | `.dev` | `-dev` | Development client builds. |
| `preview` | `.preview` | `-preview` | Internal preview builds. |
| `production` | none | none | Production APK builds. |

Android commands live in `android/package.json`:

```bash
cd android
pnpm start:dev
pnpm android:dev
pnpm android:prod
pnpm typecheck
```

Use a physical Android phone for app validation. The app is configured as Android-only, portrait-only, and smartphone-only.

## Hub API

Primary routes:

| Route | Purpose |
| --- | --- |
| `GET /health` | Hub health check. |
| `GET /robots.txt` | Disallows crawler indexing. |
| `POST /chat` | Loads memory, dispatches the selected provider, persists new memory, uploads generated files when configured, and returns an Android message payload. |
| `GET /command/result/:executionId` | Polls command status created from a provider response. |
| `GET /context` | Returns selected memory context for a query/conversation/project. |
| `GET /context/memories` | Lists stored memory records. |
| `POST /context/memories` | Adds string or structured memory records. |
| `DELETE /context/memories/:memoryId` | Deletes one memory record. |
| `GET /drive/files` | Proxies Drive file listing through `DRIVE_WORKER_URL`. |
| `POST /drive/files` | Proxies generated-file upload through `DRIVE_WORKER_URL`. |
| `GET /drive/files/:fileId/metadata` | Proxies Drive metadata lookup. |
| `GET /drive/files/:fileId/download` | Proxies Drive file download. |
| `POST /speech` | Synthesizes MP3 audio through OpenAI TTS. |
| `POST /realtime/calls` | Exchanges a WebRTC SDP offer for an OpenAI Realtime SDP answer. |
| `POST /auth/refresh-local` | Rotates a local/LAN token for Android clients that still publish one. |

`POST /command` is intentionally not part of the current v1 Hub surface. Commands are detected from provider output during `POST /chat`, queued in memory, and exposed through `/command/result/:executionId`.

Hub API routes no longer require a Case Hub token. `APP_ENV` still controls app/runtime labeling and Android auth behavior, but it does not enable Hub route token enforcement. Public deployments should keep edge filtering in front of the Hub for unrelated scanner paths such as `/.git*`, `/wp-*`, and `/xmlrpc.php`.

## Hub Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Fastify listen port. |
| `CHAT_PROVIDER` | `codex` | Skips provider prompt. One of `codex`, `claude`, `gpt`, `ollama`. |
| `APP_ENV` | `production` in `hub.js`, `development` in `run_servers.sh` | Runtime environment label. |
| `CODEX_PATH` | `codex` | Codex CLI executable. |
| `CODEX_MODEL` | empty | Optional Codex model argument. |
| `CODEX_PROFILE` | empty | Optional Codex profile argument. |
| `CODEX_VALIDATION_TIMEOUT` | `30` | Codex startup validation timeout in seconds. |
| `CLAUDE_PATH` | `claude` | Claude Code CLI executable. |
| `CLAUDE_VALIDATION_TIMEOUT` | `30` | Claude startup validation timeout in seconds. |
| `OPENAI_API_KEY` | empty | Required for GPT provider, TTS, and Realtime. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL. |
| `OPENAI_MODEL` | `gpt-4o` | GPT chat model. |
| `OPENAI_TIMEOUT` | `120` | OpenAI request timeout in seconds. |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | Text-to-speech model. |
| `OPENAI_TTS_VOICE` | `marin` | TTS voice. Supported values: `marin`, `cedar`. |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2` | Realtime model. |
| `OPENAI_REALTIME_VOICE` | `OPENAI_TTS_VOICE` or `marin` | Realtime voice. |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | Realtime transcription model. |
| `OPENAI_REALTIME_TRANSCRIPTION_LANGUAGE` | `ko` | Realtime transcription language. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL. |
| `OLLAMA_MODEL` | `gpt-oss-20b` | Ollama model name. |
| `MEMORY_DATA_DIR` | `hub/data` | Directory for Hub memory and auth token files. |
| `MEMORY_FILE` | `memories.json` | Memory store file name. |
| `MEMORY_MAX_MEMORIES` | `200` | Maximum stored memory records. |
| `MEMORY_MAX_CHARS` | `300` | Maximum content length per memory. |
| `MEMORY_MAX_ENTRIES` | `10` | Memory entries selected for provider context. |
| `DRIVE_WORKER_URL` | empty | Optional Drive worker URL. Required for Drive routes and generated-file upload. |
| `DRIVE_REQUEST_TIMEOUT` | `60` | Drive worker request timeout in seconds. |
| `DRIVE_TEXT_ATTACHMENT_MAX_CHARS` | `50000` | Maximum injected text from Drive text attachments. |
| `GENERATED_FILE_MAX_BYTES` | `10485760` | Maximum generated file payload size. |
| `GENERATED_FILE_MAX_COUNT` | `5` | Maximum generated files per provider response. |
| `CONTEXT_WORKER_URL` | empty | Optional legacy context worker URL. If set, Hub validates `/health` at startup and can load context through it. |
| `LOG_LEVEL` | `info` | Fastify log level. |

## Memory And Commands

Memory is stored in `hub/data/memories.json` by default. The store normalizes records, rejects low-value memories, deduplicates content, and selects relevant entries for provider prompts.

Command queue state is in memory only. If the Hub restarts, queued or completed command results are lost. Android polls every few seconds and treats missing results as `not_found` until retries are exhausted.

## Verification

Hub tests:

```bash
cd hub
pnpm test
```

Android TypeScript check:

```bash
cd android
pnpm typecheck
```

Manual Android validation should be done on a physical device. Do not rely on an Android virtual machine for this project.

## Contact

[Gmail](mailto:cdnwellhk@gmail.com)

[GitHub](https://github.com/cdnwells)
