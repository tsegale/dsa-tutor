# ADR 0005: One pinned model and temperature for the whole study

Status: accepted

## Context

The study compares learning with the AI tutor against a control condition. If the model or its sampling settings changed during data collection, differences between participants could come from the model rather than the design, and the method could not be reproduced.

## Decision

The AI service uses one model (`claude-sonnet-4-6`) and one temperature (0.25), set by configuration and not changed during the study. Every interaction row stores the model name and the prompt version it was produced under. Study prompts freeze before the pilot; any later change means re-piloting, and rows logged before the freeze are pilot data, not study data.

## Consequences

- Feedback quality is held constant across participants, so differences are attributable to the design.
- The model name and prompt version on each row let the analysis prove which configuration produced each piece of feedback.
- A better model released mid-study is not adopted until the study ends.
- A low temperature keeps feedback consistent without making every hint identical.
