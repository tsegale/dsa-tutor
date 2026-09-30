# ADR 0006: Request validation is centralised and enforced for every route

Status: accepted

## Context

An early bug let a user register as an educator: the registration DTO was a compile-time type, never checked at runtime, and an extra `role` field passed straight through. Validation written per handler is easy to forget on the next route.

## Decision

Every route declares its body, params and query as zod schemas in one file (`apps/api/src/schemas/routes.ts`), applied by one `validate()` middleware. A part a route leaves out defaults to an empty strict object, so an unexpected field or an undeclared path parameter is a 400, not a silent pass. A coverage test walks Express's live route table and fails if any route lacks a validator; a second one does the same for ownership checks on resource ids.

The OpenAPI spec at `/api/v1/docs` is generated from the same route table and the same zod schemas, so the documentation cannot drift from what the api accepts.

## Consequences

- A new route without validation fails CI.
- Handlers receive parsed, typed input and contain no validation code.
- Clients get one consistent error shape (`VALIDATION_ERROR` with per-field details).
- The spec is always current, at the cost of documenting only what the schemas express.
