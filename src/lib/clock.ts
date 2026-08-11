/**
 * An injectable source of "now". Injecting the clock (instead of calling
 * `new Date()` directly) makes time-dependent behavior deterministic in tests
 * and keeps UTC stats stable regardless of server locale (requirement 5.3).
 */
export interface Clock {
  now(): Date;
}

/** The real wall clock used in production. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock frozen at a fixed instant, for deterministic tests. */
export function fixedClock(iso: string): Clock {
  const instant = new Date(iso);
  return { now: () => instant };
}
