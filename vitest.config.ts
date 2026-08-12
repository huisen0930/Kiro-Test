import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts is the process bootstrap (opens SQLite, listens). It is exercised
      // in production, not in tests (tests drive buildApp via app.inject), so it is
      // excluded from the coverage gate rather than faked.
      exclude: ["src/server.ts"],
      reporter: ["text-summary", "text"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
