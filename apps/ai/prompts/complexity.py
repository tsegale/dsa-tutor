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

# Display names whose normalised form is not the topic slug's.
_ALIASES = {
    "binary_search_tree": "bst",
    "breadth_first_search": "bfs",
    "depth_first_search": "dfs",
    "dijkstras_algorithm": "dijkstra",
    "radix_sort_(lsd)": "radix-sort",
}

TIME_LABEL = "Time complexity and what drives it"
SPACE_LABEL = "Space used, and a comparison"
CLARITY_LABEL = "Explained so a junior developer would follow"
COMPLEXITY_LABELS = (TIME_LABEL, SPACE_LABEL, CLARITY_LABEL)


def _normalize(algorithm_name: str) -> str:
    return algorithm_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


def complexity_for(algorithm_name: str) -> dict | None:
    """The facts for a topic slug or display name, or None."""
    key = _normalize(algorithm_name)
    slug = _ALIASES.get(key, key.replace("_", "-"))
    return COMPLEXITY.get(slug)


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
