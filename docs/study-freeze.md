# Study freeze record

The build used for data collection, recorded when it was frozen so the method chapter's reproducibility section can cite it exactly. From the freeze on: no prompt changes, no scoring changes, no assessment item changes and no junction changes. Bug fixes only, each re-run against the Week 5 pilot checks and added to the log at the end of this file.

## Release

| | |
| --- | --- |
| Git tag | `study-freeze-v1` |
| Tagged commit | The commit that adds this file (`git rev-list -n 1 study-freeze-v1`). A file cannot name its own commit hash; the tag is the reference. |
| Frozen on | 2026-09-30 |

## Deployed commits at the freeze

| Service | Host | Commit |
| --- | --- | --- |
| Web | Vercel, project `dsa-tutor-web` | `study-freeze-v1` (redeploys on every push) |
| api | Railway, service `api` (EU West) | `5c1b6c1`. Railway skips api deploys for commits that do not touch its watched paths; `git diff 5c1b6c1 study-freeze-v1 -- apps/api packages/types` is empty, so the running api code is the tagged code. |
| AI service | Railway, service `ai` (EU West) | `study-freeze-v1` (redeploys on every push) |

Checked on 2026-09-30: Railway's api service showed `5c1b6c1` active and the ai service the latest push; Vercel served the latest build (its stylesheet carries the last web change). Re-check after any push: the Railway service Deployments tab, and the Vercel production deployment's commit.

## Model and prompts

| | |
| --- | --- |
| Model | `claude-sonnet-4-6` (`CLAUDE_MODEL`) |
| Temperature | 0.25 (`CLAUDE_TEMPERATURE`) |
| Prompt version | `2026-09-30.1` (`PROMPT_VERSION`, `apps/ai/prompts/templates.py`), stored on every interaction as `promptVersion` |
| Prediction feedback | One call, no retry |
| Hints | One retry inside `CLAUDE_RETRY_BUDGET_SECONDS` |

Every interaction logged under an earlier prompt version, and every row with a null `promptVersion`, is pilot data, not study data. Rows with feedback from before prompt `2026-09-28.6` are additionally marked by `hasPreLabelFixFeedback` and excluded from analysis.

## Study design

| | |
| --- | --- |
| Study topics | `bubble-sort`, `binary-search`, `bst`, in that fixed order |
| Control | Within-subject Classic mode on one topic per participant, rotated by participant code ordinal: 1, 4, 7, 10 Bubble Sort; 2, 5, 8, 11 Binary Search; 3, 6, 9, 12 BST |
| Completion rule | Tutor topics: reached the final step and answered at least one conceptual junction, in a session started after consent. Classic: reached the final step. Researcher PIN override, recorded. |
| Assessment instrument | `STUDY_PRE_V1` and `STUDY_POST_V1`: identical items from `apps/api/src/data/assessmentItemBank.ts`, 24 items across the three study topics |

## Misconception resolution criteria (Week 3, 3C)

Implemented in `apps/api/src/services/misconceptionEvent.service.ts` (the rules) and `apps/web/src/store/useMisconceptionStore.ts` (when they are applied).

- **Detection.** A wrong first attempt at a junction, on a study topic, whose chosen option carries a misconception category that has probing junctions. Each junction instance is acted on once. A first attempt means the learner's first answer at that junction, right or wrong.
- **Remediation.** A Quick Check at level remediation count + 1: L1 micro-prediction, L2 counterexample or trace completion with the consequence shown, L3 worked example. Shown after the triggering junction is resolved, never on top of it.
- **Re-probe.** The next probing junction for that category, on a different instance.
- **Resolved.** Consecutive correct, unhinted probes: one when the probe offered three or more options, two when it offered two.
- **Correct with a hint.** Resets the streak; not counted as a failure.
- **Escalation.** A wrong probe, or the same misconception detected again, resets progress and raises the remediation count.
- **Persistent.** The third escalation. The learner is shown the worked explanation and the event is not reopened.
- **Abandoned.** More than 25 junctions since detection, or two sessions on other topics since the learner was last on the event's topic (checked at every session start).

## Verified before the freeze

- Week 3 end-of-week checks: all eight passing in production on PILOT-1 or the local database (2026-09-29 and 2026-09-30), including one event each for `RESOLVED`, `PERSISTENT` and `ABANDONED`.
- Week 4 end-of-week checks (2026-09-30):
  - Suites and CI green on every commit.
  - Workspace panels resize and the layout persists across a reload (production).
  - Code Mode: the CodeMirror editor renders with line numbers and highlighting in production, and `POST /api/v1/ai/code-eval` grades a submission end to end (200, judged correct, AI hint). A click-through submission in the UI was not repeated after the editor change, because the only logged-in participant has Code Mode's topic as its Classic topic.
  - Accessibility: axe reports no serious or critical issues on the dashboard or an algorithm page, in light or dark theme. Every focusable element shows a focus ring under keyboard focus (checked by script; the automation window could not deliver real Tab presses).
  - 1280x720 and 1366x768 show nothing cut off; at 390px the workspace and both dashboards show the larger-screen message, and the sign-in, consent and join pages remain usable.
  - Research exports return rows of every interaction type as an educator; pilot rows are excluded by default and included with the flag.
  - `/api/v1/docs` serves the generated OpenAPI 3.1 spec.
  - One request id (`freeze-check-1790755049635`) appears in both the api's and the AI service's logs.

## Post-freeze fixes

None yet.
