"""Per-topic complexity facts and the Feynman rubric's complexity criteria
(Phase 8B).

One source: data/complexity.json also backs the web's Complexity tab and
its Feynman challenge prompt (apps/web/src/config/complexity.ts). The time
and space criteria are written from a topic's facts, so the grader asks for
the same drivers the Complexity tab shows.
"""

import json
from pathlib import Path

COMPLEXITY: dict[str, dict] = json.loads(
    (Path(__file__).resolve().parents[1] / "data" / "complexity.json").read_text(encoding="utf-8")
)

# Display names whose normalised form is not the topic slug's. Every
# seeded display name resolves (tests/test_registry_coverage.py).
_ALIASES = {
    "binary_search_tree": "bst",
    "breadth_first_search": "bfs",
    "depth_first_search": "dfs",
    "dijkstras_algorithm": "dijkstra",
    "radix_sort_(lsd)": "radix-sort",
    "array_insertion": "array-insert",
    "array_deletion": "array-delete",
    "hash_table_(chaining)": "hash-table-chaining",
    "hash_table_(linear_probing)": "hash-table-probing",
    "recursion:_factorial": "recursion-factorial",
    "recursion:_fibonacci": "recursion-fibonacci",
    "grid_a*": "grid-astar",
    "kruskals_algorithm": "kruskal",
    "maze_via_kruskals": "maze-kruskal",
    "maze_via_prims": "maze-prim",
    "prims_algorithm": "prim",
    "red_black_delete": "rb-delete",
    "red_black_insert": "rb-insert",
    "sliding_window_(fixed)": "sliding-window-fixed",
    "sliding_window_(variable)": "sliding-window-variable",
    "inorder_traversal": "tree-inorder",
    "level_order_traversal": "tree-level-order",
    "postorder_traversal": "tree-postorder",
    "preorder_traversal": "tree-preorder",
    "two_pointer_technique": "two-pointer",
}

TIME_LABEL = "Time complexity and what drives it"
SPACE_LABEL = "Space used, and a comparison"
CLARITY_LABEL = "Explained so a junior developer would follow"
COMPLEXITY_LABELS = (TIME_LABEL, SPACE_LABEL, CLARITY_LABEL)


def _normalize(algorithm_name: str) -> str:
    return algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


def topic_slug(algorithm_name: str) -> str:
    """The topic slug for a slug or display name ("Hash Table (Chaining)" -> "hash-table-chaining")."""
    key = _normalize(algorithm_name)
    return _ALIASES.get(key, key.replace("_", "-"))


def complexity_for(algorithm_name: str) -> dict | None:
    """The facts for a topic slug or display name, or None."""
    return COMPLEXITY.get(topic_slug(algorithm_name))


def has_complexity_facts(entry: dict | None) -> bool:
    return bool(entry and entry.get("worstCaseTrigger") and entry.get("auxiliarySpace") and entry.get("contrast"))


def complexity_criteria(algorithm_name: str) -> list[tuple[str, str]]:
    """The three complexity criteria for a topic: time (the bound and what
    drives it), space (auxiliary space against an alternative) and clarity.
    Empty when the topic's facts do not have what the criteria need."""
    entry = complexity_for(algorithm_name)
    if not has_complexity_facts(entry):
        return []
    contrast = entry["contrast"]
    return [
        (
            f"states the time complexity (worst {entry['worst']}, average {entry['average']}) and what drives it, "
            f"naming the input that produces the worst case and why the average differs or does not: "
            f"{entry['worstCaseTrigger']}",
            TIME_LABEL,
        ),
        (
            f"accounts for the auxiliary space, including recursion stack frames where they apply "
            f"({entry['auxiliarySpace']}), and contrasts it with a relevant alternative such as "
            f"{contrast['algorithm']} ({contrast['point']})",
            SPACE_LABEL,
        ),
        (
            "explains the complexity so a junior developer would follow it: each bound comes with the mechanism "
            "behind it in plain words; stating notation such as O(n log n) with no reason does not meet this",
            CLARITY_LABEL,
        ),
    ]
