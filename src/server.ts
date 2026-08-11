import { buildApp } from "./app.js";
import { openDatabase } from "./repositories/sqlite.js";
import { SqliteTaskRepository } from "./repositories/sqlite-task-repository.js";
import { SqliteSessionRepository } from "./repositories/sqlite-session-repository.js";

const port = Number(process.env.PORT ?? 3000);
// Bind to loopback by default. FocusFlow has no authentication yet (auth is
// out of scope per product.md), so it should not be exposed on a public
// interface without adding an auth layer first.
const host = process.env.HOST ?? "127.0.0.1";

// Durable storage (task 11): the production entry point is the ONE place that
// swaps the default in-memory repositories for SQLite-backed ones. `buildApp`
// still defaults to in-memory, so tests stay fast and storage-free.
const db = openDatabase(process.env.DB_PATH ?? "focusflow.db");
const app = buildApp({
  taskRepository: new SqliteTaskRepository(db),
  sessionRepository: new SqliteSessionRepository(db),
  logger: true,
});

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`FocusFlow API ready at ${address}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
