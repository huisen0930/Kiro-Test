# Tech — Stack & Commands

## Stack
- **Runtime:** Node.js **>= 22** (developed on 24). Node 22 is the floor because the durable
  store uses the built-in `node:sqlite`, which is unflagged on Node 24 and behind
  `--experimental-sqlite` on Node 22.
- **Language:** TypeScript, ES modules (`"type": "module"`), `strict` mode. Relative imports
  carry explicit `.js` extensions (NodeNext resolution).
- **HTTP framework:** Fastify (schema-first, no native build deps).
- **Validation:** Zod. Schemas are the single source of truth for request/response shapes.
- **Persistence:** Repositories sit behind `TaskRepository` / `SessionRepository` interfaces.
  Two implementations exist:
  - **In-memory** — the default in `buildApp`; used by every `app.inject()` test and `npm run dev`.
  - **Durable SQLite** via built-in `node:sqlite` (`DatabaseSync`) — wired in `server.ts` only.
    Zero third-party deps, no native build; synchronous, which fits the interfaces exactly. The
    single runtime import is isolated in `repositories/sqlite.ts`; the repo modules import
    `DatabaseSync` as a type only.
- **Testing:** Vitest — domain unit tests + integration tests that boot Fastify via `app.inject()`.
- **Dev runner:** `tsx`.

## Commands
- `npm run dev` — start the API in watch mode (run it yourself in a terminal).
- `npm run build` — type-check and emit to `dist/` (`tsc -p tsconfig.build.json`).
- `npm start` — run the built server with SQLite (`node --experimental-sqlite dist/server.js`).
- `npm test` — run the full Vitest suite once.
- `npm run test:watch` — Vitest in watch mode (run it yourself in a terminal).
- `npm run lint` — type-check only (`tsc --noEmit`); the fast correctness gate.
- `npm run sync:issues -- --spec <name> --milestone "<phase>"` — turn a spec's tasks into GitHub issues.

> Long-running commands (`dev`, `test:watch`) are for the human's own terminal, never launched
> as a blocking agent command.

## Definition of Done (the verification gate)
Nothing is "done" until, in the same turn with fresh evidence, `npm run verify` passes — it runs:
- `npm run lint` — type-check, **0 errors** (`tsc --noEmit`)
- `npm run lint:eslint` — ESLint, **0 errors**
- `npm run format` — Prettier formatting check passes
- `npm run build` — compiles
- `npm test` — **0 failures**

CI runs the same on Node 22 + 24 (`NODE_OPTIONS=--experimental-sqlite`) and additionally enforces
`npm run coverage` thresholds (statements/lines 80, functions 80, branches 75) plus a non-blocking
`npm audit`; CodeQL scans separately. A clean type-check + ESLint + green Vitest **is** the bar —
there is no compiler-warning stream to grep. Never claim completion from a stale run.

## Conventions
- **No `any`.** Prefer precise types; narrow `unknown` at boundaries.
- **Pure domain.** Business logic in `domain/` stays free of Fastify/HTTP/I/O so it is trivially unit-testable.
- **Consistent errors.** Every route validates input with Zod and returns the envelope
  `{ "error": { "code": string, "message": string, "details"?: unknown } }`. Codes:
  `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `SESSION_ACTIVE` (409),
  `NO_ACTIVE_SESSION` (409), `INTERNAL_ERROR` (500). Never leak stack traces (500s).
- **Time.** Timestamps are ISO-8601 UTC; read "now" only through the injectable `Clock`.
- **No native build steps** in a new dependency without calling it out first.
