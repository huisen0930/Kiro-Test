import type { FastifyPluginAsync } from "fastify";

/** Liveness probe (requirement 6.4). */
export const registerHealthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ status: "ok" }));
};
