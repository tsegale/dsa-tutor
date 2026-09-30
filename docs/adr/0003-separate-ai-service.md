# ADR 0003: The AI layer is a separate service

Status: accepted

## Context

The platform needs model calls with prompt templates, response validation, streaming and fallbacks. The main api is Node and Express; the most mature tooling for prompt management and schema validation of model output was in Python (the Anthropic SDK, Pydantic, LangChain templates).

## Decision

The AI layer is a stateless FastAPI service (`apps/ai`). It never touches the database. The api owns authentication, persistence and research logging, and calls the AI service over HTTP with a correlation id. The browser never calls the AI service directly for study features; it goes through the api.

## Consequences

- Model concerns (prompts, validation, retries, caching, fallback) live in one place with their own tests, and can change without touching the api.
- Every prompt change bumps one `PROMPT_VERSION`, stored on each interaction, so data from different prompt wordings stays separable.
- The cost is a network hop and a second deployment. The request id is propagated api to AI service and logged on both sides, so a stalled call can be placed: no AI-side start means it died at the platform edge; a start with no end means the AI service stalled.
- The api can enforce limits (for example the demo account's AI allowance) before any model spend happens.
