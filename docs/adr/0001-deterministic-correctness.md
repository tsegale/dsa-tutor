# ADR 0001: Correctness is deterministic; the model only explains

Status: accepted

## Context

Every prediction the student makes has a right answer that follows from the algorithm's state. Early versions sent the answer to the model and trusted its verdict. A language model can be wrong about a comparison, and a tutor that marks a correct answer wrong teaches the opposite of what it should. The verdict is also research data: grading has to be reproducible for the study.

## Decision

The verdict comes from code. The snapshot engine records the state at each junction, and a pure function (`correctTileIdFor`, and `/predictions/evaluate` on the server) decides right or wrong from that state. The model is called only after the verdict exists, and only to explain it: why the answer was wrong, a Socratic hint, and a counterfactual trace. It is told the verdict and never asked for one.

Code Mode follows the same rule. The student's Python runs in Pyodide in the browser and the resulting array is compared with the expected one. The model sees the result, not the job of executing the code.

## Consequences

- The student sees right or wrong instantly, before any model latency.
- A model failure can degrade the explanation but never the grade.
- Grading is reproducible from the logged state alone, which the study depends on.
- The prompts get simpler: the model explains a known result and does not reason about correctness.
