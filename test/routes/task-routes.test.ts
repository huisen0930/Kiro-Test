import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { fixedClock } from "../../src/lib/clock.js";
import type { Task } from "../../src/domain/task.js";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function makeApp(): FastifyInstance {
  return buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });
}

async function createTask(
  app: FastifyInstance,
  payload: Record<string, unknown>,
): Promise<Task> {
  const res = await app.inject({ method: "POST", url: "/tasks", payload });
  return res.json() as Task;
}

describe("POST /tasks", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = makeApp();
  });

  it("creates a task with normalized tags (1.1, 1.4)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Ship it", tags: ["Work", "work"] },
    });
    expect(res.statusCode).toBe(201);
    const task = res.json() as Task;
    expect(task.title).toBe("Ship it");
    expect(task.status).toBe("open");
    expect(task.tags).toEqual(["work"]);
    expect(task.completedAt).toBeNull();
  });

  it("rejects a whitespace-only title (1.2)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "   " },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a title longer than 200 characters (1.3)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "a".repeat(201) },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /tasks", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = makeApp();
  });

  it("lists newest-first and filters by tag and status (2.1-2.3)", async () => {
    const first = await createTask(app, { title: "first", tags: ["work"] });
    await createTask(app, { title: "second", tags: ["home"] });
    await app.inject({ method: "POST", url: `/tasks/${first.id}/complete` });

    const all = await app.inject({ method: "GET", url: "/tasks" });
    expect((all.json() as Task[]).map((t) => t.title)).toEqual([
      "second",
      "first",
    ]);

    const byTag = await app.inject({ method: "GET", url: "/tasks?tag=home" });
    expect((byTag.json() as Task[]).map((t) => t.title)).toEqual(["second"]);

    const done = await app.inject({ method: "GET", url: "/tasks?status=done" });
    expect((done.json() as Task[]).map((t) => t.title)).toEqual(["first"]);
  });

  it("returns 404 with NOT_FOUND for an unknown id (2.5)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/tasks/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as ErrorBody).error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH / complete / DELETE /tasks/:id", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = makeApp();
  });

  it("updates a task (3.1)", async () => {
    const task = await createTask(app, { title: "old" });
    const res = await app.inject({
      method: "PATCH",
      url: `/tasks/${task.id}`,
      payload: { title: "new", tags: ["Focus"] },
    });
    expect(res.statusCode).toBe(200);
    const updated = res.json() as Task;
    expect(updated.title).toBe("new");
    expect(updated.tags).toEqual(["focus"]);
  });

  it("completing is idempotent (3.2, 3.3)", async () => {
    const task = await createTask(app, { title: "finish me" });
    const first = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/complete`,
    });
    const second = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/complete`,
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect((first.json() as Task).completedAt).toBe(
      (second.json() as Task).completedAt,
    );
  });

  it("deletes a task then returns 404 (3.4, 3.5)", async () => {
    const task = await createTask(app, { title: "temp" });
    const del = await app.inject({
      method: "DELETE",
      url: `/tasks/${task.id}`,
    });
    expect(del.statusCode).toBe(204);

    const after = await app.inject({ method: "GET", url: `/tasks/${task.id}` });
    expect(after.statusCode).toBe(404);
  });

  it("returns 404 when completing an unknown task (3.5)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tasks/nope/complete",
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as ErrorBody).error.code).toBe("NOT_FOUND");
  });
});
