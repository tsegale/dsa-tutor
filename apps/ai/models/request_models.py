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

    INDEX_ACCESS = "INDEX_ACCESS"
    INSERT_POSITION = "INSERT_POSITION"
    DELETE_SHIFT = "DELETE_SHIFT"

    POINTER_FOLLOW = "POINTER_FOLLOW"
    NULL_CHECK = "NULL_CHECK"
    INSERT_BETWEEN = "INSERT_BETWEEN"
    DELETE_RELINK = "DELETE_RELINK"
    TRAVERSE_DIRECTION = "TRAVERSE_DIRECTION"
    WRAP_CHECK = "WRAP_CHECK"

    STACK_PUSH_RESULT = "STACK_PUSH_RESULT"
    STACK_POP_RESULT = "STACK_POP_RESULT"
    OVERFLOW_CHECK = "OVERFLOW_CHECK"
    UNDERFLOW_CHECK = "UNDERFLOW_CHECK"

    QUEUE_FRONT = "QUEUE_FRONT"
    QUEUE_REAR = "QUEUE_REAR"
    CIRCULAR_WRAP = "CIRCULAR_WRAP"
    DEQUE_END = "DEQUE_END"

    HASH_BUCKET = "HASH_BUCKET"
    COLLISION_RESOLVE = "COLLISION_RESOLVE"
    PROBE_NEXT = "PROBE_NEXT"
    LOAD_FACTOR = "LOAD_FACTOR"

    JUMP_SIZE = "JUMP_SIZE"
    PROBE_POSITION = "PROBE_POSITION"
    RANGE_DOUBLE = "RANGE_DOUBLE"

    BASE_CASE = "BASE_CASE"
    RECURSIVE_CALL = "RECURSIVE_CALL"
    RETURN_VALUE = "RETURN_VALUE"

    POINTER_MOVE = "POINTER_MOVE"
    WINDOW_EXPAND = "WINDOW_EXPAND"
    WINDOW_SUM = "WINDOW_SUM"


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
