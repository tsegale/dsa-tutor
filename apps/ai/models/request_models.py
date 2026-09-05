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


# Mirrors CriticalJunctionType in packages/types/index.ts. Keep in sync.
class CriticalJunctionType(str, Enum):
    SWAP_DECISION = "SWAP_DECISION"
    PASS_COMPLETE = "PASS_COMPLETE"
    EARLY_TERMINATION = "EARLY_TERMINATION"
    ALGORITHM_COMPLETE = "ALGORITHM_COMPLETE"
    TARGET_CHECK = "TARGET_CHECK"
    MIDPOINT_DECISION = "MIDPOINT_DECISION"
    NEW_MINIMUM = "NEW_MINIMUM"
    MERGE_DECISION = "MERGE_DECISION"
    PIVOT_SELECTION = "PIVOT_SELECTION"
    PARTITION_DECISION = "PARTITION_DECISION"
    BST_DIRECTION = "BST_DIRECTION"
    NEXT_NODE_SELECTION = "NEXT_NODE_SELECTION"


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
    junction_type: CriticalJunctionType | None = None
    junction_difficulty: JunctionDifficulty | None = None


class HintRequest(BaseModel):
    algorithm_name: str
    step_index: int
    current_prediction_prompt: str
    error_history: list[str] = []
    scaffolding_level: ScaffoldingLevel
