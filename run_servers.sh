#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_ENV_ARG=""
DRY_RUN=0

LOG_DIR="${LOG_DIR:-$ROOT_DIR/.logs}"
LOG_RUN_ID="${LOG_RUN_ID:-}"
RUN_LOG_DIR=""
NODE_BIN="${NODE_BIN:-node}"
HUB_APP_ENV=""

HUB_PORT="${HUB_PORT:-5000}"

usage() {
  cat <<'USAGE'
Usage: ./run_servers.sh [options]

Starts the Case v1 hub server with in-process chat providers and memory storage.
Prompts for the hub chat provider with arrow-key selection before starting.

Environment:
  CHAT_PROVIDER=codex|claude|gpt|ollama  Skip the prompt and start with this provider
  APP_ENV=production|development          App environment; default is development for this local runner
  LOG_RUN_ID=STRING                       Override the daily folder name under --log-dir

Options:
  --env ENV                   App environment for the hub (default: APP_ENV or development)
  --hub-port PORT             Hub port (default: 5000)
  --node-bin PATH             Node executable (default: node)
  --log-dir DIR               Root directory for daily server logs (default: .logs)
  --dry-run                   Print commands without starting servers
  -h, --help                  Show this help

Examples:
  ./run_servers.sh
  ./run_servers.sh --env development
  ./run_servers.sh --env production --dry-run
USAGE
}

require_value() {
  local option="$1"
  local value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "Missing value for $option" >&2
    exit 2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      require_value "$1" "${2:-}"
      APP_ENV_ARG="$2"
      shift 2
      ;;
    --env=*)
      APP_ENV_ARG="${1#*=}"
      shift
      ;;
    --hub-port)
      require_value "$1" "${2:-}"
      HUB_PORT="$2"
      shift 2
      ;;
    --hub-port=*)
      HUB_PORT="${1#*=}"
      shift
      ;;
    --node-bin)
      require_value "$1" "${2:-}"
      NODE_BIN="$2"
      shift 2
      ;;
    --node-bin=*)
      NODE_BIN="${1#*=}"
      shift
      ;;
    --log-dir)
      require_value "$1" "${2:-}"
      LOG_DIR="$2"
      shift 2
      ;;
    --log-dir=*)
      LOG_DIR="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -n "$APP_ENV_ARG" ]]; then
  APP_ENV="$APP_ENV_ARG"
fi

is_development_app_env() {
  local app_env="${1,,}"
  app_env="${app_env//[[:space:]]/}"
  case "$app_env" in
    development|dev|local)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

hub_development_notice() {
  printf 'Hub development mode enabled: local/LAN token checks are bypassed.\n'
}

pids=()
names=()
log_files=()
tail_pids=()

prepare_log_dir() {
  if [[ "$LOG_DIR" != /* ]]; then
    LOG_DIR="$ROOT_DIR/$LOG_DIR"
  fi

  if [[ -z "$LOG_RUN_ID" ]]; then
    LOG_RUN_ID="$(date +'%y%m%d')"
  fi

  RUN_LOG_DIR="$LOG_DIR/$LOG_RUN_ID"
}

validate_chat_provider() {
  case "$1" in
    codex|claude|gpt|ollama)
      return 0
      ;;
    *)
      echo "CHAT_PROVIDER must be one of: codex, claude, gpt, ollama" >&2
      return 1
      ;;
  esac
}

select_hub_provider() {
  if [[ -n "${CHAT_PROVIDER:-}" ]]; then
    validate_chat_provider "$CHAT_PROVIDER" || return
    printf '%s\n' "$CHAT_PROVIDER"
    return
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '%s\n' "codex"
    return
  fi

  (
    cd "$ROOT_DIR/hub"
    APP_ENV="$HUB_APP_ENV" "$NODE_BIN" --input-type=module --eval '
import { selectStartupChatProvider } from "./providerMenu.js"

try {
  const provider = await selectStartupChatProvider({
    input: process.stdin,
    output: process.stderr,
    appEnv: process.env.APP_ENV,
  })
  process.stdout.write(provider)
} catch (err) {
  if (err?.code === "PROVIDER_SELECTION_CANCELLED") {
    process.exit(130)
  }
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
'
  )
}

start_process() {
  local name="$1"
  local dir="$2"
  shift 2
  local log_file="$RUN_LOG_DIR/$name.log"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    if [[ "$name" == "hub" ]] && is_development_app_env "$HUB_APP_ENV"; then
      printf '[dry-run] '
      hub_development_notice
    fi
    printf '[dry-run] (%s) cd %s &&' "$name" "$dir"
    printf ' %q' "$@"
    printf '\n'
    return
  fi

  mkdir -p "$RUN_LOG_DIR"
  (
    cd "$dir"
    if [[ "$name" == "hub" ]] && is_development_app_env "$HUB_APP_ENV"; then
      printf '[%s] ' "$(date -Is)"
      hub_development_notice
    fi
    printf '[%s] starting %s\n' "$(date -Is)" "$name"
    exec "$@"
  ) >>"$log_file" 2>&1 &

  local pid="$!"
  pids+=("$pid")
  names+=("$name")
  log_files+=("$log_file")
  echo "$name started on pid $pid (log: $log_file)"
}

start_log_tail() {
  local log_file="$1"
  tail -n +1 -F "$log_file" &
  tail_pids+=("$!")
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ "${#tail_pids[@]}" -gt 0 ]]; then
    kill "${tail_pids[@]}" 2>/dev/null || true
    wait "${tail_pids[@]}" 2>/dev/null || true
  fi

  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "Stopping servers..."
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi

  exit "$status"
}

trap cleanup EXIT INT TERM

prepare_log_dir

HUB_APP_ENV="${APP_ENV:-development}"
SELECTED_CHAT_PROVIDER="$(select_hub_provider)"
if [[ "$DRY_RUN" -ne 1 ]]; then
  echo "Log folder: $RUN_LOG_DIR"
fi
start_process "hub" "$ROOT_DIR/hub" env \
  PORT="$HUB_PORT" \
  CHAT_PROVIDER="$SELECTED_CHAT_PROVIDER" \
  APP_ENV="$HUB_APP_ENV" \
  "$NODE_BIN" hub.js

if [[ "$DRY_RUN" -eq 1 ]]; then
  exit 0
fi

if [[ "${#pids[@]}" -eq 0 ]]; then
  echo "No services selected."
  exit 0
fi

echo "Servers are running. Tailing logs; press Ctrl+C to stop."
for log_file in "${log_files[@]}"; do
  start_log_tail "$log_file"
done
wait -n "${pids[@]}"
echo "A server exited; stopping the remaining servers."
