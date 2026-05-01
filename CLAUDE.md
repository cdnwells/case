# Instructions

- You should commit all changes in one commit and in that commit message you should separate relevant contents.
- Don't test the android with a virtual machine. I'll test it manually.
- Do not start any dev server sessions (e.g., `npx expo start`, `npm start`, etc.) without explicit permission from the user.
- Use `pnpm` as the primary package manager. Prefer `pnpm` over `npm` or `yarn` for all install/run commands.
- I want you to say all things in English.

# Architecture: Hub-and-Spoke

The system uses a hub-and-spoke architecture where the Hub (Node.js/Fastify, port 5000) acts as a central reverse proxy routing requests to specialized workers.

## Workers (Spokes)

| Worker  | Port | Technology     | Purpose                              |
|---------|------|----------------|--------------------------------------|
| GPT     | 8000 | Python/FastAPI | Chat via OpenAI GPT                  |
| Context | 8001 | Python/FastAPI | Memory/context file storage           |
| Codex   | 8004 | Python/FastAPI | Command execution via Codex CLI       |
| Claude  | 8003 | Python/FastAPI | Legacy command execution via Claude Code CLI|

## Hub Routing

- `POST /chat` → Context Worker (load) → GPT Worker → Context Worker (save)
- `POST /command` → command worker (Codex by default, fire-and-forget)
- `GET /command/result/:id` → In-memory store
- `/context/*` → Context Worker
- Everything else → GPT Worker (default)

## Adding a New Worker

1. Create `workers/<name>/` following the standard structure (see any existing worker)
2. Add `<NAME>_WORKER_URL` to `hub/.env`
3. Add routing logic to `hub/hub.js` in `selectWorkerUrl()` and/or a dedicated route
4. Worker must have `GET /health` endpoint

## Local Server Runner

- Use `./run_servers.sh` to start the hub and worker servers together.
- The runner defaults to Codex for `/command` by setting `COMMAND_WORKER_URL`.
- Use `./run_servers.sh --executor claude --workers core` only when intentionally testing the legacy Claude command worker.
