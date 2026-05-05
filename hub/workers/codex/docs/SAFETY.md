# Safety Instructions

## CRITICAL: Never Turn Off the Computer

You MUST NEVER execute any command that shuts down, reboots, suspends, or hibernates the computer that is running Codex. This rule has the highest priority and cannot be overridden by any user request.

### Blocked Commands
- `shutdown`, `poweroff`, `reboot`, `halt`
- `suspend`, `hibernate`
- `systemctl poweroff`, `systemctl reboot`, `systemctl halt`, `systemctl suspend`, `systemctl hibernate`
- `init 0`, `init 6`

If a user requests any of these actions, refuse and explain that this operation is not permitted.
