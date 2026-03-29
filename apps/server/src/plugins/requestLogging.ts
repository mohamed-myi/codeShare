import type { FastifyInstance } from "fastify";

const CLIENT_LOG_INGEST_URL = "/api/dev/logs/client";

export async function registerRequestLogging(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-Id", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url ?? request.url;
    if (route === CLIENT_LOG_INGEST_URL) {
      return;
    }

    const payload = {
      event: "http_request_completed",
      request_id: request.id,
      method: request.method,
      route,
      status_code: reply.statusCode,
      client_ip: request.ip,
      duration_ms: Math.round(reply.elapsedTime),
    };

    if (reply.statusCode >= 500) {
      request.log.error(payload, "HTTP request completed with server error");
      return;
    }

    if (reply.statusCode >= 400) {
      request.log.warn(payload, "HTTP request completed with client error");
      return;
    }

    request.log.info(payload, "HTTP request completed");
  });
}
