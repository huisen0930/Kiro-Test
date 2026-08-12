# Requirements — Daily Focus Goals

## Introduction
Daily Focus Goals lets a user set a target number of focused minutes per day and see how the
day is tracking against it. It builds directly on the existing focus-session data (a session's
`durationMinutes` on the UTC day it ended) and the established UTC-day window used by `/stats`.
This document defines *what* the capability must do; the *how* lives in `design.md` and the
*build order* in `tasks.md`.

FocusFlow is a headless REST API — there is no UI, so wireframes are **N/A** for this feature.

Acceptance criteria use EARS:
- **WHEN** `<trigger>` **THE SYSTEM SHALL** `<response>` (event-driven)
- **IF** `<condition>` **THEN THE SYSTEM SHALL** `<response>` (unwanted / edge)
- **WHILE** `<state>` **THE SYSTEM SHALL** `<response>` (state-driven)
- **WHERE** `<optional input>` **THE SYSTEM SHALL** `<response>` (optional)
- **THE SYSTEM SHALL** `<response>` (ubiquitous)

---

## Requirement 1 — Set and manage the daily focus goal
**User story:** As a user, I want to set, change, and clear my daily target of focused minutes,
so that I can keep my goal current.

#### Acceptance criteria
1.1. WHEN a client PUTs `/goal` with an integer `targetMinutes` in the range 1–1440 THE SYSTEM SHALL persist it and respond `200` with `{ "targetMinutes": <n> }`.
1.2. IF `targetMinutes` is missing, not an integer, less than 1, or greater than 1440 THEN THE SYSTEM SHALL respond `400` with error code `VALIDATION_ERROR`.
1.3. WHEN a client PUTs `/goal` again with a new valid value THE SYSTEM SHALL overwrite the previous target (the goal is a single current value, not a history).
1.4. WHEN a client DELETEs `/goal` THE SYSTEM SHALL reset the target to `0` ("no goal") and respond `200` with `{ "targetMinutes": 0 }`; the operation is idempotent (deleting when already unset still responds `200` with `0`).

## Requirement 2 — Read the daily focus goal
**User story:** As a user, I want to read my current daily goal, so that I know what target is set.

#### Acceptance criteria
2.1. WHEN a client GETs `/goal` THE SYSTEM SHALL respond `200` with `{ "targetMinutes": <n> }` reflecting the current target.
2.2. WHERE no goal has ever been set THE SYSTEM SHALL respond `200` with `targetMinutes` = `0`, meaning "no goal set".

## Requirement 3 — Daily goal progress
**User story:** As a user, I want to see my progress toward the goal for a given day, so that I
know whether I hit my focus target.

#### Acceptance criteria
3.1. WHEN a client GETs `/goal/progress` THE SYSTEM SHALL respond `200` with `{ date, targetMinutes, focusedMinutes, remainingMinutes, percent, met }` for the requested UTC date.
3.2. WHERE no `date` query parameter is supplied THE SYSTEM SHALL default to the current UTC date.
3.3. THE SYSTEM SHALL compute `focusedMinutes` as the sum of `durationMinutes` of focus sessions whose `endedAt` falls within that UTC day (the same window used by `/stats`).
3.4. THE SYSTEM SHALL compute `remainingMinutes` = max(0, `targetMinutes` − `focusedMinutes`); `percent` = `targetMinutes` > 0 ? min(100, round(`focusedMinutes` ÷ `targetMinutes` × 100)) : 0 (**capped at 100**); and `met` = (`targetMinutes` > 0 AND `focusedMinutes` ≥ `targetMinutes`). Note `met` carries the "reached-or-exceeded" truth so `percent` can stay capped without losing information.
3.5. IF the `date` parameter is not a valid `YYYY-MM-DD` value THEN THE SYSTEM SHALL respond `400` with error code `VALIDATION_ERROR`.

## Requirement 4 — Consistency, correctness & persistence
**User story:** As a client developer, I want the goal endpoints to behave like the rest of the
API, so that I can integrate them predictably.

#### Acceptance criteria
4.1. THE SYSTEM SHALL return all errors using the standard envelope `{ "error": { "code", "message", "details"? } }` with codes from the existing catalog.
4.2. THE SYSTEM SHALL compute all date boundaries in UTC, independent of server locale.
4.3. THE SYSTEM SHALL read the current time only through the injectable `Clock` so date-dependent behavior is deterministic in tests.
4.4. WHILE the durable SQLite repository is in use THE SYSTEM SHALL persist the goal across process restarts.

---

## Non-functional requirements
- **No new runtime dependencies** and no native build step (in-memory + `node:sqlite` only).
- **Determinism:** every date/progress assertion is testable under a fixed clock.
- **Coverage:** new domain logic and every endpoint (happy path + documented error paths) are covered by automated tests, keeping the repo above its coverage thresholds.
- **Non-disruptive:** the existing `/stats` contract is unchanged; goal progress is a new surface.

## Out of scope (deferred, not forgotten)
- Per-day historical goals (different target on different days) — current model is a single target.
- Streaks / consecutive-day tracking.
- Multiple users / per-user goals (FocusFlow has no auth yet).

## Traceability
Each acceptance-criterion id (e.g. `3.4`) is referenced in `design.md` and `tasks.md`, so any
change can be traced requirement → design decision → task → test.
