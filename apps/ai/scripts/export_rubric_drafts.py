"""Writes the review sheet for the draft Feynman rubrics (Phase 8C).

Run from apps/ai:
    python scripts/export_rubric_drafts.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prompts.complexity import complexity_criteria  # noqa: E402
from prompts.feynman_rubric_drafts import DRAFT_FAMILIES  # noqa: E402

OUT = Path(__file__).resolve().parents[3] / "docs" / "feynman-review" / "rubric-drafts.md"

lines = [
    "# Draft Feynman rubrics for review",
    "",
    "Modules 4 to 6, drafted by family (Phase 8C). None of these is used for grading until it is approved:",
    "approving one moves it into `apps/ai/prompts/feynman_rubrics.py`, adds its complexity facts to",
    "`apps/ai/data/complexity.json`, and lists its display name in `apps/web/src/utils/feynmanRubrics.ts`.",
    "",
    "Each topic is graded on the mechanics items below plus three complexity criteria (time and what",
    "drives it, space against an alternative, clarity). Where the topic already has complexity facts,",
    "the generated criteria are shown; otherwise they are marked as still to write.",
    "",
    "For each item: keep, reword or drop, and add anything missing.",
    "",
]
for family, topics in DRAFT_FAMILIES.items():
    lines += [f"## {family}", ""]
    for key, items in topics.items():
        lines += [f"### {key.replace('_', '-')}", ""]
        for criterion, label in items:
            lines.append(f"- [ ] **{label}**: {criterion}")
        complexity = complexity_criteria(key)
        if complexity:
            for criterion, label in complexity:
                lines.append(f"- [ ] **{label}** (complexity): {criterion}")
        else:
            lines.append("- [ ] Complexity facts still to write (worst-case trigger, auxiliary space, contrast).")
        lines.append("")
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {sum(len(t) for t in DRAFT_FAMILIES.values())} draft rubrics to {OUT}")
