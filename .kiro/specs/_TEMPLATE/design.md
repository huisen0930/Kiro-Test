# Design — <Feature Name>

> How the feature is built. This follows `requirements.md` and precedes `tasks.md`.
> Respect the layering rules in `.kiro/steering/structure.md` (dependencies point inward).

## Overview

<Short summary of the approach and how it fits the existing architecture.>

## Components

### Domain (`src/domain/`)
- <Pure functions/types. No Fastify, no I/O. e.g. `computeX`, validation rules.>

### Repositories (`src/repositories/`)
- <Interface + in-memory implementation. Depends on domain types only.>

### Schemas (`src/schemas/`)
- <Zod schemas for request/response. Single source of truth for shapes.>

### Routes (`src/routes/`)
- <Fastify plugin. Validates with Zod, returns the standard error envelope.>

## API surface

| Method | Path | Body / query | Success | Errors |
|--------|------|--------------|---------|--------|
| GET    | /example | — | 200 `{...}` | — |
| POST   | /example | `{...}` | 201 `{...}` | 400 VALIDATION_ERROR |

## Error handling

<Which error codes apply. All errors use the envelope:
`{ "error": { "code": string, "message": string, "details"?: unknown } }`.>

## Testing strategy

- **Domain:** fast unit tests for the pure logic.
- **Routes:** integration tests via `buildApp()` + `app.inject()` (no port opened).
- Inject a fixed `clock` for deterministic time-based behavior.

## Trade-offs / deferred

- <Anything intentionally left for later, and why.>
