import { describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { fixedClock } from "../../src/lib/clock.js";
import type { Task } from "../../src/domain/task.js";
import type {
  TaskListFilter,
  TaskRepository,
} from "../../src/repositories/task-repository.js";

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

/**
 * A recognizable string that, if it ever appeared in a response body, would
 * prove the server leaked an internal error message. It mimics the shape of a
 * stack frame so the "no stack trace" assertion is meaningful (6.3).
 */
const INTERNAL_DETAIL = "boom: secret internal detail at Repository.list";

/**
 * A repository whose methods always throw. Injected via `buildApp` deps so an
 * ordinary GET turns into an unexpected server-side fault, without having to
 * modify production wiring or register a throwing route.
 */
class ExplodingTaskRepository implements TaskRepository {
  create(): Task {
    throw new Error(INTERNAL_DETAIL);
  }
  list(_filter?: TaskListFilter): Task[] {
    throw new Error(INTERNAL_DETAIL);
  }
  getById(): Task | undefined {
    throw new Error(INTERNAL_DETAIL);
  }
  update(): Task {
    throw new Error(INTERNAL_DETAIL);
  }
  delete(): boolean {
    throw new Error(INTERNAL_DETAIL);
  }
}

function makeApp(): FastifyInstance {
  return buildApp({ clock: fixedClock("2026-08-11T10:00:00.000Z") });
}

/** Asserts a body conforms to the standard error envelope shape (6.1). */
function expectEnvelope(body: unknown): ErrorEnvelope {
  expect(body).toBeTypeOf("object");
  expect(body).not.toBeNull();
  const envelope = body as ErrorEnvelope;
  expect(envelope.error).toBeTypeOf("object");
  expect(envelope.error).not.toBeNull();
  expect(envelope.error.code).toBeTypeOf("string");
  expect(envelope.error.message).toBeTypeOf("string");
  // `details` is optional; when present it may be anything, but the only two
  // keys allowed alongside it are `code` and `message`.
  expect(Object.keys(envelope.error).sort()).toEqual(
    Object.keys(envelope.error).includes("details")
      ? ["code", "details", "message"]
      : ["code", "message"],
  );
  return envelope;
}

describe("error handling — unexpected faults (6.3)", () => {
  it("returns a generic 500 INTERNAL_ERROR without leaking the message or stack", async () => {
    const app = buildApp({ taskRepository: new ExplodingTaskRepository() });

    const res = await app.inject({ method: "GET", url: "/tasks" });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });

    // The raw thrown message and any stack-trace markers must never reach the
    // client (6.3).
    expect(res.payload).not.toContain(INTERNAL_DETAIL);
    expect(res.payload).not.toContain("boom");
    expect(res.payload.toLowerCase()).not.toContain("stack");
    expect(res.payload).not.toMatch(/\n\s+at\s/);
  });
});

describe("error handling — malformed requests (6.1)", () => {
  it("maps a malformed JSON body to a 400 VALIDATION_ERROR envelope", async () => {
    const app = makeApp();

    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { "content-type": "application/json" },
      payload: "{ not valid json ",
    });

    expect(res.statusCode).toBe(400);
    const envelope = expectEnvelope(res.json());
    expect(envelope.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps an unsupported content type to a 400 VALIDATION_ERROR envelope", async () => {
    const app = makeApp();

    const res = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { "content-type": "application/xml" },
      payload: "<task><title>hi</title></task>",
    });

    expect(res.statusCode).toBe(400);
    const envelope = expectEnvelope(res.json());
    expect(envelope.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("error handling — unknown routes (6.2)", () => {
  it("returns a 404 NOT_FOUND envelope for an unmatched route", async () => {
    const app = makeApp();

    const res = await app.inject({ method: "GET", url: "/does/not/exist" });

    expect(res.statusCode).toBe(404);
    const envelope = expectEnvelope(res.json());
    expect(envelope.error.code).toBe("NOT_FOUND");
  });
});

describe("error handling — every error path conforms to the envelope (6.1)", () => {
  it("emits code:string, message:string, optional details across all error paths", async () => {
    const app = makeApp();

    const cases = [
      // Zod validation (empty title) -> 400 VALIDATION_ERROR + details.
      await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "   " },
      }),
      // Domain not-found -> 404 NOT_FOUND.
      await app.inject({ method: "GET", url: "/tasks/missing" }),
      // Stop with no active session -> 409 NO_ACTIVE_SESSION.
      await app.inject({ method: "POST", url: "/sessions/active/stop" }),
      // Invalid stats date -> 400 VALIDATION_ERROR.
      await app.inject({ method: "GET", url: "/stats?date=2026-13-40" }),
      // Unknown route -> 404 NOT_FOUND.
      await app.inject({ method: "GET", url: "/nope" }),
    ];

    for (const res of cases) {
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expectEnvelope(res.json());
    }
  });
});
