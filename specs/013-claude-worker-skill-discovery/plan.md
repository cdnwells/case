# Plan: Claude Worker Skill-First Principle and Safety Instructions

## Context

The Claude worker should instruct Claude Code to check available skills first before processing requests, and must never execute commands that shut down the computer. These instructions are managed as `.md` files in `workers/claude/docs/` and automatically loaded into the system prompt.

## Implementation

### 1. Documentation-driven system prompt (`workers/claude/docs/`)

- **SKILLS.md**: Defines the "skill-first" principle - Claude Code must check if a built-in skill (e.g. `/commit-diff`, `/make-plan`, `/keybindings-help`) matches the request before doing it manually.
- **SAFETY.md**: Critical rule that Claude Code must never shutdown/reboot/suspend/hibernate the computer.

### 2. System prompt loading (`workers/claude/app/services/claude_service.py`)

- Added `load_worker_docs()` to read all `.md` files from `workers/claude/docs/` (sorted alphabetically).
- The loaded docs are appended to the persona in the system prompt sent to Claude CLI.
- New docs can be added by simply placing `.md` files in the docs folder - no code changes needed.

### 3. Code-level safety (`workers/claude/app/core/security.py`)

- Added `SYSTEM_CONTROL_PATTERNS` (shutdown, poweroff, reboot, halt, suspend, hibernate, init 0/6) to `BLOCKED_PATTERNS`.
- This provides a hard block at the code level even if the prompt-level instruction is bypassed.

## Files Changed

- `workers/claude/docs/SKILLS.md` (new)
- `workers/claude/docs/SAFETY.md` (new)
- `workers/claude/app/services/claude_service.py` (modified)
- `workers/claude/app/core/security.py` (modified)
