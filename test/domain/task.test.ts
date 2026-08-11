import { describe, it, expect } from "vitest";
import {
  applyUpdate,
  completeTask,
  createTask,
  normalizeTags,
} from "../../src/domain/task.js";
import { fixedClock } from "../../src/lib/clock.js";

const clock = fixedClock("2026-08-11T10:00:00.000Z");

describe("normalizeTags (1.4)", () => {
  it("lowercases, trims, and de-duplicates while keeping order", () => {
    expect(normalizeTags(["Work", " work ", "DEEP", "deep", "  "])).toEqual([
      "work",
      "deep",
    ]);
  });

  it("returns an empty array when tags are omitted", () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe("createTask (1.1, 1.4)", () => {
  it("creates an open task with trimmed title, normalized tags, and a timestamp", () => {
    const task = createTask({ title: "  Write the spec  ", tags: ["A", "a"] }, clock);
    expect(task.title).toBe("Write the spec");
    expect(task.tags).toEqual(["a"]);
    expect(task.status).toBe("open");
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBe("2026-08-11T10:00:00.000Z");
    expect(task.id).toBeTruthy();
  });
});

describe("completeTask (3.2, 3.3)", () => {
  it("marks an open task done and stamps completedAt", () => {
    const done = completeTask(createTask({ title: "x" }, clock), clock);
    expect(done.status).toBe("done");
    expect(done.completedAt).toBe("2026-08-11T10:00:00.000Z");
  });

  it("is idempotent: completing a done task leaves it unchanged", () => {
    const first = completeTask(createTask({ title: "x" }, clock), clock);
    const second = completeTask(first, fixedClock("2026-08-11T18:00:00.000Z"));
    expect(second).toBe(first);
    expect(second.completedAt).toBe(first.completedAt);
  });
});

describe("applyUpdate (3.1)", () => {
  it("updates title and tags, leaving other fields intact", () => {
    const task = createTask({ title: "old", tags: ["keep"] }, clock);
    const updated = applyUpdate(task, { title: "  new  ", tags: ["X", "x"] });
    expect(updated.title).toBe("new");
    expect(updated.tags).toEqual(["x"]);
    expect(updated.id).toBe(task.id);
    expect(updated.createdAt).toBe(task.createdAt);
  });

  it("leaves a field untouched when it is not provided", () => {
    const task = createTask({ title: "keep-me", tags: ["a"] }, clock);
    const updated = applyUpdate(task, { tags: ["b"] });
    expect(updated.title).toBe("keep-me");
    expect(updated.tags).toEqual(["b"]);
  });
});
