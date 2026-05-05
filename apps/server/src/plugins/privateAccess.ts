import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type { AccessService } from "../services/AccessService.js";

export function registerPrivateAccessProtection(
  app: FastifyInstance,
  config: Config,
  accessService?: AccessService,
): void {
  if (!config.ENABLE_PRIVATE_ACCESS) {
    return;
  }

  app.addHook("onRequest", async (request, reply) => {
    if (isPublicAccessPath(request.url)) {
      return;
    }

    const validation = await accessService
      ?.validateCookie(request.headers.cookie)
      .catch(() => ({ allowed: false as const, reason: "service_unavailable" }));
    if (validation?.allowed) {
      return;
    }

    request.log.warn(
      {
        event: "private_access_request_rejected",
        route: request.routeOptions.url ?? request.url,
        reason: validation?.reason ?? "service_unavailable",
      },
      "Private access request rejected",
    );
    return reply.status(401).send({ error: "Access required." });
  });
}

function isPublicAccessPath(url: string): boolean {
  const pathname = url.split("?")[0];
  return (
    pathname.startsWith("/api/access/") ||
    pathname === "/api/health" ||
    pathname === "/api/live" ||
    pathname === "/api/ready"
  );
}
