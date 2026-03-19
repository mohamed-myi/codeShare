import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

export async function registerRateLimit(
  app: FastifyInstance,
  config: Config,
): Promise<void> {
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_ROOM_CREATE,
    timeWindow: "1 hour",
  });
}
