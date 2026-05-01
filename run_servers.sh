#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EXECUTOR="codex"
WORKERS_ARG=""
ONLY_ARG=""
EXCLUDE_ARG=""
START_HUB=1
DRY_RUN=0

HOST="${HOST:-0.0.0.0}"
DEBUG="${DEBUG:-false}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.logs}"
NODE_BIN="${NODE_BIN:-node}"

if [[ -z "${PYTHON_BIN:-}" ]]; then
  if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
  else
    PYTHON_BIN="python3"
  fi
fi

HUB_PORT="${HUB_PORT:-5000}"
GPT_PORT="${GPT_PORT:-8000}"
CONTEXT_PORT="${CONTEXT_PORT:-8001}"
OLLAMA_PORT="${OLLAMA_PORT:-8002}"
CLAUDE_PORT="${CLAUDE_PORT:-8003}"
CODEX_PORT="${CODEX_PORT:-8004}"
SSH_PORT="${SSH_PORT:-8005}"

usage() {
  cat <<'USAGE'
Usage: ./run_servers.sh [options]

Starts the Case hub plus worker servers. By default, /command routes to Codex.

Options:
  --executor codex|claude     Command executor used by the hub (default: codex)
  --workers LIST              Workers to start: all, core, command, gpt,context,codex,ollama,ssh,claude
  --only LIST                 Exact services to start. Include hub if needed, e.g. hub,gpt,codex
  --exclude LIST              Services/workers to skip from the selected set
  --no-hub                    Start workers only
  --hub-only                  Start the hub only
  --host HOST                 Worker bind host (default: 0.0.0.0)
  --hub-port PORT             Hub port (default: 5000)
  --gpt-port PORT             GPT worker port (default: 8000)
  --context-port PORT         Context worker port (default: 8001)
  --ollama-port PORT          Ollama worker port (default: 8002)
  --claude-port PORT          Claude worker port (default: 8003)
  --codex-port PORT           Codex worker port (default: 8004)
  --ssh-port PORT             SSH worker port (default: 8005)
  --python-bin PATH           Python executable (default: .venv/bin/python if present, else python3)
  --node-bin PATH             Node executable (default: node)
  --log-dir DIR               Directory for server logs (default: .logs)
  --dry-run                   Print commands without starting servers
  -h, --help                  Show this help

Examples:
  ./run_servers.sh
  ./run_servers.sh --workers core
  ./run_servers.sh --only hub,gpt,codex
  ./run_servers.sh --executor claude --workers core
  ./run_servers.sh --exclude ssh,ollama --codex-port 8014
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
    --executor)
      require_value "$1" "${2:-}"
      EXECUTOR="$2"
      shift 2
      ;;
    --executor=*)
      EXECUTOR="${1#*=}"
      shift
      ;;
    --workers)
      require_value "$1" "${2:-}"
      WORKERS_ARG="$2"
      shift 2
      ;;
    --workers=*)
      WORKERS_ARG="${1#*=}"
      shift
      ;;
    --only)
      require_value "$1" "${2:-}"
      ONLY_ARG="$2"
      shift 2
      ;;
    --only=*)
      ONLY_ARG="${1#*=}"
      shift
      ;;
    --exclude)
      require_value "$1" "${2:-}"
      EXCLUDE_ARG="$2"
      shift 2
      ;;
    --exclude=*)
      EXCLUDE_ARG="${1#*=}"
      shift
      ;;
    --no-hub)
      START_HUB=0
      shift
      ;;
    --hub-only)
      START_HUB=1
      WORKERS_ARG="none"
      shift
      ;;
    --host)
      require_value "$1" "${2:-}"
      HOST="$2"
      shift 2
      ;;
    --host=*)
      HOST="${1#*=}"
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
    --gpt-port)
      require_value "$1" "${2:-}"
      GPT_PORT="$2"
      shift 2
      ;;
    --gpt-port=*)
      GPT_PORT="${1#*=}"
      shift
      ;;
    --context-port)
      require_value "$1" "${2:-}"
      CONTEXT_PORT="$2"
      shift 2
      ;;
    --context-port=*)
      CONTEXT_PORT="${1#*=}"
      shift
      ;;
    --ollama-port)
      require_value "$1" "${2:-}"
      OLLAMA_PORT="$2"
      shift 2
      ;;
    --ollama-port=*)
      OLLAMA_PORT="${1#*=}"
      shift
      ;;
    --claude-port)
      require_value "$1" "${2:-}"
      CLAUDE_PORT="$2"
      shift 2
      ;;
    --claude-port=*)
      CLAUDE_PORT="${1#*=}"
      shift
      ;;
    --codex-port)
      require_value "$1" "${2:-}"
      CODEX_PORT="$2"
      shift 2
      ;;
    --codex-port=*)
      CODEX_PORT="${1#*=}"
      shift
      ;;
    --ssh-port)
      require_value "$1" "${2:-}"
      SSH_PORT="$2"
      shift 2
      ;;
    --ssh-port=*)
      SSH_PORT="${1#*=}"
      shift
      ;;
    --python-bin)
      require_value "$1" "${2:-}"
      PYTHON_BIN="$2"
      shift 2
      ;;
    --python-bin=*)
      PYTHON_BIN="${1#*=}"
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

