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
    if name == "merge_sort":
        from prompts.merge_sort import MERGE_SORT_CONTEXT, MERGE_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return MERGE_SORT_CONTEXT, MERGE_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "quick_sort":
        from prompts.quick_sort import QUICK_SORT_CONTEXT, QUICK_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return QUICK_SORT_CONTEXT, QUICK_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "bst" or name == "binary_search_tree":
        from prompts.bst import BST_CONTEXT, BST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BST_CONTEXT, BST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "bfs" or name == "breadth_first_search":
        from prompts.bfs import BFS_CONTEXT, BFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BFS_CONTEXT, BFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in ("array_access", "array_insert", "array_insertion", "array_delete", "array_deletion"):
        from prompts.array_operations import (
            ARRAY_OPERATIONS_CONTEXT,
            ARRAY_OPERATIONS_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return ARRAY_OPERATIONS_CONTEXT, ARRAY_OPERATIONS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in (
        "singly_linked_list",
        "doubly_linked_list",
        "circular_linked_list",
    ):
        from prompts.linked_list import LINKED_LIST_CONTEXT, LINKED_LIST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return LINKED_LIST_CONTEXT, LINKED_LIST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in ("stack", "queue", "circular_queue", "deque"):
        from prompts.stack_queue import STACK_QUEUE_CONTEXT, STACK_QUEUE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return STACK_QUEUE_CONTEXT, STACK_QUEUE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in (
        "hash_table_chaining",
        "hash_table_(chaining)",
        "hash_table_probing",
        "hash_table_(linear_probing)",
        "hash_table_linear_probing",
    ):
        from prompts.hash_table import HASH_TABLE_CONTEXT, HASH_TABLE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return HASH_TABLE_CONTEXT, HASH_TABLE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in ("jump_search", "interpolation_search", "exponential_search"):
        from prompts.search_advanced import (
            SEARCH_ADVANCED_CONTEXT,
            SEARCH_ADVANCED_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return SEARCH_ADVANCED_CONTEXT, SEARCH_ADVANCED_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in (
        "recursion_factorial",
        "recursion:_factorial",
        "recursion_fibonacci",
        "recursion:_fibonacci",
    ):
        from prompts.recursion import RECURSION_CONTEXT, RECURSION_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return RECURSION_CONTEXT, RECURSION_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    if name in (
        "two_pointer",
        "two_pointer_technique",
        "sliding_window_fixed",
        "sliding_window_(fixed)",
        "sliding_window_variable",
        "sliding_window_(variable)",
    ):
        from prompts.two_pointer_window import (
            TWO_POINTER_WINDOW_CONTEXT,
            TWO_POINTER_WINDOW_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return TWO_POINTER_WINDOW_CONTEXT, TWO_POINTER_WINDOW_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

    return "Generic algorithm context.", "No pseudocode available.", {}
