import { pool } from "@codeshare/db";
import type { DependencyHealth, HealthResponse } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import type { CircuitState } from "../lib/circuitBreaker.js";
import { roomManager } from "../models/RoomManager.js";

export interface HealthRouteDeps {
  getJudge0State?: () => CircuitState | undefined;
  getGroqState?: () => CircuitState | undefined;
}

function toDependencyHealth(circuitState: CircuitState | undefined): DependencyHealth | undefined {
  if (circuitState === undefined) return undefined;
  return {
    available: circuitState !== "open",
    circuitState,
  };
}

export async function healthRoutes(
  app: FastifyInstance,
  options?: { deps?: HealthRouteDeps },
): Promise<void> {
  const deps = options?.deps;
  let previousState: HealthResponse["status"] | null = null;

  app.get("/api/health", async (request): Promise<HealthResponse> => {
    let dbConnected = true;
    try {
      await pool.query("SELECT 1");
    } catch {
      dbConnected = false;
    }

    const judge0State = deps?.getJudge0State?.();
    const groqState = deps?.getGroqState?.();

    const judge0 = toDependencyHealth(judge0State);
    const groq = toDependencyHealth(groqState);

    const isDegraded = !dbConnected || judge0State === "open";

    const response: HealthResponse = {
      status: isDegraded ? "degraded" : "ok",
      roomCount: roomManager.getRoomCount(),
      dbConnected,
    };

    if (judge0 !== undefined) response.judge0 = judge0;
    if (groq !== undefined) response.groq = groq;

    if (previousState !== null && previousState !== response.status) {
      request.log.warn(
        {
          event: "service_health_state_changed",
          dependency: "postgres",
          previous_state: previousState,
          next_state: response.status,
          db_connected: dbConnected,
        },
        "Service health state changed",
      );
    }
    previousState = response.status;

    const query = request.query as Record<string, string>;
    if (query.metrics === "memory") {
      const mem = process.memoryUsage();
      response.heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
      response.heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
      response.rssMB = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    }

    return response;
  });
}
