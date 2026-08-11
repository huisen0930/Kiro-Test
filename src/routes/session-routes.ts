import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../lib/clock.js";
import type { TaskRepository } from "../repositories/task-repository.js";
import type { SessionRepository } from "../repositories/session-repository.js";
import { noActiveSession, notFound, sessionActive } from "../lib/errors.js";
import { startSession, stopSession } from "../domain/session.js";
import { taskIdParamSchema } from "../schemas/task-schemas.js";

export interface SessionRoutesOptions {
  taskRepository: TaskRepository;
  sessionRepository: SessionRepository;
  clock: Clock;
}

/**
 * Focus-session routes (requirements 4.x). Handlers validate with Zod, delegate
 * timing rules to the pure domain layer, and enforce the single global
 * active-session model via the repository. All error paths throw `AppError`
 * so the central handler in app.ts renders the standard envelope.
 */
export const registerSessionRoutes: FastifyPluginAsync<
  SessionRoutesOptions
> = async (app, options) => {
  const { taskRepository, sessionRepository, clock } = options;

  // 4.1, 4.2, 4.3
  app.post("/tasks/:id/sessions", async (request, reply) => {
    const { id } = taskIdParamSchema.parse(request.params);

    // 4.2: task must exist. Check existence BEFORE the active-session rule so a
    // missing task yields 404, not 409.
    if (!taskRepository.getById(id)) throw notFound(`Task ${id} not found`);

    // 4.3: single global active-session model — any active session blocks a new one.
    if (sessionRepository.getActive()) throw sessionActive();

    // 4.1: start and persist the new active session.
    const session = sessionRepository.create(startSession(id, clock));
    return reply.status(201).send(session);
  });

  // 4.4, 4.5
  app.post("/sessions/active/stop", async () => {
    const active = sessionRepository.getActive();
    // 4.5: nothing to stop.
    if (!active) throw noActiveSession();

    // 4.4: stamp endedAt + compute durationMinutes (rounding handled in domain).
    return sessionRepository.update(stopSession(active, clock));
  });
};
