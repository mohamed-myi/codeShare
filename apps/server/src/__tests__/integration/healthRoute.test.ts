import type { HealthResponse } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { afterAll, describe, expect, it, vi } from "vitest";
import { type HealthRouteDeps, healthRoutes } from "../../routes/health.js";

function buildApp(deps: HealthRouteDeps): FastifyInstance {
  const app = Fastify();
  app.register(healthRoutes, { deps });
  return app;
}

const mockPool = vi.hoisted(() => ({
  query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
}));

vi.mock("@codeshare/db", () => ({
  pool: mockPool,
}));

describe("GET /api/health (extended)", () => {
  let app: FastifyInstance;

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns 'ok' when DB up and circuits closed", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "closed",
      getGroqState: () => "closed",
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.status).toBe("ok");
    expect(body.judge0).toEqual({ available: true, circuitState: "closed" });
    expect(body.groq).toEqual({ available: true, circuitState: "closed" });
  });

  it("returns 'degraded' when DB down", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("db down"));
    app = buildApp({
      getJudge0State: () => "closed",
      getGroqState: () => "closed",
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.status).toBe("degraded");
    expect(body.dbConnected).toBe(false);
  });

  it("returns 'degraded' when Judge0 circuit OPEN", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "open",
      getGroqState: () => "closed",
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.status).toBe("degraded");
    expect(body.judge0).toEqual({ available: false, circuitState: "open" });
  });

  it("returns 'ok' when only Groq circuit OPEN (Groq is optional)", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "closed",
      getGroqState: () => "open",
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.status).toBe("ok");
    expect(body.groq).toEqual({ available: false, circuitState: "open" });
  });

  it("returns undefined for groq when not configured", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "closed",
      getGroqState: () => undefined,
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.groq).toBeUndefined();
  });

  it("reports circuitState accurately (closed/open/half_open)", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "half_open",
      getGroqState: () => "half_open",
    });

    const res = await app.inject({ method: "GET", url: "/api/health" });
    const body = res.json<HealthResponse>();

    expect(body.judge0?.circuitState).toBe("half_open");
    expect(body.groq?.circuitState).toBe("half_open");
  });

  it("memory metrics still work with query param", async () => {
    mockPool.query.mockResolvedValueOnce({});
    app = buildApp({
      getJudge0State: () => "closed",
    });

    const res = await app.inject({ method: "GET", url: "/api/health?metrics=memory" });
    const body = res.json<HealthResponse>();

    expect(body.heapUsedMB).toBeTypeOf("number");
    expect(body.heapTotalMB).toBeTypeOf("number");
    expect(body.rssMB).toBeTypeOf("number");
  });
});