if [[ "$EXECUTOR" != "codex" && "$EXECUTOR" != "claude" ]]; then
  echo "--executor must be codex or claude" >&2
  exit 2
fi

split_csv() {
  local input="$1"
  local -n output_ref="$2"
  local item
  output_ref=()

  input="${input// /}"
  [[ -z "$input" ]] && return

  IFS=',' read -ra raw_items <<< "$input"
  for item in "${raw_items[@]}"; do
    [[ -n "$item" ]] && output_ref+=("$item")
  done
}

default_workers() {
  if [[ "$EXECUTOR" == "claude" ]]; then
    echo "gpt context claude ollama ssh"
  else
    echo "gpt context codex ollama ssh"
  fi
}

expand_workers() {
  local input="$1"
  local -n output_ref="$2"
  local items=()
  local item
  output_ref=()

  if [[ -z "$input" ]]; then
    read -ra output_ref <<< "$(default_workers)"
    return
  fi

  split_csv "$input" items
  for item in "${items[@]}"; do
    case "$item" in
      all)
        read -ra output_ref <<< "$(default_workers)"
        ;;
      core)
        output_ref+=("gpt" "context" "$EXECUTOR")
        ;;
      command)
        output_ref+=("$EXECUTOR")
        ;;
      none)
        ;;
      hub)
        START_HUB=1
        ;;
      gpt|context|codex|claude|ollama|ssh)
        output_ref+=("$item")
        ;;
      *)
        echo "Unknown worker: $item" >&2
        exit 2
        ;;
    esac
  done
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

unique_workers() {
  local -n input_ref="$1"
  local -n output_ref="$2"
  local item
  output_ref=()
  for item in "${input_ref[@]}"; do
    contains "$item" "${output_ref[@]}" || output_ref+=("$item")
  done
}

filter_excludes() {
  local -n input_ref="$1"
  local -n output_ref="$2"
  local excludes=()
  local item
  split_csv "$EXCLUDE_ARG" excludes
  output_ref=()

  for item in "${input_ref[@]}"; do
    contains "$item" "${excludes[@]}" || output_ref+=("$item")
  done

  if contains "hub" "${excludes[@]}"; then
    START_HUB=0
  fi
}

