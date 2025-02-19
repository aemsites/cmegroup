from enum import Enum
from dataclasses import dataclass

class Severity(Enum):
    CRITICAL = "🔴"  # Critical bugs, security issues
    HIGH = "🟠"      # Major code quality, performance issues
    MEDIUM = "🟡"    # Best practices violations
    LOW = "🔵"       # Minor improvements

@dataclass
class LineComment:
    line: int
    text: str
    severity: Severity = Severity.MEDIUM  # Default severity