# DSA Tutor — Project CLAUDE.md

## What this is
An interactive web-based platform for learning Data Structures and Algorithms through Socratic questioning, adaptive scaffolding, and real-time misconception-aware feedback. Built as a final-year Computer Science research project at the University of Namibia.

The core mechanic: the platform PAUSES algorithm execution at key decision points and REQUIRES the learner to predict the next step before proceeding. It does not just animate algorithms. That distinction is the entire point of the project.

## Monorepo structure
apps/web       — React 18 + TypeScript + Vite (student-facing frontend)
apps/api       — Node.js + Express + TypeScript (main backend)
apps/ai        — Python FastAPI (AI microservice, LLM prompts, misconception classification)
packages/types — Shared TypeScript interfaces

## Tech stack — no substitutions without discussion

Frontend (apps/web):
- React 18 + TypeScript + Vite
- Zustand — global state ONLY, no useState for shared state
- Tailwind CSS — all styling, NO inline styles, NO CSS modules
- shadcn/ui — accessible component primitives
- Framer Motion — all animations
- D3.js — CALCULATIONS ONLY. D3 never touches the DOM. React renders all SVG.
- TanStack Query — all API calls. No raw fetch in components.

Backend (apps/api):
- Node.js + Express + TypeScript
- Prisma ORM — all database queries, no raw SQL unless Prisma cannot do it
- JWT + bcryptjs — authentication
- PostgreSQL — primary database (Docker locally, Supabase in prod)
- Redis — caching AI responses and session state ONLY, not a primary data store

AI microservice (apps/ai):
- FastAPI + Python 3.11+
- Anthropic Claude API (claude-sonnet-4-6)
- LangChain — prompt template management
- Pydantic — ALL AI responses validated before returning. Malformed responses trigger fallback.

Package manager: pnpm always. Never npm or yarn.

## The snapshot engine — most critical component
The snapshot engine is a PURE FUNCTION. Given an input array, it returns a complete array of state snapshots, one per algorithmic step. Each snapshot contains the full data structure state at that point.

Step-backward is implemented by decrementing the step index in Zustand. It does NOT re-compute anything. The snapshot array is pre-computed once and is immutable.

Required snapshot fields:
- stepIndex: number
- description: string (plain English explanation)
- pseudocodeLine: number
- isPredictionRequired: boolean
- predictionType: 'CANVAS_CLICK' | 'VALUE_INPUT' | 'TILE_GRID'
- dataStructureState: unknown (typed per algorithm)
- activeIndices: number[]
- highlightIndices: number[]
- comparedIndices: number[]

## Primary development algorithm
Bubble Sort is the ONLY development algorithm until Phase 15 is complete. Every feature is built and tested against Bubble Sort first. Do not add other algorithms until instructed.

## Zustand store
One store: useAlgorithmStore
Fields: algorithmName, snapshotArray, stepIndex, mode (DEMO|PRACTICE), scaffoldingLevel (HIGH|MEDIUM|LOW|NONE), sessionXP, focusModeActive, isPlaying, playbackSpeed
Actions: stepForward, stepBackward, resetAlgorithm, setMode, setAlgorithm, toggleFocusMode, addXP

## Canvas rules
- Canvas reads from Zustand. Never holds its own algorithm state.
- D3 layout functions run inside useMemo.
- All SVG is React JSX: circle, rect, line, text, g elements.
- Framer Motion handles position transitions.
- Active elements: colour #7C3AED with pulse animation.
- Inactive elements: 40% opacity.
- Canvas never advances in Practice Mode without a correct prediction.

## Colour system
Light mode (default):
- Background: #FFFFFF
- Surface/cards: #F8FAFC
- Primary accent (indigo): #4F46E5 — navigation, buttons, progress
- Secondary accent (amber): #F59E0B — prediction zone, hints, AI feedback ONLY
- Success: #16A34A — always with checkmark icon
- Error: #DC2626 — always with X icon and stripe pattern
- Active highlight: #7C3AED

Two-accent rule: Indigo = learning content. Amber = system is asking you something. These never cross over.

## File naming
- React components: PascalCase (AlgorithmCanvas.tsx)
- Hooks: camelCase with use prefix (useAlgorithmStore.ts)
- Utilities: camelCase (snapshotEngine.ts)
- API routes: kebab-case (/api/sessions)
- Python files: snake_case (prediction_service.py)
- Tests: filename + .test.ts (snapshotEngine.test.ts)

## API rules
- REST only. Prefix: /api/v1/
- All responses: { "data": {}, "error": null } or { "data": null, "error": { "code": "...", "message": "..." } }
- Never return raw Prisma objects. Always map to a DTO.
- Auth: Bearer token in Authorization header, applied at router level.

## AI microservice rules
- Stateless inference layer only. Never writes to the database.
- Every LLM response validated against Pydantic before returning.
- If validation fails, return the fallback rule-based response.
- Prompt data contract: algorithm_name, step_index, current_state, student_answer, error_history, scaffolding_level

## Testing
- Every snapshot engine function must have Vitest unit tests.
- Test: empty array, single element, already sorted, reverse sorted, duplicates.
- API: Supertest integration tests for happy path and error cases.
- Do not write React component tests unless specifically requested.

## Never do
- Use `any` in TypeScript without a comment.
- Let D3 touch the DOM.
- Add algorithms beyond Bubble Sort until Phase 15 is done.
- Add dependencies without stating the choice and why.
- Write business logic in route handlers. Routes call services.
- Commit .env files.
- Use console.log in production paths.
- Use npm. Always pnpm.

## Current focus
Phase 1: Monorepo scaffold and Docker setup.
Next: Phase 2 — Prisma schema (Users, Sessions, Interactions, AlgorithmTopics).
Update this section at the start of each new phase.
