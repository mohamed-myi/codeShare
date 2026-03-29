import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

export async function registerRateLimit(app: FastifyInstance, _config: Config): Promise<void> {
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder(request, context) {
      request.log.warn(
        {
          event: "rate_limit_exceeded",
          request_id: request.id,
          method: request.method,
          route: request.routeOptions.url ?? request.url,
          client_ip: request.ip,
          status_code: context.statusCode,
          retry_after_seconds: context.after,
          limit: context.max,
          ttl_ms: context.ttl,
        },
        "Rate limit exceeded",
      );

      return {
        statusCode: context.statusCode,
        error: "Too Many Requests",
        message: `Rate limit exceeded, retry in ${context.after} seconds`,
      };
    },
  });
}
