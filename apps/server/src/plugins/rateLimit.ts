import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

export async function registerRateLimit(
  app: FastifyInstance,
  _config: Config,
): Promise<void> {
  await app.register(rateLimit, {
    global: false,
  });
}
