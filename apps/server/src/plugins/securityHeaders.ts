import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

function websocketOriginFor(origin: string): string | null {
  if (origin.startsWith("http://")) {
    return `ws://${origin.slice("http://".length)}`;
  }

  if (origin.startsWith("https://")) {
    return `wss://${origin.slice("https://".length)}`;
  }

  return null;
}

function buildContentSecurityPolicy(config: Config): string {
  const connectSources = new Set<string>(["'self'"]);
  for (const origin of config.ALLOWED_ORIGINS) {
    connectSources.add(origin);
    const websocketOrigin = websocketOriginFor(origin);
    if (websocketOrigin) {
      connectSources.add(websocketOrigin);
    }
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${Array.from(connectSources).join(" ")}`,
    "worker-src 'self' blob:",
  ].join("; ");
}

export async function registerSecurityHeaders(app: FastifyInstance, config: Config): Promise<void> {
  const contentSecurityPolicy = buildContentSecurityPolicy(config);

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("Content-Security-Policy", contentSecurityPolicy);
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Resource-Policy", "same-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");

    if (config.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }

    return payload;
  });
}
