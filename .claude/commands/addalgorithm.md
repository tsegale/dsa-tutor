# /addalgorithm

Add a new algorithm following the established pattern. Only run after Phase 15 is complete.

Steps:
1. Write the snapshot engine in apps/web/src/engine/[algorithmName].ts — pure function, same interface as bubbleSort.ts.
2. Write Vitest tests in apps/web/src/engine/[algorithmName].test.ts — cover empty, single, sorted, reverse, duplicates. Run pnpm test before continuing.
3. Register in apps/web/src/engine/registry.ts with algorithmName, displayName, engineFunction, track, difficulty, description, estimatedMinutes.
4. Add to database seed in apps/api/prisma/seed.ts. Run npx prisma db seed.
5. Create AI prompt context in apps/ai/prompts/[algorithmName].py with 3 example prediction prompts and 3 misconception scenarios.
6. Update the Current focus section in CLAUDE.md.
7. Run /commit to commit all new files.
