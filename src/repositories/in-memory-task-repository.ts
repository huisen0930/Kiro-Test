import type { Task } from "../domain/task.js";
import type { TaskListFilter, TaskRepository } from "./task-repository.js";

/**
 * In-memory task store. Tasks are returned newest-first (requirement 2.1):
 * primarily by `createdAt` descending, with an insertion counter as a stable
 * tie-breaker so ordering stays deterministic even when timestamps collide.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();
  private readonly insertionOrder = new Map<string, number>();
  private sequence = 0;

  create(task: Task): Task {
    this.tasks.set(task.id, task);
    this.insertionOrder.set(task.id, this.sequence++);
    return task;
  }

  list(filter: TaskListFilter = {}): Task[] {
    let items = [...this.tasks.values()];

    if (filter.status) {
      items = items.filter((task) => task.status === filter.status);
    }
    if (filter.tag) {
      const tag = filter.tag.toLowerCase();
      items = items.filter((task) => task.tags.includes(tag));
    }

    return items.sort((a, b) => {
      const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
      if (byCreatedAt !== 0) return byCreatedAt;
      const aOrder = this.insertionOrder.get(a.id) ?? 0;
      const bOrder = this.insertionOrder.get(b.id) ?? 0;
      return bOrder - aOrder;
    });
  }

  getById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  delete(id: string): boolean {
    this.insertionOrder.delete(id);
    return this.tasks.delete(id);
  }
}
