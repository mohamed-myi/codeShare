import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerSecurityHeaders } from "../../plugins/securityHeaders.js";
import { createTestConfig } from "../helpers/configHelper.js";

describe("securityHeaders plugin", () => {
  it("adds strict baseline security headers", async () => {
    const app = Fastify();
    await registerSecurityHeaders(app, createTestConfig());
    app.get("/health", async () => ({ ok: true }));
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
  });

  it("adds hsts in production", async () => {
    const app = Fastify();
    await registerSecurityHeaders(app, createTestConfig({ NODE_ENV: "production" }));
    app.get("/health", async () => ({ ok: true }));
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.headers["strict-transport-security"]).toContain("max-age");
  });
});
