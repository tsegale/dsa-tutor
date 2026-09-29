# Study protocol decisions

Decisions that affect how the study's data is interpreted, recorded where the
code enforces them. Each names the file that implements it.

## Topic completion (unlocks the post-test) - decided 2026-09-29

- **Guided condition** (the tutor with prediction junctions): the participant
  reached the final step of a Practice run for the topic **and** answered at
  least one conceptual junction (pass complete, early termination, algorithm
  complete, complexity prediction) in that session. Reaching the last step
  alone is not enough, because Step forward can get there with no engagement.
  Conceptual junctions fire at every scaffolding level and are never worked
  examples, so the bar is the same for every guided participant.
- **Classic condition** (Week 3, animation without junctions): reaching the
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
reached the end of a guided run and engaged with at least one conceptual
checkpoint (Classic: when they reached the end of a run).

Code: `apps/api/src/config/topicCompletion.ts`.

## Consent before enrolment - decided 2026-09-29

No real (non-PILOT) participant can enrol until every consent detail in
`packages/types/studyConsent.json` is confirmed: researcher name, institutional
email, data retention, and the ethics approval line as confirmed by the
supervisor. Only activity after consent is counted or exported.

Code: `apps/api/src/config/studyConsent.ts`, `apps/api/src/services/study.service.ts`,
`apps/api/src/services/research.service.ts`.
