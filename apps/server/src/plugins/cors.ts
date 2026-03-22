import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

export async function registerCors(app: FastifyInstance, config: Config): Promise<void> {
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });
}
