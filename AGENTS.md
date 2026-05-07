# Instructions

- You should commit all changes in one commit and in that commit message you should separate relevant contents.
- Don't test the android with a virtual machine. I'll test it manually.
- Do not start any dev server sessions (e.g., `npx expo start`, `npm start`, etc.) without explicit permission from the user.
- Use `pnpm` as the primary package manager. Prefer `pnpm` over `npm` or `yarn` for all install/run commands.
- I want you to say all things in English.

# Architecture: Merged Hub

The Hub (Node.js/Fastify, port 5000) handles Android requests, chat provider dispatch, command result polling, and memory/context storage in one process. Legacy Python worker code and provider docs live under `hub/workers/`.

## Providers

| Provider | Purpose                              |
|----------|--------------------------------------|
| GPT      | Chat via OpenAI GPT                  |
| Memory   | File-backed context storage inside Hub |
| Codex    | Chat/command planning via Codex CLI  |
| Claude   | Chat via Claude Code CLI             |
| Ollama   | Chat via local Ollama daemon         |

## Hub Routing

- `POST /chat` → load Hub memory → selected chat provider → save Hub memory
- `POST /command` → command worker (Codex by default, fire-and-forget)
- `GET /command/result/:id` → In-memory store
- `GET /context` and `/context/memories` → Hub memory store

## Adding Provider Assets

1. Add provider docs or legacy worker code under `hub/workers/<name>/`.
2. Add provider selection/dispatch logic in `hub/hub.js`.
3. Add startup validation in `hub/providerValidation.js` when the provider has external requirements.

## Local Server Runner

- Use `./run_servers.sh` to start the merged hub.
- Set `CHAT_PROVIDER=codex|claude|gpt|ollama` to skip the provider menu.
- Memory is stored in `hub/data/memories.json` by default; override with `MEMORY_DATA_DIR`.
