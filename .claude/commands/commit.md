# /commit

Stage all changes and create Conventional Commits messages.

Steps:
1. Run git status and git diff --stat to see what changed.
2. Group changes into logical units. Split unrelated changes into separate commits.
3. For each commit: stage only relevant files, write a Conventional Commits message, commit.
   Format: type(scope): description
   Imperative mood, lowercase, no period, max 72 chars.
4. Print a summary of all commits made.
5. Do NOT push. End with: "Ready to push — run git push when ready."

Valid types: feat, fix, docs, style, refactor, perf, test, chore, build, ci

Scope examples: canvas, engine, api, ai, auth, db, prediction, hint, scaffolding, dashboard, types, config, deps, tests

Examples:
  feat(engine): add bubble sort snapshot engine with step-backward support
  fix(canvas): correct active index highlight not resetting between steps
  test(engine): add edge case tests for empty and single-element arrays
  chore(deps): upgrade prisma to 6.2.0
