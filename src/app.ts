import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./lib/errors.js";
import { systemClock, type Clock } from "./lib/clock.js";
import { InMemoryTaskRepository } from "./repositories/in-memory-task-repository.js";
import type { TaskRepository } from "./repositories/task-repository.js";
import { InMemorySessionRepository } from "./repositories/in-memory-session-repository.js";
import type { SessionRepository } from "./repositories/session-repository.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerTaskRoutes } from "./routes/task-routes.js";
import { registerSessionRoutes } from "./routes/session-routes.js";
import { registerStatsRoutes } from "./routes/stats-routes.js";

export interface AppDeps {
  clock?: Clock;
  taskRepository?: TaskRepository;
  sessionRepository?: SessionRepository;
  logger?: boolean;
}

/** The subset of Fastify's error fields the central handler inspects. */
interface FastifyErrorFields {
  statusCode?: number;
  validation?: unknown;
}

/** Narrow an unknown thrown value to the Fastify error fields we read (6.1). */
function asFastifyError(error: unknown): FastifyErrorFields {
  return typeof error === "object" && error !== null
    ? (error as FastifyErrorFields)
    : {};
}

/** Extract a safe message from an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Request validation failed";
}

/**
 * Builds the Fastify instance and injects its dependencies. This is the single
 * wiring point in the app: swapping the clock or repository (e.g. for tests or
 * for a future SQLite store) happens here and nowhere else. Note it does NOT
 * call `listen()`, which is what lets tests drive it via `app.inject()`.
 */
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const clock = deps.clock ?? systemClock;
  const taskRepository = deps.taskRepository ?? new InMemoryTaskRepository();
  const sessionRepository =
    deps.sessionRepository ?? new InMemorySessionRepository();

  const app = Fastify({ logger: deps.logger ?? false });

  // Central error handling: every thrown error becomes the standard envelope
  // `{ error: { code, message, details? } }` (requirements 6.1, 6.3).
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues,
        },
      });
    }

    // Fastify hands us an `unknown`; narrow to the subset of fields its own
    // errors expose before reading them.
    const fastifyError = asFastifyError(error);

    // Fastify's built-in schema validation, if ever triggered.
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: messageOf(error) },
      });
    }

    // Other Fastify-raised client errors carry a 4xx status but no `.validation`
    // (e.g. a malformed JSON body, an empty body when JSON is expected, or an
    // unsupported content type). These are request problems, not server faults,
    // so normalize them to a VALIDATION_ERROR envelope instead of letting them
    // fall through to a 500 (6.1). The Fastify message describes the bad request
    // and never contains a stack trace, so it is safe to surface.
    if (
      typeof fastifyError.statusCode === "number" &&
      fastifyError.statusCode >= 400 &&
      fastifyError.statusCode < 500
    ) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: messageOf(error) },
      });
    }

    // Anything else is unexpected: log the full error (stack included) so it is
    // observable server-side, but return a generic envelope that never leaks the
    // stack trace or internal message in the response body (6.3).
    request.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });

  // Unknown routes get the same envelope shape (requirement 6.2).
  app.setNotFoundHandler((_request, reply) => {
    reply
      .status(404)
      .send({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  app.register(registerHealthRoutes);
  app.register(registerTaskRoutes, { taskRepository, clock });
  // Pass the SAME taskRepository instance so session existence checks (4.2)
  // see tasks created via the task routes.
  app.register(registerSessionRoutes, {
    taskRepository,
    sessionRepository,
    clock,
  });
  // Daily stats read the same task + session stores and derive "today" from the
  // same clock, so results line up with what the other routes wrote (5.1-5.3).
  app.register(registerStatsRoutes, {
    taskRepository,
    sessionRepository,
    clock,
  });

  return app;
}
