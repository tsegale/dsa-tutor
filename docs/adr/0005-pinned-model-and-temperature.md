# ADR 0005: One pinned model and temperature for the whole study

Status: accepted (amended 2026-10-21: the prompt-freeze sentence removed, as that practice was dropped; the pinned model, temperature and per-row prompt version stand)

## Context

The study compares learning with the AI tutor against a control condition. If the model or its sampling settings changed during data collection, differences between participants could come from the model rather than the design, and the method could not be reproduced.

## Decision

The AI service uses one model (`claude-sonnet-4-6`) and one temperature (0.25), set by configuration and not changed during the study. Every interaction row stores the model name and the prompt version it was produced under. Rows produced under different prompt versions are separated by that field in analysis rather than pooled.

## Consequences

- Feedback quality is held constant across participants, so differences are attributable to the design.
- The model name and prompt version on each row let the analysis prove which configuration produced each piece of feedback.
- A better model released mid-study is not adopted until the study ends.
- A prompt change bumps the prompt version, so the rows either side of it stay distinguishable.
- A low temperature keeps feedback consistent without making every hint identical.
