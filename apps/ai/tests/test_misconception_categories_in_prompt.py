"""The prompt must offer every category the enum accepts.

Six categories were added to MisconceptionCategory in Phase 4 and never
added to the feedback prompt, so for a year the model could not name
them. resolve_ai_misconception drops anything outside the enum silently,
so this did not fail loudly - it showed up only as the AI label
collapsing onto whichever of the six it had been given, which reads as
"the model disagrees with the rule" rather than "the model was never
offered the answer".

That matters because rule-vs-AI agreement is a reported measure: half
the categories could never agree.
"""

from models.request_models import MisconceptionCategory
from prompts.templates import FEEDBACK_SYSTEM_PROMPT


def test_every_category_is_offered_to_the_model() -> None:
    missing = [c.value for c in MisconceptionCategory if c.value not in FEEDBACK_SYSTEM_PROMPT]
    assert missing == [], f"categories the model is never offered: {missing}"


def test_the_prompt_invents_no_category_the_enum_rejects() -> None:
    import re

    # The quoted ALL_CAPS tokens on the misconception_category line.
    block = FEEDBACK_SYSTEM_PROMPT.split('"misconception_category"')[1].split("\n}")[0]
    quoted = set(re.findall(r'"([A-Z][A-Z_]+)"', block))
    known = {c.value for c in MisconceptionCategory}
    assert quoted - known == set(), f"offered but not a real category: {sorted(quoted - known)}"
