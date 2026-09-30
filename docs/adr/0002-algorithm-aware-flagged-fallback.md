# ADR 0002: Fallback feedback is algorithm-aware and flagged

Status: accepted

## Context

Every model response is validated before it is shown, against a Pydantic schema and against content rules: no self-correction markers, no notation foreign to the pseudocode on screen, a two-sentence cap, and no statement of the correct answer after a wrong one. Some responses fail, and some calls time out. The student still needs feedback, and the study needs to know which feedback came from the model.

A single generic "try again" fallback would be honest but useless. Hiding fallbacks would corrupt the data: the analysis compares AI feedback with its absence.

## Decision

When a field fails validation or the call fails, that field is replaced by rule-based text written for the algorithm, junction type and scaffolding level. The other fields keep the model's text if they passed. Streamed feedback is released one validated sentence at a time, and a sentence already shown is never swapped out.

Every interaction row records what was displayed, not what the model wrote. `aiGenerated` is false when any displayed field was a fallback, and `aiFailureReason` names the rule or failure that caused it. The wrong-answer fallback rate is a defined study metric, reported by reason on the educator dashboard.

## Consequences

- A student never sees unvalidated model text, and never sees nothing.
- The research log can separate AI-generated feedback from fallback per interaction, so the effect of the AI layer can be measured, not assumed.
- Fallback text has to be written and maintained per algorithm; that is the price of it being useful.
