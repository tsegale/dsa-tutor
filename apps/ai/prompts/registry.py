def get_algorithm_context(algorithm_name: str) -> tuple[str, str, dict[str, str]]:
    """Returns (context, pseudocode, critical_junction_guidance) for the
    given algorithm name/display-name. Falls back to a generic context
    for anything not yet implemented."""
    name = algorithm_name.lower().replace(" ", "_").replace("-", "_")

    if name == "bubble_sort":
        from prompts.bubble_sort import BUBBLE_SORT_CONTEXT, BUBBLE_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BUBBLE_SORT_CONTEXT, BUBBLE_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "linear_search":
        from prompts.linear_search import LINEAR_SEARCH_CONTEXT, LINEAR_SEARCH_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return LINEAR_SEARCH_CONTEXT, LINEAR_SEARCH_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "binary_search":
        from prompts.binary_search import BINARY_SEARCH_CONTEXT, BINARY_SEARCH_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BINARY_SEARCH_CONTEXT, BINARY_SEARCH_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "selection_sort":
        from prompts.selection_sort import (
            SELECTION_SORT_CONTEXT,
            SELECTION_SORT_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return SELECTION_SORT_CONTEXT, SELECTION_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "insertion_sort":
        from prompts.insertion_sort import (
            INSERTION_SORT_CONTEXT,
            INSERTION_SORT_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return INSERTION_SORT_CONTEXT, INSERTION_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    return "Generic algorithm context.", "No pseudocode available.", {}
