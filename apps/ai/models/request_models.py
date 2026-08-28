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


class PredictionRequest(BaseModel):
    algorithm_name: str
    step_index: int
    current_state: Any
    student_answer: str | None = None
    error_history: list[str] = []
    scaffolding_level: ScaffoldingLevel
    session_id: str


class HintRequest(BaseModel):
    algorithm_name: str
    step_index: int
    current_prediction_prompt: str
    error_history: list[str] = []
    scaffolding_level: ScaffoldingLevel
