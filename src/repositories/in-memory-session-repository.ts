import type { FocusSession } from "../domain/session.js";
import type { SessionRepository } from "./session-repository.js";

/**
 * In-memory focus-session store. Under the single global active-session rule
 * (design.md) at most one stored session has a null `endedAt`, so `getActive()`
 * returns the first (and only) not-ended session, or undefined when none is
 * active. Insertion order is preserved for stable `list()` results.
 */
export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, FocusSession>();

  create(session: FocusSession): FocusSession {
    this.sessions.set(session.id, session);
    return session;
  }

  getActive(): FocusSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.endedAt === null) return session;
    }
    return undefined;
  }

  update(session: FocusSession): FocusSession {
    this.sessions.set(session.id, session);
    return session;
  }

  list(): FocusSession[] {
    return [...this.sessions.values()];
  }
}
