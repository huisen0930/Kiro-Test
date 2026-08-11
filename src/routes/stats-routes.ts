import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../lib/clock.js";
import type { TaskRepository } from "../repositories/task-repository.js";
import type { SessionRepository } from "../repositories/session-repository.js";
import { computeDailyStats, currentUtcDate } from "../domain/stats.js";
import { statsQuerySchema } from "../schemas/stats-schemas.js";

export interface StatsRoutesOptions {
  taskRepository: TaskRepository;
  sessionRepository: SessionRepository;
  clock: Clock;
}

/**
 * Daily-stats route (requirements 5.x). Validates the optional `date` query with
 * Zod (invalid dates become a `VALIDATION_ERROR` via the central handler, 5.4),
 * defaults to the current UTC date when none is given (5.2), and delegates the
 * UTC window math to the pure domain layer (5.1, 5.3).
 */
export const registerStatsRoutes: FastifyPluginAsync<
  StatsRoutesOptions
> = async (app, options) => {
  const { taskRepository, sessionRepository, clock } = options;

  // 5.1–5.4
  app.get("/stats", async (request) => {
    const { date } = statsQuerySchema.parse(request.query);
    // 5.2: fall back to the current UTC date derived from the injected clock.
    const targetDate = date ?? currentUtcDate(clock);
    // 5.1, 5.3: count completed tasks and sum focused minutes in the UTC window.
    return computeDailyStats(
      targetDate,
      taskRepository.list(),
      sessionRepository.list(),
    );
  });
};
