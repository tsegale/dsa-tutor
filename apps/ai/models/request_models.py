from enum import Enum
from typing import Any

from pydantic import BaseModel


class ScaffoldingLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class MisconceptionCategory(str, Enum):
    OFF_BY_ONE = "OFF_BY_ONE"
    ORDER_OF_OPERATIONS = "ORDER_OF_OPERATIONS"
    STRUCTURAL_PROPERTY_VIOLATION = "STRUCTURAL_PROPERTY_VIOLATION"
    POINTER_CONFUSION = "POINTER_CONFUSION"
    BASE_CASE_OMISSION = "BASE_CASE_OMISSION"
    COMPLEXITY_MISATTRIBUTION = "COMPLEXITY_MISATTRIBUTION"


# Mirrors JunctionDifficulty in packages/types/index.ts. Keep in sync.
class JunctionDifficulty(str, Enum):
    CONCEPTUAL = "CONCEPTUAL"
    PROCEDURAL = "PROCEDURAL"


class PredictionRequest(BaseModel):
    algorithm_name: str
    step_index: int
    current_state: Any
    student_answer: str | None = None
    error_history: list[str] = []
    scaffolding_level: ScaffoldingLevel
    session_id: str
    # Plain str, not a closed enum: packages/types/index.ts's
    # CriticalJunctionType is the source of truth and grows with every new
    # algorithm added to the platform - a mirrored Python enum here just
    # silently 422s every junction type added after the enum was last
    # updated. evaluate_answer already dispatches on plain string equality,
    # so this widening changes nothing about how requests get graded.
    junction_type: str | None = None
    junction_difficulty: JunctionDifficulty | None = None


class HintRequest(BaseModel):
    algorithm_name: str
    step_index: int
    current_prediction_prompt: str
    # Same wrapper shape as PredictionRequest.current_state
    # (dataStructureState/activeIndices/criticalJunctionType), optional
    # since older callers may not send it. Lets the hint prompt ground
    # index/value references in the actual state instead of leaving the
    # model to read them out of current_prediction_prompt's prose.
    current_state: Any = None
    # Position on the graduated hint ladder (0-indexed): 0 asks a Socratic
    # question, 1 is more direct about what to look at, and so on. None
    # for a manual H-key/avatar request, always answered at the base level.
    hint_index: int | None = None
    error_history: list[str] = []
    scaffolding_level: ScaffoldingLevel
