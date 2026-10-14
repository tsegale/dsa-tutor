"""Writes the review sheet for the Module 4 to 6 Feynman rubrics (Phase 8C, 8.1).

Run from apps/ai:
    python scripts/export_rubric_drafts.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prompts.complexity import complexity_criteria  # noqa: E402
from prompts.feynman_rubrics_advanced import FAMILIES, LIVE_FAMILIES  # noqa: E402

OUT = Path(__file__).resolve().parents[3] / "docs" / "feynman-review" / "rubric-drafts.md"

lines = [
    "# Feynman rubrics for Modules 4 to 6",
    "",
    "Mechanics items approved in Phase 8.1 with six edits. A family is graded only once its complexity",
    "facts are written in `apps/ai/data/complexity.json` and approved; it is then marked live here and",
    "in `LIVE_FAMILIES` (`apps/ai/prompts/feynman_rubrics_advanced.py`). The three maze topics stay on the",
    "generic rubric by decision (reason recorded in that file).",
    "",
    "Each topic is graded on its mechanics items plus three complexity criteria (time and what drives",
    "it, space against an alternative, clarity), generated from its facts.",
    "",
]
for family, topics in FAMILIES.items():
    lines += [f"## {family}" + (" (live)" if family in LIVE_FAMILIES else ""), ""]
    for key, items in topics.items():
        lines += [f"### {key.replace('_', '-')}", ""]
        for criterion, label in items:
            lines.append(f"- **{label}**: {criterion}")
        complexity = complexity_criteria(key)
        if complexity:
            for criterion, label in complexity:
                lines.append(f"- **{label}** (complexity): {criterion}")
        else:
            lines.append("- Complexity facts still to write (worst-case trigger, auxiliary space, contrast).")
        lines.append("")
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {sum(len(t) for t in FAMILIES.values())} rubrics to {OUT}")
