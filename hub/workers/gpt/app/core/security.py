import re
from typing import List
from .exceptions import CommandSecurityException

# Dangerous patterns that require extra confirmation
DANGEROUS_PATTERNS = [
    r"\brm\s+-rf\b",  # rm -rf
    r"\bsudo\b",  # sudo
    r"\bchmod\s+777\b",  # chmod 777
    r"\b>\s*/dev/",  # redirect to devices
    r"\bdd\s+if=",  # dd command
    r"\bmkfs\b",  # format filesystem
    r"\b:()\{.*\}",  # fork bomb
    r"\beval\b",  # eval
    r"\bcurl.*\|\s*bash",  # curl pipe to bash
    r"\bwget.*\|\s*bash",  # wget pipe to bash
]

BLOCKED_PATTERNS = [
    r":()\{:\|:&\};:",  # Classic fork bomb
    r"\brm\s+-rf\s+/\s*$",  # rm -rf /
    r"\brm\s+-rf\s+/\*",  # rm -rf /*
]


def validate_command(command: str) -> dict:
    """Validate a shell command for security concerns"""

    # Check for blocked patterns (never allow)
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            raise CommandSecurityException(
                "Blocked dangerous command pattern detected"
            )

    # Check for dangerous patterns (require explicit confirmation)
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
