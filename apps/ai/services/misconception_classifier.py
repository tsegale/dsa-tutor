from typing import Any

from models.request_models import MisconceptionCategory


def classify_bubble_sort_misconception(
    student_answer: str | None,
    current_state: Any,
    ai_category: str | None,
) -> MisconceptionCategory | None:
    if ai_category is not None:
        try:
            return MisconceptionCategory(ai_category)
        except ValueError:
            pass

    if student_answer is None or not isinstance(current_state, dict):
        return None

    active_indices = current_state.get("activeIndices") or []
    data = current_state.get("dataStructureState")

    if len(active_indices) != 2 or not isinstance(data, list):
        return None

    left_index, right_index = active_indices[0], active_indices[1]
    if left_index >= len(data) or right_index >= len(data):
        return MisconceptionCategory.OFF_BY_ONE

    left_value, right_value = data[left_index], data[right_index]
    should_swap = left_value > right_value

    normalized = student_answer.strip().lower()
    said_swap = normalized in ("swap", "swap them", "true", str(left_index))
    said_no_swap = normalized in ("no-swap", "no swap needed", "false", str(right_index))

    if should_swap and said_no_swap:
        return MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION
    if not should_swap and said_swap:
        return MisconceptionCategory.ORDER_OF_OPERATIONS

    return None
