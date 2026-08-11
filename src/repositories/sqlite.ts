import { DatabaseSync } from "node:sqlite";

/**
 * Opens a SQLite database via Node's built-in driver.
 *
 * This module is the single place that imports the *runtime* `node:sqlite`
 * module. The repository classes depend on the `DatabaseSync` type only (via
 * `import type`), so importing them never loads the module — keeping the app
 * runnable on any Node while the durable store stays opt-in through `server.ts`.
 *
 * Requires Node 22.5+ (unflagged on Node 24; behind `--experimental-sqlite` on
 * Node 22).
 */
export function openDatabase(location: string): DatabaseSync {
  return new DatabaseSync(location);
}
