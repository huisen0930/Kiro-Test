# Design — FocusFlow

## Overview
FocusFlow is a layered Fastify service. HTTP concerns live at the edge (routes +
Zod validation), business rules live in a pure `domain/` layer, and state lives behind
repository interfaces. This keeps the rules unit-testable and lets us swap storage later
without touching routes. Design decisions below cite the requirement ids they satisfy.

## Architecture
```
HTTP  ──▶  routes/ (Zod validate) ──▶ domain/ (rules) ──▶ repositories/ (state)
                    │                                          │
                    └────────── consistent error envelope ◀────┘
```

- **routes/** — one Fastify plugin per resource. Parses/validates input, calls domain
  functions, maps results (and domain errors) to HTTP responses.
- **domain/** — pure functions and types. No Fastify, no I/O. Encodes rules like
  "completing a done task is idempotent" (3.3) and "duration rounds to >= 1 minute" (4.4).
- **repositories/** — interfaces (`TaskRepository`, `SessionRepository`) with in-memory
  implementations for now. Durable storage is a future task (see `tasks.md`).
- **app.ts** — `buildApp(deps)` constructs Fastify and injects repositories + clock.
  This is the only wiring point, which is what makes `app.inject()` tests trivial.
- **server.ts** — production entry; builds the app with real deps and calls `listen()`.

## Key design decisions
| Decision | Why | Satisfies |
|---|---|---|
| Injectable `Clock` (`{ now(): Date }`) | Deterministic time in tests; UTC stats stable | 5.3, NFR |
| Zod schemas as source of truth | One definition drives validation + inferred TS types | 1.2, 1.3, 5.4 |
| Domain errors as tagged objects, mapped centrally | Routes stay thin; error envelope stays consistent | 6.1, 6.3 |
| Single global "active session" rule | Matches a single-user focus model; simpler + predictable | 4.3 |
| In-memory repo behind interface | Ship working software now; storage swap is a clean future task | NFR |
| SQLite via built-in `node:sqlite` | Durable storage with zero deps / no native build; synchronous fits the interfaces | NFR, task 11 |

## Data model
```ts
type TaskStatus = "open" | "done";

interface Task {
  id: string;
  title: string;
  tags: string[];          // lowercased, de-duplicated (1.4)
  status: TaskStatus;
  createdAt: string;       // ISO-8601 UTC
  completedAt: string | null;
}

interface FocusSession {
  id: string;
  taskId: string;
  startedAt: string;       // ISO-8601 UTC
  endedAt: string | null;
  durationMinutes: number | null;  // set on stop, >= 1 (4.4)
}
```

## Durable persistence (SQLite) — task 11
The repository interfaces exist precisely so storage can change without touching routes or
domain logic. Task 11 adds durable implementations using Node's built-in `node:sqlite`
(`DatabaseSync`).

- **Why `node:sqlite`:** zero third-party dependencies and no native build step, matching the
  project's "no native build deps" stance (tech.md). It is synchronous, which fits the existing
  synchronous repository interfaces exactly — no interface changes needed.
- **Node baseline:** `node:sqlite` requires Node 22.5+ (unflagged on Node 24; behind
  `--experimental-sqlite` on Node 22). `engines.node` is raised to `>=22`, and CI runs the
  matrix with `NODE_OPTIONS=--experimental-sqlite` so both 22 and 24 exercise it.
- **Wiring:** only `server.ts` changes — it opens a database and constructs the SQLite repos.
  `buildApp(deps)` still defaults to the in-memory repos, so all `app.inject()` tests stay fast
  and storage-free.
- **Decoupling:** the repository modules import `DatabaseSync` as a *type only*, so importing
  them never loads the runtime module. The single runtime import lives in
  `repositories/sqlite.ts` (`openDatabase`), used by `server.ts` and the SQLite tests.

### Schema
```sql
CREATE TABLE IF NOT EXISTS tasks (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,  -- stable ordering tie-break
  id          TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  tags        TEXT NOT NULL,        -- JSON array of lowercased tags (1.4)
  status      TEXT NOT NULL,
  createdAt   TEXT NOT NULL,        -- ISO-8601 UTC
  completedAt TEXT                  -- nullable
);

CREATE TABLE IF NOT EXISTS sessions (
  seq             INTEGER PRIMARY KEY AUTOINCREMENT,
  id              TEXT NOT NULL UNIQUE,
  taskId          TEXT NOT NULL,
  startedAt       TEXT NOT NULL,
  endedAt         TEXT,             -- null while active
  durationMinutes INTEGER           -- set on stop, >= 1 (4.4)
);
```
- `list()` ordering mirrors the in-memory repo: tasks newest-first by `createdAt DESC, seq DESC`;
  the `tag` filter is applied in JS against the parsed JSON array to match `tags.includes(tag)`.
- `getActive()` selects the single row with `endedAt IS NULL` (single global active-session rule, 4.3).

## API surface
| Method | Path | Purpose | Success | Key criteria |
|---|---|---|---|---|
| GET | `/health` | Liveness | 200 | 6.4 |
| POST | `/tasks` | Create task | 201 | 1.1–1.4 |
| GET | `/tasks` | List (filter `status`, `tag`) | 200 | 2.1–2.3 |
| GET | `/tasks/:id` | Read one | 200 | 2.4, 2.5 |
| PATCH | `/tasks/:id` | Update title/tags | 200 | 3.1, 3.5 |
| POST | `/tasks/:id/complete` | Mark done (idempotent) | 200 | 3.2, 3.3, 3.5 |
| DELETE | `/tasks/:id` | Delete | 204 | 3.4, 3.5 |
| POST | `/tasks/:id/sessions` | Start focus session | 201 | 4.1–4.3 |
| POST | `/sessions/active/stop` | Stop active session | 200 | 4.4, 4.5 |
| GET | `/stats?date=YYYY-MM-DD` | Daily summary | 200 | 5.1–5.4 |

### Error envelope (6.1)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title must not be empty", "details": [ ... ] } }
```
Error codes: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `SESSION_ACTIVE` (409),
`NO_ACTIVE_SESSION` (409), `INTERNAL_ERROR` (500).

## Validation strategy
- Bodies/queries/params validated with Zod at the route boundary; failures become a
  `VALIDATION_ERROR` (1.2, 1.3, 5.4) with `details` derived from `zodError.issues`.
- A Fastify `setErrorHandler` maps `ZodError` → 400 and tagged domain errors → their
  status, and anything else → `INTERNAL_ERROR` 500 without leaking stacks (6.3).
- A `setNotFoundHandler` returns the standard envelope for unknown routes (6.2).

## Stats computation (5.1–5.3)
- `completedTasks` = tasks whose `completedAt` falls within `[date 00:00Z, date+1 00:00Z)`.
- `focusedMinutes` = sum of `durationMinutes` for sessions whose `endedAt` falls in the
  same UTC window.
- The date window is derived from the injected clock when no `date` is provided (5.2).

## Testing strategy
- **Domain unit tests:** rounding (4.4), tag normalization (1.4), idempotent complete (3.3),
  UTC window math (5.3).
- **Integration tests:** `buildApp({ clock: fixedClock })` + `app.inject()` covering every
  endpoint's happy path and its documented error cases.
- Fixed clock makes 5.1–5.3 assertions exact.

## Future work (explicitly deferred, not forgotten)
- Authentication and per-user scoping.
- Pagination for `/tasks`.

Durable SQLite repositories (task 11) are now implemented — see "Durable persistence (SQLite)"
above. Each remaining item will be added as new requirements + tasks, preserving traceability.
