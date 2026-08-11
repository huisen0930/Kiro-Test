import { describe, it, expect } from "vitest";
import {
  computeDailyStats,
  currentUtcDate,
  utcDayWindow,
} from "../../src/domain/stats.js";
import { fixedClock } from "../../src/lib/clock.js";
import type { Task } from "../../src/domain/task.js";
import type { FocusSession } from "../../src/domain/session.js";

/** A done/open task pinned to a given `completedAt` (id kept unique for realism). */
function taskCompletedAt(completedAt: string | null): Task {
  return {
    id: `task-${completedAt ?? "open"}`,
    title: "t",
    tags: [],
    status: completedAt ? "done" : "open",
    createdAt: "2026-08-01T00:00:00.000Z",
    completedAt,
  };
}

/** A session pinned to a given `endedAt` + duration (null endedAt = still active). */
function sessionEndedAt(
  endedAt: string | null,
  durationMinutes: number | null,
): FocusSession {
  return {
    id: `session-${endedAt ?? "active"}`,
    taskId: "task-1",
    startedAt: "2026-08-11T00:00:00.000Z",
    endedAt,
    durationMinutes,
  };
}

describe("utcDayWindow (5.3)", () => {
  it("spans [date 00:00Z, next day 00:00Z)", () => {
    const { start, end } = utcDayWindow("2026-08-11");
    expect(start.toISOString()).toBe("2026-08-11T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("rolls to the next month across a month boundary", () => {
    const { start, end } = utcDayWindow("2026-08-31");
    expect(start.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("currentUtcDate (5.2)", () => {
  it("derives the UTC calendar date from the injected clock", () => {
    expect(currentUtcDate(fixedClock("2026-08-11T23:59:59.999Z"))).toBe(
      "2026-08-11",
    );
    expect(currentUtcDate(fixedClock("2026-08-12T00:00:00.000Z"))).toBe(
      "2026-08-12",
    );
  });
});

describe("computeDailyStats (5.1, 5.3)", () => {
  it("counts only tasks completed within the UTC window", () => {
    const tasks = [
      taskCompletedAt("2026-08-11T00:00:00.000Z"), // lower bound: included
      taskCompletedAt("2026-08-11T12:00:00.000Z"), // mid-day: included
      taskCompletedAt("2026-08-11T23:59:59.999Z"), // last instant: included
      taskCompletedAt("2026-08-12T00:00:00.000Z"), // upper bound: excluded
      taskCompletedAt("2026-08-10T23:59:59.999Z"), // day before: excluded
      taskCompletedAt(null), // never completed: excluded
    ];

    const stats = computeDailyStats("2026-08-11", tasks, []);

    expect(stats.completedTasks).toBe(3);
    expect(stats.focusedMinutes).toBe(0);
  });

  it("sums focused minutes for sessions keyed by endedAt, within the window", () => {
    const sessions = [
      sessionEndedAt("2026-08-11T00:00:00.000Z", 10), // lower bound: included
      sessionEndedAt("2026-08-11T23:59:59.999Z", 25), // last instant: included
      sessionEndedAt("2026-08-12T00:00:00.000Z", 100), // upper bound: excluded
      sessionEndedAt("2026-08-12T00:10:00.000Z", 50), // ended next day: excluded
      sessionEndedAt(null, null), // still active: excluded
    ];

    const stats = computeDailyStats("2026-08-11", [], sessions);

    expect(stats.completedTasks).toBe(0);
    expect(stats.focusedMinutes).toBe(35);
  });

  it("echoes the requested date and zeros when nothing matches", () => {
    const stats = computeDailyStats(
      "2020-01-01",
      [taskCompletedAt("2026-08-11T12:00:00.000Z")],
      [sessionEndedAt("2026-08-11T12:00:00.000Z", 30)],
    );

    expect(stats).toEqual({
      date: "2020-01-01",
      completedTasks: 0,
      focusedMinutes: 0,
    });
  });
});
