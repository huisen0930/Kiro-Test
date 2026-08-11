import type { DatabaseSync } from "node:sqlite";
import type { FocusSession } from "../domain/session.js";
import type { SessionRepository } from "./session-repository.js";

/** Shape of a `sessions` row as returned by SQLite. */
interface SessionRow {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    seq             INTEGER PRIMARY KEY AUTOINCREMENT,
    id              TEXT NOT NULL UNIQUE,
    taskId          TEXT NOT NULL,
    startedAt       TEXT NOT NULL,
    endedAt         TEXT,
    durationMinutes INTEGER
  );
`;

/**
 * Durable focus-session store backed by `node:sqlite`. Implements the same
 * `SessionRepository` contract as the in-memory version. Under the single
 * global active-session rule (design.md) at most one row has a null `endedAt`,
 * so `getActive()` returns that row (or undefined) to let the route layer
 * enforce the 409 rules (4.3, 4.5). Insertion order (`seq`) gives stable
 * `list()` results for daily stats (5.1).
 */
export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: DatabaseSync) {
    db.exec(SCHEMA);
  }

  create(session: FocusSession): FocusSession {
    this.db
      .prepare(
        `INSERT INTO sessions (id, taskId, startedAt, endedAt, durationMinutes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.taskId,
        session.startedAt,
        session.endedAt,
        session.durationMinutes,
      );
    return session;
  }

  getActive(): FocusSession | undefined {
    const row = this.db
      .prepare(`SELECT * FROM sessions WHERE endedAt IS NULL ORDER BY seq LIMIT 1`)
      .get() as SessionRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  update(session: FocusSession): FocusSession {
    this.db
      .prepare(`UPDATE sessions SET endedAt = ?, durationMinutes = ? WHERE id = ?`)
      .run(session.endedAt, session.durationMinutes, session.id);
    return session;
  }

  list(): FocusSession[] {
    const rows = this.db
      .prepare(`SELECT * FROM sessions ORDER BY seq`)
      .all() as unknown as SessionRow[];
    return rows.map(mapRow);
  }
}

function mapRow(row: SessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.taskId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationMinutes: row.durationMinutes,
  };
}
