# Skill-First Principle

Before processing any user request, you MUST first check whether an available Claude Code skill (slash command) can handle the task. If a matching skill exists, use it instead of implementing the logic manually.

## Workflow

1. Receive the user's request.
2. Check if any skill listed above matches the request.
3. If a skill matches, invoke it first.
4. After the skill completes, continue with any remaining parts of the request.
5. If no skill matches, proceed with the request normally.
