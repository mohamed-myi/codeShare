import type { FastifyBaseLogger } from "fastify";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createLogger } from "./lib/logger.js";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerSecurityHeaders } from "./plugins/securityHeaders.js";
import { healthRoutes } from "./routes/health.js";
import { problemRoutes } from "./routes/problems.js";
import { roomRoutes } from "./routes/rooms.js";
import { testRoutes } from "./routes/test.js";
import { setupUpgradeRouting } from "./server.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);

const app = Fastify({ loggerInstance: logger as FastifyBaseLogger });

await registerCors(app, config);
await registerRateLimit(app, config);
await registerSecurityHeaders(app, config);

await app.register(healthRoutes);
await app.register(roomRoutes, { prefix: "/api", config });
await app.register(problemRoutes, { prefix: "/api" });
if (config.NODE_ENV === "test") {
  await app.register(testRoutes);
}

const address = await app.listen({ port: config.PORT, host: "0.0.0.0" });
logger.info(`Server listening on ${address}`);

const httpServer = app.server;
setupUpgradeRouting(httpServer, config, logger);
