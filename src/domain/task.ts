import { newId } from "../lib/id.js";
import type { Clock } from "../lib/clock.js";

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  tags: string[];
  status: TaskStatus;
  createdAt: string; // ISO-8601 UTC
  completedAt: string | null;
}

export interface CreateTaskInput {
  title: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  tags?: string[];
}

/**
 * Lowercases, trims, and de-duplicates tags while preserving first-seen order
 * (requirement 1.4). Empty/whitespace-only tags are dropped.
 */
export function normalizeTags(tags: readonly string[] | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag.length === 0 || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

/** Builds a new, open task (requirements 1.1, 1.4). */
export function createTask(input: CreateTaskInput, clock: Clock): Task {
  return {
    id: newId(),
    title: input.title.trim(),
    tags: normalizeTags(input.tags),
    status: "open",
    createdAt: clock.now().toISOString(),
    completedAt: null,
  };
}

/** Returns a copy of the task with title/tags updated (requirement 3.1). */
export function applyUpdate(task: Task, input: UpdateTaskInput): Task {
  return {
    ...task,
    title: input.title !== undefined ? input.title.trim() : task.title,
    tags: input.tags !== undefined ? normalizeTags(input.tags) : task.tags,
  };
}

/**
 * Marks a task done and stamps `completedAt` (requirement 3.2). Completing an
 * already-done task is idempotent: the original is returned unchanged (3.3).
 */
export function completeTask(task: Task, clock: Clock): Task {
  if (task.status === "done") return task;
  return {
    ...task,
    status: "done",
    completedAt: clock.now().toISOString(),
  };
}
