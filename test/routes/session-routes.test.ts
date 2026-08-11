import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { fixedClock, type Clock } from "../../src/lib/clock.js";
import type { Task } from "../../src/domain/task.js";
import type { FocusSession } from "../../src/domain/session.js";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * A clock whose instant can be advanced between calls, so start/stop timing is
 * deterministic and duration assertions (4.4) are exact.
 */
function advanceableClock(startIso: string): Clock & {
  advanceSeconds(seconds: number): void;
} {
  let current = new Date(startIso).getTime();
  return {
    now: () => new Date(current),
    advanceSeconds(seconds: number) {
      current += seconds * 1000;
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

describe("POST /tasks/:id/sessions", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });
  });

  it("starts an active session for an existing task (4.1)", async () => {
    const task = await createTask(app, { title: "focus me" });
    const res = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/sessions`,
    });
    expect(res.statusCode).toBe(201);
    const session = res.json() as FocusSession;
    expect(session.taskId).toBe(task.id);
    expect(session.startedAt).toBe("2026-08-11T10:00:00.000Z");
    expect(session.endedAt).toBeNull();
    expect(session.durationMinutes).toBeNull();
    expect(session.id).toBeTruthy();
  });

  it("returns 404 with NOT_FOUND for an unknown task (4.2)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks/does-not-exist/sessions",
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as ErrorBody).error.code).toBe("NOT_FOUND");
  });

  it("rejects a second session for the same task while one is active (4.3)", async () => {
    const task = await createTask(app, { title: "focus me" });
    await app.inject({ method: "POST", url: `/tasks/${task.id}/sessions` });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/sessions`,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as ErrorBody).error.code).toBe("SESSION_ACTIVE");
  });

  it("rejects a session for a different task while one is active (4.3)", async () => {
    const first = await createTask(app, { title: "first" });
    const second = await createTask(app, { title: "second" });
    await app.inject({ method: "POST", url: `/tasks/${first.id}/sessions` });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/${second.id}/sessions`,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as ErrorBody).error.code).toBe("SESSION_ACTIVE");
  });
});

describe("POST /sessions/active/stop", () => {
  it("stops the active session and computes rounded duration (4.4)", async () => {
    const clock = advanceableClock("2026-08-11T10:00:00.000Z");
    const app = buildApp({ clock });
    const task = await createTask(app, { title: "focus me" });

    const started = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/sessions`,
    });
    expect(started.statusCode).toBe(201);

    clock.advanceSeconds(90); // 1.5 min -> rounds to 2
    const stopped = await app.inject({
      method: "POST",
      url: "/sessions/active/stop",
    });
    expect(stopped.statusCode).toBe(200);
    const session = stopped.json() as FocusSession;
    expect(session.taskId).toBe(task.id);
    expect(session.endedAt).toBe("2026-08-11T10:01:30.000Z");
    expect(session.durationMinutes).toBe(2);
  });

  it("rounds a sub-minute session up to the minimum of 1 (4.4)", async () => {
    const clock = advanceableClock("2026-08-11T10:00:00.000Z");
    const app = buildApp({ clock });
    const task = await createTask(app, { title: "quick" });
    await app.inject({ method: "POST", url: `/tasks/${task.id}/sessions` });

    clock.advanceSeconds(10); // < 30s would round to 0 -> clamped to 1
    const stopped = await app.inject({
      method: "POST",
      url: "/sessions/active/stop",
    });
    expect(stopped.statusCode).toBe(200);
    expect((stopped.json() as FocusSession).durationMinutes).toBe(1);
  });

  it("returns 409 with NO_ACTIVE_SESSION when none is active (4.5)", async () => {
    const app = buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });
    const res = await app.inject({
      method: "POST",
      url: "/sessions/active/stop",
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as ErrorBody).error.code).toBe("NO_ACTIVE_SESSION");
  });

  it("allows a new session after the active one is stopped (4.3 releases on stop)", async () => {
    const clock = advanceableClock("2026-08-11T10:00:00.000Z");
    const app = buildApp({ clock });
    const task = await createTask(app, { title: "focus me" });

    await app.inject({ method: "POST", url: `/tasks/${task.id}/sessions` });
    clock.advanceSeconds(60);
    const stopped = await app.inject({
      method: "POST",
      url: "/sessions/active/stop",
    });
    expect(stopped.statusCode).toBe(200);

    const restarted = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/sessions`,
    });
    expect(restarted.statusCode).toBe(201);
    expect((restarted.json() as FocusSession).endedAt).toBeNull();
  });
});
