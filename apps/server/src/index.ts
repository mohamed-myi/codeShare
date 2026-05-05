import { accessRepository, pool } from "@codeshare/db";
import type { FastifyBaseLogger } from "fastify";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createGracefulShutdown, registerProcessErrorHandlers } from "./lib/gracefulShutdown.js";
import { IpRateLimiter } from "./lib/ipRateLimiter.js";
import { createLogger } from "./lib/logger.js";
import { OperationLimiter } from "./lib/operationLimiter.js";
import { globalCounters } from "./lib/rateLimitCounters.js";
import { createReliabilityStore } from "./lib/reliabilityStore.js";
import { roomManager } from "./models/RoomManager.js";
import { registerCors } from "./plugins/cors.js";
import { registerPrivateAccessProtection } from "./plugins/privateAccess.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerRequestLogging } from "./plugins/requestLogging.js";
import { registerSecurityHeaders } from "./plugins/securityHeaders.js";
import { accessRoutes } from "./routes/access.js";
import { devLogRoutes } from "./routes/devLogs.js";
import { healthRoutes } from "./routes/health.js";
import { problemRoutes } from "./routes/problems.js";
import { roomRoutes } from "./routes/rooms.js";
import { testRoutes } from "./routes/test.js";
import { setupUpgradeRouting } from "./server.js";
import { createAccessService } from "./services/AccessService.js";
import { destroyAllSharedDocs, getSharedDocCount } from "./ws/yjsDocRegistry.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);
const reliabilityStore = await createReliabilityStore({
  kind: config.RELIABILITY_STORE,
  redisUrl: config.REDIS_URL,
  redisConnectTimeoutMs: config.REDIS_CONNECT_TIMEOUT_MS,
});
globalCounters.configure(reliabilityStore);

const ipRateLimiter = new IpRateLimiter(reliabilityStore);
const operationLimiters = {
  judge0: new OperationLimiter({
    name: "judge0",
    maxInFlight: config.JUDGE0_MAX_IN_FLIGHT,
    maxQueue: config.JUDGE0_MAX_QUEUE,
  }),
  imports: new OperationLimiter({
    name: "imports",
    maxInFlight: config.IMPORT_MAX_IN_FLIGHT,
    maxQueue: config.IMPORT_MAX_QUEUE,
  }),
  llm: new OperationLimiter({
    name: "llm",
    maxInFlight: config.LLM_MAX_IN_FLIGHT,
    maxQueue: config.LLM_MAX_QUEUE,
  }),
};

const app = Fastify({
  disableRequestLogging: true,
  loggerInstance: logger as FastifyBaseLogger,
});

await registerCors(app, config);
await registerRateLimit(app, config);
await registerRequestLogging(app);
await registerSecurityHeaders(app, config);

let resources: import("./server.js").ServerResources | null = null;
let shutdownState: ReturnType<typeof createGracefulShutdown> | null = null;
const roomSweepTimer = setInterval(() => {
  const destroyedRooms = roomManager.destroyIdleRooms(config.ROOM_IDLE_TTL_MS);
  if (destroyedRooms > 0) {
    logger.info({
      event: "idle_rooms_destroyed",
      destroyed_rooms: destroyedRooms,
      idle_room_ttl_ms: config.ROOM_IDLE_TTL_MS,
    });
  }
}, config.ROOM_SWEEP_INTERVAL_MS);
roomSweepTimer.unref();

const accessService = config.ENABLE_PRIVATE_ACCESS
  ? createAccessService({
      store: accessRepository,
      cookieName: config.ACCESS_COOKIE_NAME,
      sessionSecret: config.ACCESS_SESSION_SECRET ?? "",
      sessionTtlDays: config.ACCESS_SESSION_TTL_DAYS,
      secureCookies: config.NODE_ENV === "production",
    })
  : undefined;
await app.register(healthRoutes, {
  deps: {
    getJudge0State: () => resources?.judge0Client.getCircuitState(),
    getGroqState: () => resources?.groqClient?.getCircuitState(),
    getReliabilityStoreHealth: () => reliabilityStore.health(),
    getDailyUsage: () => reliabilityStore.getUsageSnapshot(),
    getYjsDocCount: () => getSharedDocCount(),
    getSocketCount: () => resources?.io.engine.clientsCount ?? 0,
    getOperationLimiterSnapshots: () =>
      Object.values(operationLimiters).map((limiter) => limiter.snapshot()),
    isShuttingDown: () => shutdownState?.isShuttingDown() ?? false,
  },
});
await app.register(accessRoutes, { prefix: "/api", config, accessService });
registerPrivateAccessProtection(app, config, accessService);
await app.register(roomRoutes, { prefix: "/api", config });
await app.register(problemRoutes, { prefix: "/api" });
if (config.NODE_ENV !== "production") {
  await app.register(devLogRoutes);
}
if (config.NODE_ENV === "test") {
  logger.warn({
    event: "test_routes_enabled",
    environment: config.NODE_ENV,
  });
  await app.register(testRoutes);
}

const address = await app.listen({ port: config.PORT, host: "0.0.0.0" });
logger.info({
  event: "server_listening",
  address,
  port: config.PORT,
});

const httpServer = app.server;
resources = setupUpgradeRouting(httpServer, config, logger, accessService, {
  ipRateLimiter,
  operationLimiters,
});

shutdownState = createGracefulShutdown({
  httpServer,
  io: resources.io,
  wss: resources.wss,
  logger,
  destroyAllDocs: destroyAllSharedDocs,
  resetRooms: () => roomManager.resetRooms(),
  closePool: () => pool.end(),
  stopBackgroundTasks: () => clearInterval(roomSweepTimer),
  closeReliabilityStore: () => reliabilityStore.close(),
});
const { shutdown } = shutdownState;

const onSignal = (signal: string) => {
  logger.info({ event: "shutdown_signal_received", signal });
  shutdown().then(() => process.exit(0));
};
process.on("SIGTERM", () => onSignal("SIGTERM"));
process.on("SIGINT", () => onSignal("SIGINT"));

registerProcessErrorHandlers(logger, shutdown);
