import { z } from "zod";

/**
 * A calendar date in `YYYY-MM-DD` form (requirement 5.4). The regex pins the
 * shape; the refinement rejects impossible dates (e.g. `2026-13-40`,
 * `2026-02-30`) by requiring the value to round-trip through a UTC `Date`
 * unchanged. Both failures surface as a `VALIDATION_ERROR` at the route.
 */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "date must be a valid calendar date");

/**
 * Query for `GET /stats`: an optional `date`. When omitted, the route defaults
 * to the current UTC date from the injected clock (requirement 5.2).
 */
export const statsQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;
