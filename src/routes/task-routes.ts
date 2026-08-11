import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../lib/clock.js";
import type { TaskRepository } from "../repositories/task-repository.js";
import { notFound } from "../lib/errors.js";
import { applyUpdate, completeTask, createTask } from "../domain/task.js";
import {
  createTaskBodySchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskBodySchema,
} from "../schemas/task-schemas.js";

export interface TaskRoutesOptions {
  taskRepository: TaskRepository;
  clock: Clock;
}

/**
 * Task CRUD (requirements 1.x, 2.x, 3.x). Handlers validate with Zod, delegate
 * rules to the domain layer, and throw `AppError` for the not-found path; the
 * central error handler in app.ts turns everything into the standard envelope.
 */
export const registerTaskRoutes: FastifyPluginAsync<TaskRoutesOptions> = async (
  app,
  options,
) => {
  const { taskRepository, clock } = options;

  // 1.1–1.4
  app.post("/tasks", async (request, reply) => {
    const body = createTaskBodySchema.parse(request.body);
    const task = createTask(body, clock);
    taskRepository.create(task);
    return reply.status(201).send(task);
  });

  // 2.1–2.3
  app.get("/tasks", async (request) => {
    const query = listTasksQuerySchema.parse(request.query);
    return taskRepository.list(query);
  });

  // 2.4, 2.5
  app.get("/tasks/:id", async (request) => {
    const { id } = taskIdParamSchema.parse(request.params);
    const task = taskRepository.getById(id);
    if (!task) throw notFound(`Task ${id} not found`);
    return task;
  });

  // 3.1, 3.5
  app.patch("/tasks/:id", async (request) => {
    const { id } = taskIdParamSchema.parse(request.params);
    const body = updateTaskBodySchema.parse(request.body);
    const existing = taskRepository.getById(id);
    if (!existing) throw notFound(`Task ${id} not found`);
    return taskRepository.update(applyUpdate(existing, body));
  });

  // 3.2, 3.3, 3.5
  app.post("/tasks/:id/complete", async (request) => {
    const { id } = taskIdParamSchema.parse(request.params);
    const existing = taskRepository.getById(id);
    if (!existing) throw notFound(`Task ${id} not found`);
    return taskRepository.update(completeTask(existing, clock));
  });

  // 3.4, 3.5
  app.delete("/tasks/:id", async (request, reply) => {
    const { id } = taskIdParamSchema.parse(request.params);
    if (!taskRepository.delete(id)) throw notFound(`Task ${id} not found`);
    return reply.status(204).send();
  });
};