workers=()
if [[ -n "$ONLY_ARG" ]]; then
  START_HUB=0
  only_items=()
  split_csv "$ONLY_ARG" only_items
  for item in "${only_items[@]}"; do
    case "$item" in
      hub)
        START_HUB=1
        ;;
      gpt|context|codex|claude|ollama|ssh)
        workers+=("$item")
        ;;
      command)
        workers+=("$EXECUTOR")
        ;;
      all|core|none)
        expanded=()
        expand_workers "$item" expanded
        workers+=("${expanded[@]}")
        ;;
      *)
        echo "Unknown service: $item" >&2
        exit 2
        ;;
    esac
  done
else
  expand_workers "$WORKERS_ARG" workers
fi

unique=()
unique_workers workers unique
filtered=()
filter_excludes unique filtered
workers=("${filtered[@]}")

COMMAND_WORKER_PORT="$CODEX_PORT"
if [[ "$EXECUTOR" == "claude" ]]; then
  COMMAND_WORKER_PORT="$CLAUDE_PORT"
fi
COMMAND_WORKER_URL="http://localhost:$COMMAND_WORKER_PORT"

if [[ "$START_HUB" -eq 1 && ! " ${workers[*]} " =~ " ${EXECUTOR} " ]]; then
  echo "Warning: hub /command routes to $EXECUTOR, but the $EXECUTOR worker is not selected." >&2
fi

pids=()
names=()

start_process() {
  local name="$1"
  local dir="$2"
  shift 2
  local log_file="$LOG_DIR/$name.log"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] (%s) cd %s &&' "$name" "$dir"
    printf ' %q' "$@"
    printf '\n'
    return
  fi

  mkdir -p "$LOG_DIR"
  (
    cd "$dir"
    printf '[%s] starting %s\n' "$(date -Is)" "$name"
    exec "$@"
  ) >"$log_file" 2>&1 &

  local pid="$!"
  pids+=("$pid")
  names+=("$name")
  echo "$name started on pid $pid (log: $log_file)"
}

start_worker() {
  local worker="$1"
  case "$worker" in
    gpt)
      start_process "gpt" "$ROOT_DIR/workers/gpt" env HOST="$HOST" PORT="$GPT_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    context)
      start_process "context" "$ROOT_DIR/workers/context" env HOST="$HOST" PORT="$CONTEXT_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    codex)
      start_process "codex" "$ROOT_DIR/workers/codex" env HOST="$HOST" PORT="$CODEX_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    ollama)
      start_process "ollama" "$ROOT_DIR/workers/ollama" env HOST="$HOST" PORT="$OLLAMA_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    ssh)
      start_process "ssh" "$ROOT_DIR/workers/ssh" env HOST="$HOST" PORT="$SSH_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    claude)
      start_process "claude" "$ROOT_DIR/workers/claude" env HOST="$HOST" PORT="$CLAUDE_PORT" DEBUG="$DEBUG" "$PYTHON_BIN" main.py
      ;;
    *)
      echo "Unknown worker: $worker" >&2
      exit 2
      ;;
  esac
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "Stopping servers..."
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi

  exit "$status"
}

trap cleanup EXIT INT TERM

for worker in "${workers[@]}"; do
  start_worker "$worker"
done

if [[ "$START_HUB" -eq 1 ]]; then
  start_process "hub" "$ROOT_DIR/hub" env \
    PORT="$HUB_PORT" \
    PYTHON_WORKER_URL="http://localhost:$GPT_PORT" \
    CONTEXT_WORKER_URL="http://localhost:$CONTEXT_PORT" \
    CODEX_WORKER_URL="http://localhost:$CODEX_PORT" \
    CLAUDE_WORKER_URL="http://localhost:$CLAUDE_PORT" \
    COMMAND_WORKER_URL="$COMMAND_WORKER_URL" \
    COMMAND_WORKER_NAME="$EXECUTOR" \
    "$NODE_BIN" hub.js
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  exit 0
fi

if [[ "${#pids[@]}" -eq 0 ]]; then
  echo "No services selected."
  exit 0
fi

echo "Servers are running. Press Ctrl+C to stop."
wait -n "${pids[@]}"
echo "A server exited; stopping the remaining servers."
