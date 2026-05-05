import { pool } from "@codeshare/db";
import type { DependencyHealth, HealthResponse, ReliabilityStoreHealth } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import type { CircuitState } from "../lib/circuitBreaker.js";
import type { OperationLimiterSnapshot } from "../lib/operationLimiter.js";
import type { DailyUsageSnapshot } from "../lib/reliabilityStore.js";
import { roomManager } from "../models/RoomManager.js";

export interface HealthRouteDeps {
  getJudge0State?: () => CircuitState | undefined;
  getGroqState?: () => CircuitState | undefined;
  getReliabilityStoreHealth?: () => Promise<ReliabilityStoreHealth | undefined>;
  getDailyUsage?: () => Promise<DailyUsageSnapshot | undefined>;
  getYjsDocCount?: () => number | undefined;
  getSocketCount?: () => number | undefined;
  getOperationLimiterSnapshots?: () => OperationLimiterSnapshot[];
  isShuttingDown?: () => boolean;
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

  async function buildHealthResponse(): Promise<HealthResponse> {
    let dbConnected = true;
    try {
      await pool.query("SELECT 1");
    } catch {
      dbConnected = false;
    }

    const judge0State = deps?.getJudge0State?.();
    const groqState = deps?.getGroqState?.();
    const reliabilityStore = await deps?.getReliabilityStoreHealth?.();
    const dailyUsage = await deps?.getDailyUsage?.();
    const capacity = roomManager.getCapacitySnapshot();

    const judge0 = toDependencyHealth(judge0State);
    const groq = toDependencyHealth(groqState);
    const shuttingDown = deps?.isShuttingDown?.() ?? false;

    const isDegraded =
      shuttingDown ||
      !dbConnected ||
      judge0State === "open" ||
      reliabilityStore?.available === false;

    const response: HealthResponse = {
      status: isDegraded ? "degraded" : "ok",
      roomCount: capacity.activeRooms,
      dbConnected,
      shuttingDown,
      maxActiveRooms: capacity.maxActiveRooms,
      roomCapacityUsed: Math.round(capacity.roomCapacityUsed * 1000) / 1000,
    };

    if (judge0 !== undefined) response.judge0 = judge0;
    if (groq !== undefined) response.groq = groq;
    if (reliabilityStore !== undefined) response.reliabilityStore = reliabilityStore;
    if (dailyUsage !== undefined) response.dailyUsage = dailyUsage;
    response.yjsDocCount = deps?.getYjsDocCount?.();
    response.socketCount = deps?.getSocketCount?.();
    response.operationLimiters = deps?.getOperationLimiterSnapshots?.();

    return response;
  }

  function appendMemoryMetrics(request: { query: unknown }, response: HealthResponse): void {
    const query = request.query as Record<string, string>;
    if (query.metrics !== "memory") {
      return;
    }
    const mem = process.memoryUsage();
    response.heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    response.heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
    response.rssMB = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
  }

  app.get("/api/live", async (_request, reply) => {
    if (deps?.isShuttingDown?.()) {
      return reply.status(503).send({ status: "shutting_down" });
    }
    return reply.send({ status: "alive" });
  });

  app.get("/api/ready", async (request, reply) => {
    const response = await buildHealthResponse();
    appendMemoryMetrics(request, response);
    return reply.status(response.status === "ok" ? 200 : 503).send(response);
  });

  app.get("/api/health", async (request): Promise<HealthResponse> => {
    const response = await buildHealthResponse();

    if (previousState !== null && previousState !== response.status) {
      request.log.warn(
        {
          event: "service_health_state_changed",
          dependency: "postgres",
          previous_state: previousState,
          next_state: response.status,
          db_connected: response.dbConnected,
          reliability_store_available: response.reliabilityStore?.available,
          shutting_down: response.shuttingDown,
        },
        "Service health state changed",
      );
    }
    previousState = response.status;

    appendMemoryMetrics(request, response);

    return response;
  });
}
