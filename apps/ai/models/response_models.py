from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from .request_models import MisconceptionCategory, ScaffoldingLevel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PredictionResponse(CamelModel):
    correct: bool
    # The stored, authoritative label: the tile-derived ground truth echoed
    # back when wrong, or the rule-based classifier's guess when there was
    # no tile. Never the model's own guess - see ai_misconception_category.
    misconception_category: MisconceptionCategory | None = None
    # The AI's own guess, reported separately so agreement between the two
    # can be measured rather than assumed - see remediation doc 4.3.
    ai_misconception_category: MisconceptionCategory | None = None
    consequence_explanation: str
    socratic_hint: str
    xp_awarded: int
    counterfactual_trace: str = ""
    # True for a real model response, false for the rule-based fallback -
    # lets the student (and the research data) distinguish AI-generated
    # feedback from a degraded response.
    ai_generated: bool = True


class HintResponse(CamelModel):
    hint: str
    scaffolding_level: ScaffoldingLevel
    ai_generated: bool = True


class HealthResponse(BaseModel):
    status: str
    service: str
