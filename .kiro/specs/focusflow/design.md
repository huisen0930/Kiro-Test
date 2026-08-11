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
- Durable `SqliteTaskRepository` / `SqliteSessionRepository` implementing the same interfaces.
- Authentication and per-user scoping.
- Pagination for `/tasks`.
Each will be added as new requirements + tasks, preserving traceability.
