import type { Task, TaskStatus } from "../domain/task.js";

export interface TaskListFilter {
  status?: TaskStatus;
  tag?: string;
}

/**
 * Storage boundary for tasks. Routes depend on this interface, never on a
 * concrete store, so an in-memory implementation today can be swapped for a
 * durable one (e.g. SQLite) later without touching route code (see tasks.md #11).
 */
export interface TaskRepository {
  create(task: Task): Task;
  list(filter?: TaskListFilter): Task[];
  getById(id: string): Task | undefined;
  update(task: Task): Task;
  delete(id: string): boolean;
}
