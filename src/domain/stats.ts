import type { Clock } from "../lib/clock.js";
import type { Task } from "./task.js";
import type { FocusSession } from "./session.js";

/**
 * A day's rollup (requirement 5.1): how many tasks were completed and how many
 * focused minutes were logged within a single UTC calendar day. `date` echoes
 * the day the numbers describe as a `YYYY-MM-DD` string.
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD (UTC)
  completedTasks: number;
  focusedMinutes: number;
}

/**
 * A half-open UTC day window `[start, end)` — start is inclusive, end is
 * exclusive — so each instant belongs to exactly one day and boundaries never
 * double-count (requirement 5.3).
 */
export interface UtcDayWindow {
  start: Date; // date 00:00:00.000Z (inclusive)
  end: Date; // date+1 00:00:00.000Z (exclusive)
}

/**
 * The current calendar date in UTC (`YYYY-MM-DD`) derived from the injected
 * clock. Used to default the stats window when no explicit date is supplied
 * (requirement 5.2); reading through the clock keeps this deterministic in
 * tests and independent of server locale.
 */
export function currentUtcDate(clock: Clock): string {
  return clock.now().toISOString().slice(0, 10);
}

/**
 * Computes the UTC day window for a `YYYY-MM-DD` date (requirement 5.3). The
 * window runs from midnight UTC on `date` up to — but not including — midnight
 * UTC the next day. Adding 24h in milliseconds is exact here because UTC has no
 * daylight-saving shifts.
 */
export function utcDayWindow(date: string): UtcDayWindow {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** True when an ISO-8601 instant falls inside the half-open window `[start, end)`. */
function fallsWithin(iso: string | null, window: UtcDayWindow): boolean {
  if (iso === null) return false;
  const instant = new Date(iso).getTime();
  return instant >= window.start.getTime() && instant < window.end.getTime();
}

/**
 * Rolls tasks and sessions up into a single day's stats (requirements 5.1, 5.3).
 * A task counts when its `completedAt` falls in the UTC window; a session's
 * `durationMinutes` is summed when its `endedAt` falls in the window (so a
 * session that spans midnight is attributed to the day it *ended*). Pure: it
 * reads the supplied collections and never mutates them.
 */
export function computeDailyStats(
  date: string,
  tasks: readonly Task[],
  sessions: readonly FocusSession[],
): DailyStats {
  const window = utcDayWindow(date);

  const completedTasks = tasks.filter((task) =>
    fallsWithin(task.completedAt, window),
  ).length;

  const focusedMinutes = sessions.reduce((total, session) => {
    if (!fallsWithin(session.endedAt, window)) return total;
    return total + (session.durationMinutes ?? 0);
  }, 0);

  return { date, completedTasks, focusedMinutes };
}
