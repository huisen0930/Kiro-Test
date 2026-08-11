import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/app.js";

interface ErrorBody {
  error: { code: string; message: string };
}

describe("operational routes", () => {
  it("GET /health returns { status: ok } (6.4)", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("unknown routes return the NOT_FOUND envelope (6.2)", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/no-such-route" });
    expect(res.statusCode).toBe(404);
    expect((res.json() as ErrorBody).error.code).toBe("NOT_FOUND");
  });
});
