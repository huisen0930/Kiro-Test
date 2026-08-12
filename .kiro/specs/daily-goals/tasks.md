# Tasks — Daily Focus Goals

Implementation plan derived from `design.md`. Each task is small, independently verifiable, and
cites the requirements it satisfies. Check a box only when the task is implemented AND its tests
pass (the DoD: `npm run verify`). Turn these into GitHub issues with:
`npm run sync:issues -- --spec daily-goals --milestone "Phase 2: Daily focus goals" --create`

---

- [ ] 1. Zod schemas for the goal (`src/schemas/goal-schemas.ts`)
  - `putGoalBodySchema`: `targetMinutes` integer in 1–1440.
  - `progressQuerySchema`: optional `date` as a valid `YYYY-MM-DD` (mirror `stats-schemas`).
  - Export inferred types.
  - _Requirements: 1.2, 3.5_

- [ ] 2. Goal domain (`src/domain/goal.ts`)
  - `GoalProgress` type + pure `computeGoalProgress(targetMinutes, focusedMinutes)` returning
    `{ remainingMinutes, percent, met }` with `percent` capped at 100 and `remaining` ≥ 0.
  - Unit tests: target 0, under, exactly met, over (capped), remaining never negative.
  - _Requirements: 2.2, 3.4_

- [ ] 3. Goal repository interface + in-memory implementation
  - `src/repositories/goal-repository.ts` (`getTargetMinutes` / `setTargetMinutes` / `clear`).
  - `src/repositories/in-memory-goal-repository.ts` (defaults to 0).
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2_

- [ ] 4. Durable SQLite goal repository + wiring in `server.ts`
  - `src/repositories/sqlite-goal-repository.ts` (single-row table; import via `repositories/sqlite.ts`).
  - Construct it in `server.ts` alongside the existing SQLite repos.
  - Test: target persists across a fresh repository over the same DB.
  - _Requirements: 4.4_

- [ ] 5. Goal routes + app wiring + tests
  - `src/routes/goal-routes.ts`: `PUT /goal`, `GET /goal`, `DELETE /goal`, `GET /goal/progress`.
  - Compute `focusedMinutes` for the UTC day by reusing the stats session-summing (`domain/stats`).
  - Wire the plugin + dependencies (`goalRepository`, `sessionRepository`, `clock`) in `app.ts`.
  - Integration tests via `buildApp({ clock: fixedClock(...) })` + `app.inject()`: set/read/clear,
    overwrite, idempotent delete, progress across the UTC boundary, invalid body (400), bad date (400).
  - _Requirements: 1.1–1.4, 2.1–2.2, 3.1–3.5, 4.1–4.3_

---
### Notes
- Dependency order: 1 → 2 → 3 → (4, 5). Task 5 depends on 1–3; task 4 depends on 3.
- Every task must leave `npm run verify` green and keep coverage above threshold before its box is ticked.
- The `/stats` contract is not modified by any task.
