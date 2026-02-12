# Skill-First Principle

Before processing any user request, you MUST first check whether an available Claude Code skill (slash command) can handle the task. If a matching skill exists, use it instead of implementing the logic manually.

## Available Skills

### /commit-diff
Analyzes current changes via git diff and commits them using Conventional Commits in Korean.
Use when: The user asks to commit, save changes, or make a git commit.

### /make-plan
Creates a plan markdown file under `<root>/specs/` folder with proper numbering.
Use when: The user asks to plan, design, or spec out a feature or task.

### /keybindings-help
Customizes keyboard shortcuts, rebinds keys, adds chord bindings, or modifies keybindings.
Use when: The user asks about keyboard shortcuts or key bindings.

## Workflow

1. Receive the user's request.
2. Check if any skill listed above matches the request.
3. If a skill matches, invoke it first.
4. After the skill completes, continue with any remaining parts of the request.
5. If no skill matches, proceed with the request normally.
