import { describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { fixedClock, type Clock } from "../../src/lib/clock.js";
import type { Task } from "../../src/domain/task.js";
import type { DailyStats } from "../../src/domain/stats.js";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * A clock whose instant can be moved to any point in time, so tasks and
 * sessions can be stamped on specific UTC days and the stats assertions
 * (5.1-5.3) stay exact.
 */
function settableClock(startIso: string): Clock & { set(iso: string): void } {
  let current = new Date(startIso);
  return {
    now: () => current,
    set(iso: string) {
      current = new Date(iso);
    },
  };
}

async function createTask(
  app: FastifyInstance,
  payload: Record<string, unknown>,
): Promise<Task> {
  const res = await app.inject({ method: "POST", url: "/tasks", payload });
  return res.json() as Task;
}

const complete = (app: FastifyInstance, id: string) =>
  app.inject({ method: "POST", url: `/tasks/${id}/complete` });

const startSession = (app: FastifyInstance, id: string) =>
  app.inject({ method: "POST", url: `/tasks/${id}/sessions` });

const stopActiveSession = (app: FastifyInstance) =>
  app.inject({ method: "POST", url: "/sessions/active/stop" });

describe("GET /stats", () => {
  it("counts tasks completed and sums focused minutes for the UTC day (5.1, 5.3)", async () => {
    const clock = settableClock("2026-08-11T09:00:00.000Z");
    const app = buildApp({ clock });

    const a = await createTask(app, { title: "a" });
    const b = await createTask(app, { title: "b" });
    const c = await createTask(app, { title: "c" });

    // Two tasks completed on 2026-08-11 (one at each edge of the day).
    clock.set("2026-08-11T00:00:00.000Z");
    await complete(app, a.id);
    clock.set("2026-08-11T23:59:59.000Z");
    await complete(app, b.id);
    // A third completed just after midnight the next UTC day -> excluded.
    clock.set("2026-08-12T00:00:00.000Z");
    await complete(app, c.id);

    // Two sessions ending on 2026-08-11: 30 + 15 = 45 minutes.
    clock.set("2026-08-11T08:00:00.000Z");
    await startSession(app, a.id);
    clock.set("2026-08-11T08:30:00.000Z");
    await stopActiveSession(app);

    clock.set("2026-08-11T09:00:00.000Z");
    await startSession(app, b.id);
    clock.set("2026-08-11T09:15:00.000Z");
    await stopActiveSession(app);

    // A session that ends on the next UTC day -> excluded from 2026-08-11.
    clock.set("2026-08-12T00:01:00.000Z");
    await startSession(app, c.id);
    clock.set("2026-08-12T00:11:00.000Z");
    await stopActiveSession(app);

    const res = await app.inject({
      method: "GET",
      url: "/stats?date=2026-08-11",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json() as DailyStats).toEqual({
      date: "2026-08-11",
      completedTasks: 2,
      focusedMinutes: 45,
    });
  });

  it("defaults to the current UTC date when no date is supplied (5.2)", async () => {
    const clock = settableClock("2026-08-11T12:00:00.000Z");
    const app = buildApp({ clock });

    const task = await createTask(app, { title: "today" });
    await complete(app, task.id); // completed at 2026-08-11T12:00Z

    const res = await app.inject({ method: "GET", url: "/stats" });

    expect(res.statusCode).toBe(200);
    expect(res.json() as DailyStats).toEqual({
      date: "2026-08-11",
      completedTasks: 1,
      focusedMinutes: 0,
    });
  });

  it("returns zeroed stats for a day with no activity (5.1)", async () => {
    const app = buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });

    const res = await app.inject({
      method: "GET",
      url: "/stats?date=2020-01-01",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json() as DailyStats).toEqual({
      date: "2020-01-01",
      completedTasks: 0,
      focusedMinutes: 0,
    });
  });

  it("rejects a malformed date with 400 VALIDATION_ERROR (5.4)", async () => {
    const app = buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });

    const res = await app.inject({
      method: "GET",
      url: "/stats?date=not-a-date",
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an impossible calendar date with 400 VALIDATION_ERROR (5.4)", async () => {
    const app = buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });

    const res = await app.inject({
      method: "GET",
      url: "/stats?date=2026-13-40",
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });
});
