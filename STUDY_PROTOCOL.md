# Study protocol decisions

Decisions that affect how the study's data is interpreted, recorded where the
code enforces them. Each names the file that implements it.

## Topic completion (unlocks the post-test) - decided 2026-09-29

- **Tutor condition** (the tutor with prediction junctions): the participant
  reached the final step of a Practice run for the topic **and** answered at
  least one conceptual junction (pass complete, early termination, algorithm
  complete, complexity prediction) in that session. Reaching the last step
  alone is not enough, because Step forward can get there with no engagement.
  Conceptual junctions fire at every scaffolding level and are never worked
  examples, so the bar is the same for every guided participant.
- **Classic condition** (the plain visualiser, see below): reaching the
  final step of a run alone, since Classic has no junctions to answer. This
  asymmetry is deliberate.
- Only sessions started after consent count.
- The rule never hard-blocks the post-test: a researcher can open it early with
  the researcher PIN, and the time and the topics still incomplete are recorded.
- The session's `completed` flag (set when the page closes) is the session
  lifecycle only and plays no part.
- Both signals are exported per session (`reachedFinalStep`,
  `conceptualJunctionsAnswered`) with `topicCompleteBySession`, and overrides
  per participant (`posttestOverrideAt`, `posttestOverrideIncompleteTopics`),
  in sessions.csv.

Write-up: participants were considered to have completed a topic when they
reached the end of a tutor run and engaged with at least one conceptual
checkpoint (Classic: when they reached the end of a run). Each session is judged
by the condition the api recorded for it (Session.mode CLASSIC or not).

Code: `apps/api/src/config/topicCompletion.ts`.

## Within-subject control: Classic mode - decided Week 3 (3B)

Each participant uses Classic on exactly one study topic and the full tutor on
the other two, so each participant is their own control with content held
constant. Classic topic by participant code ordinal (PILOT- codes too):

| Participant | bubble-sort | binary-search | bst |
|---|---|---|---|
| 1, 4, 7, 10 | Classic | Tutor | Tutor |
| 2, 5, 8, 11 | Tutor | Classic | Tutor |
| 3, 6, 9, 12 | Tutor | Tutor | Classic |

- Assigned once at enrolment (User.classicTopicSlug) and never re-rolled.
- Topic order is fixed for everyone; only the Classic topic rotates.
- Classic is the same page, engine, canvas, snapshots and step descriptions,
  without any tutor affordance: no predictions, AI Tutor tab, hints, support
  level, worked steps, self-explanations, count question, AI Challenge,
  Feynman, Code Mode or misconception loop. It keeps step controls, auto play,
  speed, custom input, the Pseudocode tab with line highlighting, the static
  Complexity table, the progress meter and the step log.
- The server records Classic sessions as mode CLASSIC and never records it
  elsewhere, so the session mode is a trustworthy condition label.
- Classic logs one VIEW_STEP interaction per step viewed, with time on it.
- Conditions are never labelled to participants.
- Exports carry classicTopicSlug and a per-row condition (CLASSIC or TUTOR).
- Classic generates no misconception events: RQ2 is a within-tutor claim.

Code: `apps/api/src/config/studyCondition.ts`, `apps/web/src/utils/studyCondition.ts`.

## Consent before enrolment - decided 2026-09-29

No real (non-PILOT) participant can enrol until every consent detail in
`packages/types/studyConsent.json` is filled in, including the ethics approval
reference. The page states approval as pending until then, and the reference
stays empty, which keeps real enrolment locked. Only activity after consent is
counted or exported.

Code: `apps/api/src/config/studyConsent.ts`, `apps/api/src/services/study.service.ts`,
`apps/api/src/services/research.service.ts`.
