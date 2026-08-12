---
name: test-driven-development
description: TDD for new FocusFlow logic — write Vitest tests first, then implement to make them pass. Covers pure domain functions and Fastify route behavior via buildApp + app.inject.
---

# test-driven-development — TDD for New Logic

Apply test-driven development when implementing new logic. Write failing tests first, then implement the minimum code to make them pass, then refactor.

## When to Use

- When implementing new domain functions, route behavior, or repository methods
- When fixing a bug (write a test that reproduces it first)
- When the user explicitly asks for a TDD approach
- During `/issue-impl` step 5 (Tests)

## Test Infrastructure

- **Location:** `test/`, mirroring `src/` (e.g., `test/domain/task.test.ts`, `test/routes/task-routes.test.ts`)
- **Framework:** Vitest — `describe` / `it` / `expect`
- **Test doubles:** plain fakes or `vi.fn()`; the in-memory repositories are the default fake for route tests; inject a `fixedClock(...)` for deterministic time
- **Run command:** `npm test` (single run). Watch mode is `npm run test:watch` (run it in your own terminal).

## TDD Cycle

### 1. RED — Write Failing Tests

**Domain (pure logic):**

```ts
import { describe, it, expect } from "vitest";
import { completeTask } from "../../src/domain/task.js";

describe("completeTask", () => {
  it("marks an open task completed and stamps completedAt", () => {
    const task = makeTask({ status: "open" });
    const result = completeTask(task, "2024-01-01T00:00:00.000Z");
    expect(result.status).toBe("completed");
    expect(result.completedAt).toBe("2024-01-01T00:00:00.000Z");
  });
});
```

**Route (HTTP contract via `app.inject`):**

```ts
import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/app.js";
import { fixedClock } from "../helpers.js";

describe("POST /sessions", () => {
  it("returns 409 NO_ACTIVE_SESSION when stopping with no active session", async () => {
    const app = buildApp({ clock: fixedClock("2024-01-01T00:00:00.000Z") });
    const res = await app.inject({ method: "POST", url: "/sessions/stop" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("NO_ACTIVE_SESSION");
  });
});
```

### 2. GREEN — Implement Minimum Code

- Write just enough code (in `domain/`, then wire it through `routes/` + `app.ts`) to make the test pass
- Don't over-engineer; satisfy the test, nothing more
- Run the test to confirm it passes

### 3. REFACTOR — Clean Up

- Remove duplication
- Improve naming
- Extract helpers if needed
- Run all tests to confirm nothing broke

## Test Naming Convention

Behavior-focused titles — describe the observable outcome, not the method signature.

Examples:
- `returns 409 when a session is already active`
- `rolls completed tasks and focused minutes into the correct UTC day`
- `rejects a body missing "title" with 400 VALIDATION_ERROR`
- `completing an already-completed task is idempotent`

## What to Test

| Layer | What to test | What NOT to test |
|-------|-------------|-----------------|
| Domain | State transitions, validation, calculations (pure functions) | Trivial getters/setters |
| Routes | Status codes, error envelope shape, response body, Zod validation of body/params/query | Fastify internals |
| Repositories | Interface conformance for BOTH in-memory and `node:sqlite` impls | The SQLite engine itself |
| Lib | `clock`, `id`, `errors` helpers (parsing, formatting, mapping) | Framework/runtime methods |

## Fakes & Injection Patterns

```ts
// Fixed clock so time-based stats are deterministic
const clock = fixedClock("2024-01-01T09:00:00.000Z");
const app = buildApp({ clock });

// A plain fake repository (satisfies the interface) when you need to force a branch
const failingRepo: TaskRepository = {
  ...inMemoryTaskRepository(),
  findById: vi.fn().mockReturnValue(undefined),
};

// Drive the HTTP contract without opening a port
const res = await app.inject({
  method: "POST",
  url: "/tasks",
  payload: { title: "Write the spec" },
});
expect(res.statusCode).toBe(201);
```

## Rules

- Every new domain function or route behavior gets at least one test
- Test the happy path AND at least one error/edge case (a validation failure, a `409`, or a not-found)
- Isolate every test — build a fresh app per route test so shared repo/clock state can't leak
- Never test private helpers directly — test through the public function or the HTTP contract
- If a test is hard to write, the code probably needs refactoring (often domain logic tangled with HTTP)
- Run `npm test` after each implementation step, not just at the end
- Test count should grow with each issue (never delete tests without justification)
