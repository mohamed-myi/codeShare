import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import { pool } from "@codeshare/db";
import type { FastifyBaseLogger } from "fastify";
import Fastify from "fastify";
import type pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../../lib/logger.js";
import { roomManager } from "../../models/RoomManager.js";
import { registerRateLimit } from "../../plugins/rateLimit.js";
import { registerRequestLogging } from "../../plugins/requestLogging.js";
import { devLogRoutes } from "../../routes/devLogs.js";
import { healthRoutes } from "../../routes/health.js";
import { roomRoutes } from "../../routes/rooms.js";
import { createTestConfig } from "../helpers/configHelper.js";

function createMemoryStream(chunks: string[]): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
}

function parseLogEntries(chunks: string[]): Array<Record<string, unknown>> {
  return chunks
    .join("")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((entry) => JSON.parse(entry) as Record<string, unknown>);
}

async function flushLogs(app: { log: FastifyBaseLogger }): Promise<void> {
  const logger = app.log as FastifyBaseLogger & { flush?: pino.Logger["flush"] };
  await new Promise<void>(
    (resolve, reject) =>
      logger.flush?.((error) => (error ? reject(error) : resolve())) ?? resolve(),
  );
}

async function buildApp(options?: {
  environment?: "development" | "production" | "test";
  logDir?: string;
  logLevel?: string;
  stream?: Writable;
  configOverrides?: Partial<ReturnType<typeof createTestConfig>>;
}) {
  const environment = options?.environment ?? "test";
  const logger = createLogger(options?.logLevel ?? "silent", {
    environment,
    stream: options?.stream,
    enablePretty: false,
    enableFileLogging: false,
  });
  const app = Fastify({
    disableRequestLogging: true,
    loggerInstance: logger as FastifyBaseLogger,
  });
  const config = createTestConfig({
    NODE_ENV: environment,
    LOG_LEVEL: (options?.logLevel ?? "silent") as never,
    ...options?.configOverrides,
  });

  await registerRateLimit(app, config);
  await registerRequestLogging(app);
  await app.register(roomRoutes, { prefix: "/api", config });
  await app.register(healthRoutes);

  if (environment !== "production") {
    await app.register(devLogRoutes, { logDir: options?.logDir });
  }

  await app.ready();
  return app;
}

describe("request logging integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    roomManager.resetRooms();
    roomManager.configureDefaults({ maxActiveRooms: 500 });
  });

  it("adds X-Request-Id to API responses", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("emits a semantic rate_limit_exceeded log when room creation is throttled", async () => {
    const chunks: string[] = [];
    const app = await buildApp({
      logLevel: "info",
      stream: createMemoryStream(chunks),
      configOverrides: { RATE_LIMIT_ROOM_CREATE: 1 },
    });

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });
    const roomCode = firstResponse.json().roomCode as string;

    const secondResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Bob" },
    });

    expect(secondResponse.statusCode).toBe(429);

    await flushLogs(app);
    const rateLimitEntry = parseLogEntries(chunks).find(
      (entry) => entry.event === "rate_limit_exceeded",
    );

    expect(rateLimitEntry).toBeDefined();
    expect(rateLimitEntry?.route).toBe("/api/rooms");
    expect(rateLimitEntry?.method).toBe("POST");
    expect(rateLimitEntry?.request_id).toBeDefined();

    roomManager.destroyRoom(roomCode);
  });

  it("emits room_create_rejected when room capacity is exhausted", async () => {
    const chunks: string[] = [];
    roomManager.configureDefaults({ maxActiveRooms: 0 });
    const app = await buildApp({
      logLevel: "info",
      stream: createMemoryStream(chunks),
      configOverrides: { MAX_ACTIVE_ROOMS: 0 },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });

    expect(response.statusCode).toBe(503);

    await flushLogs(app);
    const rejectionEntry = parseLogEntries(chunks).find(
      (entry) => entry.event === "room_create_rejected",
    );

    expect(rejectionEntry).toBeDefined();
    expect(rejectionEntry?.reason).toBe("max_active_rooms_reached");
    expect(rejectionEntry?.max_active_rooms).toBe(0);
  });

  it("logs health state transitions only when connectivity changes", async () => {
    const chunks: string[] = [];
    const querySpy = vi
      .spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockRejectedValueOnce(new Error("db unavailable"))
      .mockRejectedValueOnce(new Error("still unavailable"))
      .mockResolvedValueOnce({ rows: [] } as never);

    const app = await buildApp({
      logLevel: "info",
      stream: createMemoryStream(chunks),
    });

    await app.inject({ method: "GET", url: "/api/health" });
    await app.inject({ method: "GET", url: "/api/health" });
    await app.inject({ method: "GET", url: "/api/health" });
    await app.inject({ method: "GET", url: "/api/health" });

    expect(querySpy).toHaveBeenCalledTimes(4);

    await flushLogs(app);
    const transitionEntries = parseLogEntries(chunks).filter(
      (entry) => entry.event === "service_health_state_changed",
    );

    expect(transitionEntries).toHaveLength(2);
    expect(transitionEntries[0]).toMatchObject({
      previous_state: "ok",
      next_state: "degraded",
      dependency: "postgres",
    });
    expect(transitionEntries[1]).toMatchObject({
      previous_state: "degraded",
      next_state: "ok",
      dependency: "postgres",
    });
  });
});

describe("devLogRoutes", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
    tempDirs.length = 0;
  });

  it("accepts structured client logs and writes them to the local dev log directory", async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "codeshare-client-logs-"));
    tempDirs.push(logDir);

    const app = await buildApp({
      environment: "development",
      logDir,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/dev/logs/client",
      payload: {
        level: "error",
        event: "client_render_failed",
        service: "codeshare-client",
        error_message: "Boom",
      },
    });

    expect(response.statusCode).toBe(202);

    const serviceDir = path.join(logDir, "codeshare-client");
    const files = fs.readdirSync(serviceDir);
    expect(files).toHaveLength(1);

    const contents = fs.readFileSync(path.join(serviceDir, files[0]), "utf8");
    expect(contents).toContain('"event":"client_render_failed"');
  });

  it("accepts client logs in the test environment used by e2e runs", async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "codeshare-client-logs-"));
    tempDirs.push(logDir);

    const app = await buildApp({
      environment: "test",
      logDir,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/dev/logs/client",
      payload: {
        level: "warn",
        event: "client_log_ingest_probe",
        service: "codeshare-client",
        message: "e2e logger check",
      },
    });

    expect(response.statusCode).toBe(202);
  });
});
