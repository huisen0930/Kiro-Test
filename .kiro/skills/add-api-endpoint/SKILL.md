---
name: add-api-endpoint
description: Add a new HTTP endpoint to the FocusFlow Fastify API following its layered architecture. Use when adding a route, resource, or endpoint, wiring Zod validation, throwing typed errors, or writing route integration tests. Keeps domain logic pure and HTTP concerns at the edge.
---

# Adding an endpoint to FocusFlow

Follow the layers outward. Dependencies point inward (`domain` ← `repositories` ← `routes`
← `app`), so build from the inside out. See `references/endpoint-checklist.md` for the
copy-paste checklist.

## Order of work

1. **Spec first.** Confirm the endpoint exists in `.kiro/specs/<feature>/` with acceptance
   criteria. If not, use the `spec-authoring` skill before writing code.

2. **Schema (`src/schemas/`).** Define Zod schemas for the body, params, and query. Schemas
   are the single source of truth; export inferred types with `z.infer`.

3. **Domain (`src/domain/`).** Put business rules in pure functions that take plain inputs
   plus the injected `Clock`. No Fastify, no I/O here — this is what makes rules unit-testable.

4. **Repository (`src/repositories/`).** If new state is needed, add a method to the
   repository *interface* and implement it in the in-memory repository. Routes depend on the
   interface, never a concrete store.

5. **Route plugin (`src/routes/`).** Create or extend a `FastifyPluginAsync`. In the handler:
   `parse` input with the Zod schema, call the domain function, use the repository, and
   `throw` an `AppError` (from `lib/errors.ts`) for failure paths. Do not build ad-hoc error
   responses — the central handler formats the envelope.

6. **Wire it in `app.ts`.** Register the plugin and inject its dependencies. `app.ts` is the
   only wiring point.

7. **Tests (`test/`).** Add domain unit tests for the rules, and integration tests that use
   `buildApp({ clock: fixedClock(...) })` + `app.inject()` covering the happy path and every
   documented error case. No real port is opened.

## Non-negotiables
- No `any`. Use precise types; narrow `unknown` at boundaries.
- All errors flow through `AppError` → the central `setErrorHandler` (consistent envelope).
- Timestamps are ISO-8601 UTC; read "now" only via the injected clock.

## Verify
Run `npm run lint` then `npm test`. The `test-on-save` hook also runs tests on every `.ts`
save, and `verify-after-task` runs lint + tests when a spec task is completed.
