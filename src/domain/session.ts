import { newId } from "../lib/id.js";
import type { Clock } from "../lib/clock.js";

export interface FocusSession {
  id: string;
  taskId: string;
  startedAt: string; // ISO-8601 UTC
  endedAt: string | null;
  durationMinutes: number | null; // set on stop, >= 1 (4.4)
}

/**
 * Builds a new, active focus session for a task (requirement 4.1): `startedAt`
 * is stamped from the clock, `endedAt` is null, and `durationMinutes` is not
 * known until the session is stopped. Pure: the caller is responsible for
 * persisting the result and for enforcing the single-active-session rule (4.3).
 */
export function startSession(taskId: string, clock: Clock): FocusSession {
  return {
    id: newId(),
    taskId,
    startedAt: clock.now().toISOString(),
    endedAt: null,
    durationMinutes: null,
  };
}

/**
 * Returns a copy of the session marked as stopped (requirement 4.4): `endedAt`
 * is stamped from the clock and `durationMinutes` is the elapsed wall time from
 * `startedAt` to `endedAt` rounded to the nearest minute, with a minimum of 1
 * (so any session, however brief, counts as at least one focused minute).
 */
export function stopSession(session: FocusSession, clock: Clock): FocusSession {
  const endedAt = clock.now();
  const elapsedMs = endedAt.getTime() - new Date(session.startedAt).getTime();
  const durationMinutes = Math.max(1, Math.round(elapsedMs / 60_000));
  return {
    ...session,
    endedAt: endedAt.toISOString(),
    durationMinutes,
  };
}
