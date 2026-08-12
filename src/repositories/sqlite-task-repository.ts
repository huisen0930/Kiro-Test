import type { DatabaseSync } from "node:sqlite";
import type { Task, TaskStatus } from "../domain/task.js";
import type { TaskListFilter, TaskRepository } from "./task-repository.js";

/** Shape of a `tasks` row as returned by SQLite (all columns are TEXT). */
interface TaskRow {
  id: string;
  title: string;
  tags: string; // JSON array of lowercased tags
  status: string;
  createdAt: string;
  completedAt: string | null;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    seq         INTEGER PRIMARY KEY AUTOINCREMENT,
    id          TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    tags        TEXT NOT NULL,
    status      TEXT NOT NULL,
    createdAt   TEXT NOT NULL,
    completedAt TEXT
  );
`;

/**
 * Durable task store backed by `node:sqlite`. Implements the same
 * `TaskRepository` contract as the in-memory version, including newest-first
 * ordering (`createdAt` desc) with the autoincrement `seq` as a stable
 * insertion tie-break so ordering is deterministic when timestamps collide
 * (requirement 2.1).
 */
export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly db: DatabaseSync) {
    db.exec(SCHEMA);
  }

  create(task: Task): Task {
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, tags, status, createdAt, completedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.id,
        task.title,
        JSON.stringify(task.tags),
        task.status,
        task.createdAt,
        task.completedAt,
      );
    return task;
  }

  list(filter: TaskListFilter = {}): Task[] {
    const rows = (filter.status
      ? this.db
          .prepare(
            `SELECT * FROM tasks WHERE status = ? ORDER BY createdAt DESC, seq DESC`,
          )
          .all(filter.status)
      : this.db
          .prepare(`SELECT * FROM tasks ORDER BY createdAt DESC, seq DESC`)
          .all()) as unknown as TaskRow[];

    let tasks = rows.map(mapRow);
    if (filter.tag) {
      const tag = filter.tag.toLowerCase();
      tasks = tasks.filter((task) => task.tags.includes(tag));
    }
    return tasks;
  }

  getById(id: string): Task | undefined {
    const row = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as
      TaskRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  update(task: Task): Task {
    this.db
      .prepare(
        `UPDATE tasks
         SET title = ?, tags = ?, status = ?, completedAt = ?
         WHERE id = ?`,
      )
      .run(
        task.title,
        JSON.stringify(task.tags),
        task.status,
        task.completedAt,
        task.id,
      );
    return task;
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
    return Number(result.changes) > 0;
  }
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    tags: JSON.parse(row.tags) as string[],
    status: row.status as TaskStatus,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}
