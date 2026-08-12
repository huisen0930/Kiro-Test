import { createRequire } from "node:module";
import { describe, it, expect, beforeEach } from "vitest";
import {
  applyUpdate,
  completeTask,
  createTask,
} from "../../src/domain/task.js";
import { startSession, stopSession } from "../../src/domain/session.js";
import { fixedClock } from "../../src/lib/clock.js";
import { SqliteTaskRepository } from "../../src/repositories/sqlite-task-repository.js";
import { SqliteSessionRepository } from "../../src/repositories/sqlite-session-repository.js";

/**
 * `node:sqlite` requires Node 22.5+ (unflagged on Node 24; behind
 * `--experimental-sqlite` on Node 22). Two wrinkles are handled here:
 *   1. Vitest (via vite) doesn't recognize `node:sqlite` as a builtin to
 *      externalize, so a bare `import("node:sqlite")` fails under the runner.
 *      Loading it through Node's real `require` sidesteps the transform.
 *   2. Where the module is unavailable, we skip cleanly instead of crashing.
 * CI sets NODE_OPTIONS=--experimental-sqlite so both matrix legs run these tests.
 */
const nodeRequire = createRequire(import.meta.url);
let DatabaseSync: typeof import("node:sqlite").DatabaseSync | undefined;
try {
  ({ DatabaseSync } = nodeRequire(
    "node:sqlite",
  ) as typeof import("node:sqlite"));
} catch {
  DatabaseSync = undefined;
}

/** Fresh in-memory database per test → full isolation, no file cleanup. */
function makeDb(): import("node:sqlite").DatabaseSync {
  if (!DatabaseSync) throw new Error("node:sqlite unavailable");
  return new DatabaseSync(":memory:");
}

describe.skipIf(!DatabaseSync)("SqliteTaskRepository", () => {
  let repo: SqliteTaskRepository;

  beforeEach(() => {
    repo = new SqliteTaskRepository(makeDb());
  });

  it("round-trips a task through create + getById (tags + null completedAt)", () => {
    const task = createTask(
      { title: "Write docs", tags: ["Docs", "docs", "Writing"] },
      fixedClock("2026-08-11T10:00:00.000Z"),
    );
    repo.create(task);

    expect(repo.getById(task.id)).toEqual(task);
    // Domain-normalized tags survive the JSON round-trip through SQLite (1.4).
    expect(repo.getById(task.id)?.tags).toEqual(["docs", "writing"]);
  });

  it("returns undefined for an unknown id", () => {
    expect(repo.getById("does-not-exist")).toBeUndefined();
  });

  it("lists newest-first by createdAt", () => {
    const older = createTask(
      { title: "older" },
      fixedClock("2026-08-10T09:00:00.000Z"),
    );
    const newer = createTask(
      { title: "newer" },
      fixedClock("2026-08-11T09:00:00.000Z"),
    );
    repo.create(older);
    repo.create(newer);

    expect(repo.list().map((t) => t.title)).toEqual(["newer", "older"]);
  });

  it("uses insertion order as a stable tie-break when createdAt collides", () => {
    const clock = fixedClock("2026-08-11T10:00:00.000Z");
    repo.create(createTask({ title: "first" }, clock));
    repo.create(createTask({ title: "second" }, clock));

    expect(repo.list().map((t) => t.title)).toEqual(["second", "first"]);
  });

  it("filters by status", () => {
    const clock = fixedClock("2026-08-11T10:00:00.000Z");
    repo.create(createTask({ title: "open one" }, clock));
    repo.create(completeTask(createTask({ title: "done one" }, clock), clock));

    expect(repo.list({ status: "done" }).map((t) => t.title)).toEqual([
      "done one",
    ]);
    expect(repo.list({ status: "open" }).map((t) => t.title)).toEqual([
      "open one",
    ]);
  });

  it("filters by tag against the stored JSON array", () => {
    const clock = fixedClock("2026-08-11T10:00:00.000Z");
    repo.create(createTask({ title: "a", tags: ["work"] }, clock));
    repo.create(createTask({ title: "b", tags: ["home"] }, clock));

    expect(repo.list({ tag: "work" }).map((t) => t.title)).toEqual(["a"]);
  });

  it("persists updates to title, tags, status, and completedAt", () => {
    const clock = fixedClock("2026-08-11T10:00:00.000Z");
    const task = createTask({ title: "draft", tags: ["x"] }, clock);
    repo.create(task);

    const updated = completeTask(
      applyUpdate(task, { title: "final", tags: ["y"] }),
      clock,
    );
    repo.update(updated);

    expect(repo.getById(task.id)).toEqual(updated);
  });

  it("deletes a task and reports whether a row was removed", () => {
    const task = createTask(
      { title: "temp" },
      fixedClock("2026-08-11T10:00:00.000Z"),
    );
    repo.create(task);

    expect(repo.delete(task.id)).toBe(true);
    expect(repo.getById(task.id)).toBeUndefined();
    expect(repo.delete(task.id)).toBe(false);
  });
});

describe.skipIf(!DatabaseSync)("SqliteSessionRepository", () => {
  let repo: SqliteSessionRepository;

  beforeEach(() => {
    repo = new SqliteSessionRepository(makeDb());
  });

  it("creates an active session and surfaces it via getActive", () => {
    const session = startSession(
      "task-1",
      fixedClock("2026-08-11T10:00:00.000Z"),
    );
    repo.create(session);

    expect(repo.getActive()).toEqual(session);
  });

  it("returns undefined from getActive when none is active", () => {
    expect(repo.getActive()).toBeUndefined();
  });

  it("clears the active session once stopped and persists the duration (4.4)", () => {
    const session = startSession(
      "task-1",
      fixedClock("2026-08-11T10:00:00.000Z"),
    );
    repo.create(session);

    const stopped = stopSession(
      session,
      fixedClock("2026-08-11T10:25:30.000Z"),
    );
    repo.update(stopped);

    expect(repo.getActive()).toBeUndefined();
    expect(repo.list()).toEqual([stopped]);
    expect(repo.list().at(0)?.durationMinutes).toBe(26); // 25.5 min rounds up to 26
  });

  it("lists sessions in insertion order", () => {
    const s1 = startSession("t1", fixedClock("2026-08-11T10:00:00.000Z"));
    repo.create(s1);
    // Stop the first so a second can start (single-active rule lives at the route layer).
    repo.update(stopSession(s1, fixedClock("2026-08-11T10:30:00.000Z")));
    repo.create(startSession("t2", fixedClock("2026-08-11T11:00:00.000Z")));

    expect(repo.list().map((s) => s.taskId)).toEqual(["t1", "t2"]);
  });
});
