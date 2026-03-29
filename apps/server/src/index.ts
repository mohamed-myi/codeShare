import { pool } from "@codeshare/db";
import type { FastifyBaseLogger } from "fastify";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createGracefulShutdown, registerProcessErrorHandlers } from "./lib/gracefulShutdown.js";
import { createLogger } from "./lib/logger.js";
import { roomManager } from "./models/RoomManager.js";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerRequestLogging } from "./plugins/requestLogging.js";
import { registerSecurityHeaders } from "./plugins/securityHeaders.js";
import { devLogRoutes } from "./routes/devLogs.js";
import { healthRoutes } from "./routes/health.js";
import { problemRoutes } from "./routes/problems.js";
import { roomRoutes } from "./routes/rooms.js";
import { testRoutes } from "./routes/test.js";
import { setupUpgradeRouting } from "./server.js";
import { destroyAllSharedDocs } from "./ws/yjsDocRegistry.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);

const app = Fastify({
  disableRequestLogging: true,
  loggerInstance: logger as FastifyBaseLogger,
});

await registerCors(app, config);
await registerRateLimit(app, config);
await registerRequestLogging(app);
await registerSecurityHeaders(app, config);

let resources: import("./server.js").ServerResources | null = null;
await app.register(healthRoutes, {
  deps: {
    getJudge0State: () => resources?.judge0Client.getCircuitState(),
    getGroqState: () => resources?.groqClient?.getCircuitState(),
  },
});
await app.register(roomRoutes, { prefix: "/api", config });
await app.register(problemRoutes, { prefix: "/api" });
if (config.NODE_ENV === "development") {
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
resources = setupUpgradeRouting(httpServer, config, logger);

const { shutdown } = createGracefulShutdown({
  httpServer,
  io: resources.io,
  wss: resources.wss,
  logger,
  destroyAllDocs: destroyAllSharedDocs,
  resetRooms: () => roomManager.resetRooms(),
  closePool: () => pool.end(),
});

const onSignal = (signal: string) => {
  logger.info({ event: "shutdown_signal_received", signal });
  shutdown().then(() => process.exit(0));
};
process.on("SIGTERM", () => onSignal("SIGTERM"));
process.on("SIGINT", () => onSignal("SIGINT"));

registerProcessErrorHandlers(logger, shutdown);
