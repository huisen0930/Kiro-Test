import { describe, it, expect } from "vitest";
import { startSession, stopSession, type FocusSession } from "../../src/domain/session.js";
import { fixedClock } from "../../src/lib/clock.js";
import { InMemorySessionRepository } from "../../src/repositories/in-memory-session-repository.js";

const START = "2026-08-11T10:00:00.000Z";

/** Builds an active session pinned to START, independent of id randomness. */
function activeSessionAt(startIso: string): FocusSession {
  return startSession("task-1", fixedClock(startIso));
}

/** Stops an active session `seconds` after it started, using a fixed clock. */
function stopAfterSeconds(session: FocusSession, seconds: number): FocusSession {
  const endMs = new Date(session.startedAt).getTime() + seconds * 1000;
  return stopSession(session, fixedClock(new Date(endMs).toISOString()));
}

describe("startSession (4.1)", () => {
  it("creates an active session with startedAt now, endedAt null, no duration", () => {
    const session = startSession("task-1", fixedClock(START));
    expect(session.taskId).toBe("task-1");
    expect(session.startedAt).toBe(START);
    expect(session.endedAt).toBeNull();
    expect(session.durationMinutes).toBeNull();
    expect(session.id).toBeTruthy();
  });
});

describe("stopSession duration rounding (4.4)", () => {
  it("stamps endedAt and rounds to the nearest minute", () => {
    const stopped = stopAfterSeconds(activeSessionAt(START), 90);
    expect(stopped.endedAt).toBe("2026-08-11T10:01:30.000Z");
    expect(stopped.durationMinutes).toBe(2); // 90s = 1.5 min -> rounds to 2
  });

  it.each([
    { seconds: 0, expected: 1, note: "zero elapsed -> minimum 1" },
    { seconds: 5, expected: 1, note: "sub-30s -> minimum 1" },
    { seconds: 30, expected: 1, note: "30s = 0.5 min -> minimum 1" },
    { seconds: 90, expected: 2, note: "90s = 1.5 min -> 2" },
    { seconds: 149, expected: 2, note: "2m29s -> 2" },
    { seconds: 150, expected: 3, note: "2m30s -> 3" },
    { seconds: 300, expected: 5, note: "exact 5 min -> 5" },
  ])("$note ($seconds s -> $expected min)", ({ seconds, expected }) => {
    const stopped = stopAfterSeconds(activeSessionAt(START), seconds);
    expect(stopped.durationMinutes).toBe(expected);
  });

  it("never mutates the original session", () => {
    const active = activeSessionAt(START);
    stopAfterSeconds(active, 300);
    expect(active.endedAt).toBeNull();
    expect(active.durationMinutes).toBeNull();
  });
});

describe("single global active-session rule (4.3)", () => {
  it("getActive returns undefined when no sessions exist", () => {
    const repo = new InMemorySessionRepository();
    expect(repo.getActive()).toBeUndefined();
  });

  it("getActive returns the active session after one is created", () => {
    const repo = new InMemorySessionRepository();
    const created = repo.create(activeSessionAt(START));
    expect(repo.getActive()).toEqual(created);
  });

  it("getActive returns undefined again once the active session is stopped", () => {
    const repo = new InMemorySessionRepository();
    const created = repo.create(activeSessionAt(START));
    repo.update(stopAfterSeconds(created, 300));
    expect(repo.getActive()).toBeUndefined();
  });

  it("exposes only the not-ended session as active among many stored sessions", () => {
    const repo = new InMemorySessionRepository();
    const first = repo.create(activeSessionAt(START));
    repo.update(stopAfterSeconds(first, 300));
    const second = repo.create(activeSessionAt("2026-08-11T11:00:00.000Z"));

    const active = repo.getActive();
    expect(active).toEqual(second);
    expect(repo.list()).toHaveLength(2);
  });
});
