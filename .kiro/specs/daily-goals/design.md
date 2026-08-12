# Design — Daily Focus Goals

> Cites the requirement ids each decision satisfies. Respects the inward-pointing dependency
> rule in `structure.md`. Reuses the existing focus-session data and the UTC-day window `/stats`
> already relies on.

## Overview
A small, self-contained addition: a single "daily target minutes" value managed via `/goal`,
plus a read-only `/goal/progress` that combines that target with the focused minutes already
tracked by focus sessions. Progress math is a pure function; storage sits behind a repository
interface with in-memory and `node:sqlite` implementations, matching the existing pattern. The
current `/stats` contract is untouched.

## UI / Wireframes
N/A — FocusFlow is a headless REST API.

## Architecture
```
routes/goal-routes.ts
  ├── schemas/goal-schemas.ts        (Zod: validate body + query)
  ├── domain/goal.ts                 (pure: computeGoalProgress)
  ├── domain/stats.ts (existing)     (reuse: focused-minutes-per-UTC-day summing)
  ├── repositories/GoalRepository    (get / set / clear the single target)
  └── repositories/SessionRepository (existing: source of focus sessions)
wired in app.ts (the single DI point); SqliteGoalRepository constructed in server.ts
```

## Key design decisions
| Decision | Why | Satisfies |
|---|---|---|
| Single-value goal (one current target, no history) | Matches product scope; simplest correct model | 1.3; out-of-scope items |
| Dedicated `/goal` + `/goal/progress` endpoints | Adds surface without disturbing the existing `/stats` contract | Non-disruptive NFR |
| `percent` capped at 0–100, `met` as the separate boolean | Progress-bar friendly; `met` still carries "reached-or-exceeded" | 3.4 |
| `DELETE /goal` resets to `0`, idempotent | Clears the goal without inventing an "unset" state distinct from 0 | 1.4, 2.2 |
| Reuse the stats UTC-day session summing for `focusedMinutes` | Consistency with `/stats`; DRY; one source of truth for the day window | 3.3, 4.2 |
| Read "today" via the injectable `Clock` | Deterministic tests | 3.2, 4.3 |
| `GoalRepository` interface, in-memory + `node:sqlite` impls | Matches the existing repository pattern; durable persistence | 4.4 |

## Components and Interfaces
- **routes/** — `goal-routes.ts`: `PUT /goal`, `GET /goal`, `DELETE /goal`, `GET /goal/progress`.
  Validates with Zod, calls the domain + repositories, throws `AppError` for validation failures.
- **domain/** — `goal.ts`: pure `computeGoalProgress(targetMinutes, focusedMinutes)` returning
  `{ remainingMinutes, percent, met }`; no HTTP, no I/O. Reuses `domain/stats.ts` for the
  per-UTC-day focused-minutes summing (no duplicate window logic).
- **repositories/** — `GoalRepository` interface: `getTargetMinutes(): number`,
  `setTargetMinutes(n: number): void`, `clear(): void` (sets 0). Implementations:
  `in-memory-goal-repository.ts` (defaults to 0) and `sqlite-goal-repository.ts` (single-row
  table; import isolated via `repositories/sqlite.ts`).
- **schemas/** — `goal-schemas.ts`: `putGoalBodySchema`, `progressQuerySchema`.
- **app.ts** — register `goal-routes`, inject `goalRepository`, `sessionRepository`, `clock`.
- **server.ts** — construct `SqliteGoalRepository` alongside the existing SQLite repos.

## Data Models
```ts
// The stored goal is just the target integer (0 = no goal). Response DTOs:
interface Goal {
  targetMinutes: number; // 0..1440; 0 means "no goal set"
}

interface GoalProgress {
  date: string; // YYYY-MM-DD (UTC)
  targetMinutes: number; // 0 = no goal
  focusedMinutes: number; // summed from sessions ended that UTC day
  remainingMinutes: number; // max(0, target - focused)
  percent: number; // 0..100 (capped)
  met: boolean; // target > 0 && focused >= target
}
```

## API surface
| Method | Path | Purpose | Success | Key criteria |
|---|---|---|---|---|
| PUT | `/goal` | Set the daily target | 200 `{ targetMinutes }` | 1.1, 1.2, 1.3 |
| GET | `/goal` | Read the current target | 200 `{ targetMinutes }` | 2.1, 2.2 |
| DELETE | `/goal` | Clear the target (→ 0) | 200 `{ targetMinutes: 0 }` | 1.4 |
| GET | `/goal/progress?date=YYYY-MM-DD` | Day progress vs target | 200 `GoalProgress` | 3.1–3.5 |

## Validation strategy
- `putGoalBodySchema`: `targetMinutes` = `z.number().int().min(1).max(1440)` (1.2).
- `progressQuerySchema`: `date` optional, `YYYY-MM-DD` and a real calendar date (reuse the
  approach `stats-schemas` uses); invalid → `400 VALIDATION_ERROR` (3.5).
- Central `setErrorHandler` maps `ZodError` → `400 VALIDATION_ERROR` (4.1).

## Correctness Properties
- `percent` is always within `0..100`; `met` is independent and true only when `targetMinutes > 0 && focusedMinutes >= targetMinutes` (3.4).
- `remainingMinutes` is never negative (3.4).
- When `targetMinutes == 0` ("no goal"): `percent == 0`, `met == false`, `remainingMinutes == 0` (2.2, 3.4).
- The UTC-day window for `focusedMinutes` is identical to `/stats` for the same date (3.3, 4.2).
- `DELETE /goal` is idempotent; `PUT /goal` overwrites (1.3, 1.4).

## Error Handling
| Condition | Code | Status |
|---|---|---|
| Bad `targetMinutes` (missing / non-int / out of 1–1440) | `VALIDATION_ERROR` | 400 |
| Malformed `date` on progress | `VALIDATION_ERROR` | 400 |
| Unexpected fault | `INTERNAL_ERROR` | 500 |

No `NOT_FOUND` path: the goal always exists conceptually (0 = no goal). Mapping happens in the
central `setErrorHandler`; stack traces are never leaked on 500.

## Testing strategy
- **Domain unit tests** (`test/domain/goal.test.ts`): `computeGoalProgress` for target 0, under
  target, exactly met, over target (percent capped at 100, `met` true), remaining never negative.
- **Integration tests** (`app.inject()` with `buildApp({ clock: fixedClock(...) })`): PUT valid
  + invalid (400), GET default 0, PUT overwrite, DELETE reset + idempotent, progress with a fixed
  clock summing sessions inside/outside the UTC day, malformed date (400).
- **SQLite** (`test/repositories/*`): target persists across a fresh repository over the same DB.

## Future work (deferred, not forgotten)
- Per-day historical goals (different target per date).
- Streaks / consecutive-day "met" tracking.
- Per-user goals (requires auth, currently out of scope).
