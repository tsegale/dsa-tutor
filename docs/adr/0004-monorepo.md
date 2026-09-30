# ADR 0004: One monorepo for web, api, AI service and shared types

Status: accepted

## Context

The web app, the api and the AI service change together. A new junction type, for example, touches the snapshot engine, the prediction payload, the api's validation and the AI prompt in one piece of work. Keeping them in separate repositories would mean coordinating versions of a shared contract by hand.

## Decision

A pnpm workspace with Turborepo: `apps/web`, `apps/api`, `apps/ai` and `packages/types`. The web app and api import the same TypeScript interfaces from `@dsa-tutor/types`. One CI workflow typechecks, tests and builds everything on every push, and runs the AI service's pytest suite.

## Consequences

- A contract change is one commit that the type checker verifies on both sides.
- CI is one signal for the whole system.
- The Python service sits outside the TypeScript type graph, so its contract is held by its own Pydantic models and tests rather than shared types.
- The types package exports TypeScript source; the api cannot import runtime values from it, so shared runtime data (for example the consent details) lives in JSON the package also exports.
