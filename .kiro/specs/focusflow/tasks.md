# Tasks — FocusFlow

Implementation plan. Each task is small, independently verifiable, and cites the
requirements it satisfies. Check a box when the task is implemented **and** its tests pass.

> How to run a task in Kiro: open this file, click **Start task** above an unchecked item,
> and Kiro implements just that slice against the spec. Review, then move to the next.

---

- [x] 1. Project scaffold & tooling
  - Initialize `package.json` (ESM), `tsconfig.json` (strict), `vitest.config.ts`, `.gitignore`.
  - Add scripts: `dev`, `build`, `test`, `test:watch`, `lint`.
  - _NFR: no native deps; installs cross-platform._

- [x] 2. Cross-cutting lib: ids, clock, errors
  - `lib/clock.ts` (injectable `Clock`), `lib/id.ts` (unique ids), `lib/errors.ts`
    (tagged `AppError` + factory helpers and the error-code catalog).
  - _Requirements: 5.3, 6.1._

- [x] 3. Task domain logic (pure)
  - `domain/task.ts`: `createTask`, `normalizeTags`, `applyUpdate`, `completeTask`
    (idempotent), status typing.
  - Unit tests for tag normalization and idempotent completion.
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3._

- [x] 4. Task repository
  - `repositories/task-repository.ts` interface + `in-memory-task-repository.ts`.
  - _Requirements: 2.1, 2.5._

- [x] 5. Zod schemas for tasks
  - `schemas/task-schemas.ts`: create/update bodies, list query, id param.
  - _Requirements: 1.2, 1.3, 2.2, 2.3._

- [x] 6. Task routes + app wiring + error handling + health
  - `app.ts` (`buildApp(deps)`), `routes/task-routes.ts`, `routes/health-routes.ts`,
    central `setErrorHandler` + `setNotFoundHandler`, `server.ts`.
  - Integration tests via `app.inject()` for every task endpoint + health + unknown route.
  - _Requirements: 1.1–1.4, 2.1–2.5, 3.1–3.5, 6.1–6.4._

---
Remaining slices — try these yourself with **Start task** to experience Kiro's
incremental execution:

- [x] 7. Focus session domain + repository
  - `domain/session.ts` (`startSession`, `stopSession` with >=1 min rounding),
    `SessionRepository` + in-memory impl, active-session lookup.
  - Unit tests for duration rounding and the single-active-session rule.
  - _Requirements: 4.1, 4.3, 4.4._

- [x] 8. Focus session routes
  - `routes/session-routes.ts`: `POST /tasks/:id/sessions`, `POST /sessions/active/stop`.
  - Integration tests for start/stop plus `409` conflicts and `404` for unknown task.
  - _Requirements: 4.1–4.5._

- [x] 9. Daily stats endpoint
  - `domain/stats.ts` (UTC window math), `routes/stats-routes.ts` (`GET /stats?date=`).
  - Tests with a fixed clock asserting exact counts and minutes.
  - _Requirements: 5.1–5.4._

- [-] 10. Error-handling hardening pass
  - Verify 500s never leak stacks; confirm envelope on every error path.
  - _Requirements: 6.1, 6.3._

- [~] 11. (Stretch) Durable SQLite repositories
  - Implement `SqliteTaskRepository` / `SqliteSessionRepository` behind existing interfaces;
    switch wiring in `server.ts` only. Demonstrates the storage swap the interfaces enable.
  - _Requirements: NFR; enables future persistence._

---
### Progress
Tasks 1–6 (foundation + full task CRUD + health + error handling) are implemented and
tested. Tasks 7–11 are specified and ready to run.
