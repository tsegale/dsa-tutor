def get_algorithm_context(algorithm_name: str) -> tuple[str, str, dict[str, str]]:
    """Returns (context, pseudocode, critical_junction_guidance) for the
    given algorithm name/display-name. Falls back to a generic context
    for anything not yet implemented."""
    name = algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")

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
    if name == "shell_sort":
        from prompts.shell_sort import SHELL_SORT_CONTEXT, SHELL_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return SHELL_SORT_CONTEXT, SHELL_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "heap_sort":
        from prompts.heap_sort import HEAP_SORT_CONTEXT, HEAP_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return HEAP_SORT_CONTEXT, HEAP_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "counting_sort":
        from prompts.counting_sort import COUNTING_SORT_CONTEXT, COUNTING_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return COUNTING_SORT_CONTEXT, COUNTING_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("radix_sort", "radix_sort_(lsd)"):
        from prompts.radix_sort import RADIX_SORT_CONTEXT, RADIX_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return RADIX_SORT_CONTEXT, RADIX_SORT_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("bst", "binary_search_tree", "bst_search", "bst_delete"):
        from prompts.bst import BST_CONTEXT, BST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BST_CONTEXT, BST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in (
        "inorder_traversal",
        "preorder_traversal",
        "postorder_traversal",
        "level_order_traversal",
        "tree_inorder",
        "tree_preorder",
        "tree_postorder",
        "tree_level_order",
    ):
        from prompts.tree_traversal import (
            TREE_TRAVERSAL_CONTEXT,
            TREE_TRAVERSAL_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return TREE_TRAVERSAL_CONTEXT, TREE_TRAVERSAL_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("avl_insert", "avl_delete", "avl_tree"):
        from prompts.avl_tree import AVL_TREE_CONTEXT, AVL_TREE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return AVL_TREE_CONTEXT, AVL_TREE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("rb_insert", "rb_delete", "red_black_insert", "red_black_delete"):
        from prompts.red_black_tree import (
            RED_BLACK_TREE_CONTEXT,
            RED_BLACK_TREE_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return RED_BLACK_TREE_CONTEXT, RED_BLACK_TREE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("max_heap_insert", "max_heap_delete", "min_heap_insert", "min_heap_delete"):
        from prompts.heap import HEAP_CONTEXT, HEAP_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return HEAP_CONTEXT, HEAP_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("trie_insert", "trie_search", "trie_delete"):
        from prompts.trie import TRIE_CONTEXT, TRIE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return TRIE_CONTEXT, TRIE_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "bfs" or name == "breadth_first_search":
        from prompts.bfs import BFS_CONTEXT, BFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return BFS_CONTEXT, BFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "dfs" or name == "depth_first_search":
        from prompts.dfs import DFS_CONTEXT, DFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return DFS_CONTEXT, DFS_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("dijkstra", "dijkstras_algorithm"):
        from prompts.dijkstra import DIJKSTRA_CONTEXT, DIJKSTRA_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return DIJKSTRA_CONTEXT, DIJKSTRA_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "bellman_ford":
        from prompts.bellman_ford import (
            BELLMAN_FORD_CONTEXT,
            BELLMAN_FORD_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return BELLMAN_FORD_CONTEXT, BELLMAN_FORD_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name == "floyd_warshall":
        from prompts.floyd_warshall import (
            FLOYD_WARSHALL_CONTEXT,
            FLOYD_WARSHALL_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return FLOYD_WARSHALL_CONTEXT, FLOYD_WARSHALL_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("kruskal", "kruskals_algorithm", "prim", "prims_algorithm", "kruskals", "prims"):
        from prompts.mst import MST_CONTEXT, MST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

        return MST_CONTEXT, MST_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("cycle_detection", "connected_components", "topological_sort"):
        from prompts.graph_properties import (
            GRAPH_PROPERTIES_CONTEXT,
            GRAPH_PROPERTIES_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return GRAPH_PROPERTIES_CONTEXT, GRAPH_PROPERTIES_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("grid_bfs", "grid_dfs", "grid_dijkstra", "grid_astar", "grid_a*"):
        from prompts.grid_pathfinding import (
            GRID_PATHFINDING_CONTEXT,
            GRID_PATHFINDING_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return GRID_PATHFINDING_CONTEXT, GRID_PATHFINDING_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE
    if name in ("maze_generation", "maze_prim", "maze_kruskal", "maze_via_prims", "maze_via_kruskals"):
        from prompts.maze_generation import (
            MAZE_GENERATION_CONTEXT,
            MAZE_GENERATION_PSEUDOCODE,
            CRITICAL_JUNCTION_GUIDANCE,
        )

        return MAZE_GENERATION_CONTEXT, MAZE_GENERATION_PSEUDOCODE, CRITICAL_JUNCTION_GUIDANCE

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
        # Legacy topic superseded by the three above, but still unlocked
        # and reachable for a session created before that split - see
        # apps/api/prisma/seed.ts.
        "linked_list",
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
