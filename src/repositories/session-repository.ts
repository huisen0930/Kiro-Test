import type { FocusSession } from "../domain/session.js";

/**
 * Storage boundary for focus sessions. Routes depend on this interface, never
 * on a concrete store, so the in-memory implementation today can be swapped for
 * a durable one (e.g. SQLite) later without touching route code (see tasks.md #11).
 *
 * The single global "active session" model (design.md) means at most one stored
 * session has a null `endedAt` at any time; `getActive()` surfaces it so the
 * route layer can enforce the 409 rules (4.3, 4.5) while the domain stays pure.
 */
export interface SessionRepository {
  create(session: FocusSession): FocusSession;
  /** The one session that has not ended yet, or undefined if none is active. */
  getActive(): FocusSession | undefined;
  update(session: FocusSession): FocusSession;
  /** All sessions, so daily stats can sum durations by `endedAt` (5.1). */
  list(): FocusSession[];
}
