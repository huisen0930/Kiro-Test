# Requirements — FocusFlow

## Introduction
FocusFlow is a REST API for capturing tasks and tracking timed focus sessions against
them, then reporting honest daily stats. This document defines *what* the system must do.
The *how* lives in `design.md`, and the *build order* lives in `tasks.md`.

Acceptance criteria use EARS (Easy Approach to Requirements Syntax):
- **WHEN** `<trigger>` **THE SYSTEM SHALL** `<response>` (event-driven)
- **IF** `<condition>` **THEN THE SYSTEM SHALL** `<response>` (unwanted / edge condition)
- **WHILE** `<state>` **THE SYSTEM SHALL** `<response>` (state-driven)
- **THE SYSTEM SHALL** `<response>` (ubiquitous)

---

## Requirement 1 — Create tasks
**User story:** As a user, I want to create a task with a title, so that I can record
something I intend to work on.

#### Acceptance criteria
1.1. WHEN a client POSTs a task with a non-empty `title` THE SYSTEM SHALL create the task, assign a unique id, set `status` to `"open"`, set `createdAt` to the current time, and respond `201` with the created task.
1.2. IF the request body has a missing or empty `title` THEN THE SYSTEM SHALL reject it with `400` and error code `VALIDATION_ERROR`.
1.3. IF the request body includes a `title` longer than 200 characters THEN THE SYSTEM SHALL reject it with `400` and error code `VALIDATION_ERROR`.
1.4. WHERE the request includes an optional `tags` array THE SYSTEM SHALL store the tags, lowercased and de-duplicated.

## Requirement 2 — List and read tasks
**User story:** As a user, I want to list and read my tasks, so that I can review what I
have captured.

#### Acceptance criteria
2.1. WHEN a client GETs the task collection THE SYSTEM SHALL respond `200` with an array of tasks ordered by `createdAt` descending.
2.2. WHERE a `status` query parameter of `open` or `done` is supplied THE SYSTEM SHALL return only tasks in that status.
2.3. WHERE a `tag` query parameter is supplied THE SYSTEM SHALL return only tasks carrying that tag.
2.4. WHEN a client GETs a task by a known id THE SYSTEM SHALL respond `200` with that task.
2.5. IF a client requests a task id that does not exist THEN THE SYSTEM SHALL respond `404` with error code `NOT_FOUND`.

## Requirement 3 — Update and complete tasks
**User story:** As a user, I want to edit and complete tasks, so that they reflect reality.

#### Acceptance criteria
3.1. WHEN a client PATCHes an existing task with a valid `title` and/or `tags` THE SYSTEM SHALL apply the changes and respond `200` with the updated task.
3.2. WHEN a client completes an open task THE SYSTEM SHALL set `status` to `"done"`, set `completedAt` to the current time, and respond `200`.
3.3. IF a client completes a task that is already `done` THEN THE SYSTEM SHALL leave `completedAt` unchanged and respond `200` (idempotent).
3.4. WHEN a client DELETEs an existing task THE SYSTEM SHALL remove it and respond `204`.
3.5. IF a client updates, completes, or deletes a non-existent task THEN THE SYSTEM SHALL respond `404` with error code `NOT_FOUND`.

## Requirement 4 — Focus sessions
**User story:** As a user, I want to run a timed focus session against a task, so that I
can measure the attention I actually spent on it.

#### Acceptance criteria
4.1. WHEN a client starts a focus session for an existing task THE SYSTEM SHALL create a session with `startedAt` set to now and `endedAt` null, and respond `201`.
4.2. IF a client starts a session for a non-existent task THEN THE SYSTEM SHALL respond `404` with error code `NOT_FOUND`.
4.3. WHILE a task already has an active (not ended) session THE SYSTEM SHALL reject a new session for any task with `409` and error code `SESSION_ACTIVE`.
4.4. WHEN a client stops the active session THE SYSTEM SHALL set `endedAt` to now, compute `durationMinutes` (rounded to the nearest minute, minimum 1), and respond `200`.
4.5. IF a client stops a session when none is active THEN THE SYSTEM SHALL respond `409` with error code `NO_ACTIVE_SESSION`.

## Requirement 5 — Daily stats
**User story:** As a user, I want a daily summary, so that I can see my output and focus
at a glance.

#### Acceptance criteria
5.1. WHEN a client GETs stats for a given date THE SYSTEM SHALL respond `200` with the count of tasks completed on that date and the total focused minutes from sessions that ended on that date.
5.2. WHERE no date is supplied THE SYSTEM SHALL default to the current UTC date.
5.3. THE SYSTEM SHALL compute date boundaries in UTC so results are stable regardless of server locale.
5.4. IF the supplied date is not a valid `YYYY-MM-DD` value THEN THE SYSTEM SHALL respond `400` with error code `VALIDATION_ERROR`.

## Requirement 6 — Consistent errors & operability
**User story:** As a client developer, I want predictable errors and a health check, so
that I can build against the API confidently.

#### Acceptance criteria
6.1. THE SYSTEM SHALL return all errors as `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
6.2. WHEN a client requests an unknown route THE SYSTEM SHALL respond `404` with error code `NOT_FOUND`.
6.3. IF an unexpected error occurs THEN THE SYSTEM SHALL respond `500` with error code `INTERNAL_ERROR` and SHALL NOT leak stack traces in the response body.
6.4. WHEN a client GETs `/health` THE SYSTEM SHALL respond `200` with `{ "status": "ok" }`.

---

## Non-functional requirements
- **Deterministic time:** all "now" reads go through an injectable clock so tests are stable.
- **No native dependencies:** the project must `npm install` cleanly on Windows, macOS, and Linux.
- **Test coverage:** every requirement above must be covered by at least one automated test.

## Traceability
Each acceptance criterion is referenced by id (e.g. `4.4`) in `design.md` and `tasks.md`,
so any change can be traced from requirement → design → implementation task → test.
