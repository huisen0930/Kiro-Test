# Tech — Stack & Commands

## Stack
- **Runtime:** Node.js (>= 20; developed on 24).
- **Language:** TypeScript, ES modules (`"type": "module"`), `strict` mode on.
- **HTTP framework:** Fastify (fast, schema-first, no native build deps).
- **Validation:** Zod. Schemas are the single source of truth for request/response shapes.
- **Persistence:** In-memory repository behind a `TaskRepository` / `SessionRepository`
  interface. A durable (SQLite) implementation is deliberately left as a future spec
  task so the swap can be demonstrated cleanly.
- **Testing:** Vitest. Unit tests for domain logic, integration tests that boot the
  Fastify app with `app.inject()` (no real network needed).
- **Dev runner:** `tsx` for running/watching TypeScript directly.

## Commands
- `npm run dev` — start the API in watch mode (run this yourself in a terminal).
- `npm run build` — type-check and emit to `dist/`.
- `npm test` — run the full Vitest suite once.
- `npm run test:watch` — Vitest in watch mode (run this yourself in a terminal).
- `npm run lint` — type-check only (`tsc --noEmit`), used as a fast correctness gate.

> Long-running commands (`dev`, `test:watch`) should be started by the human in their
> own terminal, never launched as a blocking agent command.

## Conventions
- No `any`. Prefer precise types; use `unknown` + narrowing at boundaries.
- Pure domain logic stays free of Fastify/HTTP concerns so it is trivially unit-testable.
- Every route validates input with Zod and returns typed, consistent error envelopes:
  `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- Use ISO-8601 UTC strings for all timestamps at the API boundary.
- Never introduce a dependency with native build steps without calling it out first.
