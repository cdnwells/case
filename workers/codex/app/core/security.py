import re
from typing import List
from .exceptions import CommandSecurityException

DANGEROUS_PATTERNS = [
    r"\brm\s+-rf\b",
    r"\bsudo\b",
    r"\bchmod\s+777\b",
    r"\b>\s*/dev/",
    r"\bdd\s+if=",
    r"\bmkfs\b",
    r"\b:()\{.*\}",
    r"\beval\b",
    r"\bcurl.*\|\s*bash",
    r"\bwget.*\|\s*bash",
]

SYSTEM_CONTROL_PATTERNS = [
    r"\bshutdown\b",
    r"\bpoweroff\b",
    r"\breboot\b",
    r"\bhalt\b",
    r"\bsuspend\b",
    r"\bhibernate\b",
    r"\bsystemctl\s+(poweroff|reboot|halt|suspend|hibernate)",
    r"\binit\s+[06]\b",
]

BLOCKED_PATTERNS = [
    r":()\{:\|:&\};:",
    r"\brm\s+-rf\s+/\s*$",
    r"\brm\s+-rf\s+/\*",
] + SYSTEM_CONTROL_PATTERNS


def validate_command(command: str) -> dict:
    """Validate a shell command for security concerns"""

    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            raise CommandSecurityException(
                "Blocked dangerous command pattern detected"
            )

    warnings: List[str] = []
    requires_confirmation = False

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            warnings.append(f"Contains potentially dangerous pattern: {pattern}")
            requires_confirmation = True

    return {
        "valid": True,
        "requires_confirmation": requires_confirmation,
        "warnings": warnings,
    }
