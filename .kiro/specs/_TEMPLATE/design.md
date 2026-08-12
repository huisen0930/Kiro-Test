# Design — <Feature Name>

> Fill in after `requirements.md` is agreed. Every decision should cite the requirement id
> it satisfies. Respect the inward-pointing dependency rule in `structure.md`.

## Overview
<!-- How this fits the existing architecture in one short paragraph. -->

## UI / Wireframes
<!-- For features with a user interface. Link wireframes/mockups so implementers build from the
     same visual contract as the tech spec. For headless / API-only features, write "N/A". -->
- Wireframes: `.kiro/specs/<feature>/wireframes/` (reference each screen/state by filename)
- Key screens & states: <happy path, empty, loading, error>
- Interaction / accessibility notes: <...>

## Architecture
<!-- Diagram or bullet flow: routes -> domain -> repositories. Note any new module. -->

## Key design decisions
| Decision | Why | Satisfies |
|---|---|---|
| <decision> | <rationale> | <requirement ids> |

## Components and Interfaces
<!-- The modules/functions this feature touches or adds, per layer. Keep dependencies
     pointing inward (routes -> domain -> repositories). For each component, note its
     responsibility and the interface it exposes or consumes. -->
- **routes/** — <which route plugin(s), what they parse/validate and delegate to.>
- **domain/** — <pure functions/types added or changed; the rules they encode.>
- **repositories/** — <interface methods added/used; in-memory vs. durable.>
- **lib/** — <cross-cutting helpers touched (ids, clock, errors), if any.>

## Data Models
```ts
// New/changed types. Keep timestamps as ISO-8601 UTC strings.
```

## API surface
| Method | Path | Purpose | Success | Key criteria |
|---|---|---|---|---|
| <VERB> | `/path` | <purpose> | <2xx> | <ids> |

## Validation strategy
<!-- Which Zod schemas, where validation happens, how failures map to VALIDATION_ERROR. -->

## Correctness Properties
<!-- The invariants that must always hold, phrased so tests can assert them. Cite the
     requirement id each property enforces. Examples: idempotency, ordering guarantees,
     rounding rules, UTC window boundaries, single-active-session constraints. -->
- <property> — <why it must hold> (<requirement ids>)

## Error Handling
<!-- Reuse the standard envelope { error: { code, message, details? } } and the existing
     error-code catalog. Add a new code only if truly needed, and document it here.
     State how each failure maps to a status code and where the mapping happens
     (route handler vs. central setErrorHandler / setNotFoundHandler). -->
| Condition | Code | Status |
|---|---|---|
| <invalid input> | `VALIDATION_ERROR` | 400 |
| <missing resource> | `NOT_FOUND` | 404 |
| <unexpected failure> | `INTERNAL_ERROR` | 500 |

## Testing strategy
<!-- Domain unit tests + app.inject() integration tests. Use a fixed clock for time logic. -->

## Future work (deferred, not forgotten)
- <!-- Anything intentionally out of scope, to become future requirements/tasks. -->
