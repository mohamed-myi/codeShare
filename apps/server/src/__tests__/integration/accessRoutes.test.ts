import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerPrivateAccessProtection } from "../../plugins/privateAccess.js";
import { registerRateLimit } from "../../plugins/rateLimit.js";
import { accessRoutes } from "../../routes/access.js";
import {
  type AccessInviteRecord,
  type AccessSessionRecord,
  type AccessStore,
  createAccessService,
  createInviteCodeHash,
  createInviteLookupHash,
} from "../../services/AccessService.js";
import { createTestConfig } from "../helpers/configHelper.js";

class MemoryAccessStore implements AccessStore {
  invites: AccessInviteRecord[] = [
    {
      id: "invite-1",
      label: "Recruiter",
      codeHash: createInviteCodeHash("demo-code", "0123456789abcdef"),
      codeLookupHash: createInviteLookupHash("demo-code", "test-access-secret-that-is-long-enough"),
      maxSessions: 3,
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
    },
  ];
  sessions: AccessSessionRecord[] = [];

  async listUsableInvites(at: Date): Promise<AccessInviteRecord[]> {
    return this.invites.filter(
      (invite) =>
        !invite.revokedAt && (!invite.expiresAt || invite.expiresAt.getTime() > at.getTime()),
    );
  }

  async findUsableInviteByLookupHash(
    codeLookupHash: string,
    at: Date,
  ): Promise<AccessInviteRecord | null> {
    return (
      this.invites.find(
        (invite) =>
          invite.codeLookupHash === codeLookupHash &&
          !invite.revokedAt &&
          (!invite.expiresAt || invite.expiresAt.getTime() > at.getTime()),
      ) ?? null
    );
  }

  async createSession(input: {
    inviteId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<AccessSessionRecord | null> {
    const invite = this.invites.find((candidate) => candidate.id === input.inviteId);
    if (!invite) return null;
    const session: AccessSessionRecord = {
      id: `session-${this.sessions.length + 1}`,
      inviteId: invite.id,
      sessionTokenHash: input.sessionTokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      inviteLabel: invite.label,
      inviteExpiresAt: invite.expiresAt,
      inviteRevokedAt: invite.revokedAt,
    };
    this.sessions.push(session);
    invite.lastUsedAt = input.now;
    return session;
  }

  async findSessionById(sessionId: string): Promise<AccessSessionRecord | null> {
    return this.sessions.find((session) => session.id === sessionId) ?? null;
  }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    const session = this.sessions.find((candidate) => candidate.id === sessionId);
    if (session) session.revokedAt = at;
  }
}

async function buildApp(options?: { enabled?: boolean; store?: MemoryAccessStore }) {
  const app = Fastify();
  const config = createTestConfig({
    ENABLE_PRIVATE_ACCESS: options?.enabled ?? true,
    ACCESS_SESSION_SECRET: "test-access-secret-that-is-long-enough",
  });
  const service = createAccessService({
    store: options?.store ?? new MemoryAccessStore(),
    cookieName: config.ACCESS_COOKIE_NAME,
    sessionSecret: config.ACCESS_SESSION_SECRET ?? "",
    sessionTtlDays: config.ACCESS_SESSION_TTL_DAYS,
    secureCookies: false,
  });

  await app.register(accessRoutes, { prefix: "/api", config, accessService: service });
  registerPrivateAccessProtection(app, config, service);
  app.get("/api/protected", async () => ({ ok: true }));
  await app.ready();
  return app;
}

async function buildRateLimitedAccessApp(options?: { trustedProxyIps?: string[] }) {
  const app = Fastify();
  const config = createTestConfig({
    ENABLE_PRIVATE_ACCESS: true,
    ACCESS_SESSION_SECRET: "test-access-secret-that-is-long-enough",
    RATE_LIMIT_ACCESS_LOGIN: 1,
    TRUSTED_PROXY_IPS: options?.trustedProxyIps ?? [],
  });
  const service = createAccessService({
    store: new MemoryAccessStore(),
    cookieName: config.ACCESS_COOKIE_NAME,
    sessionSecret: config.ACCESS_SESSION_SECRET ?? "",
    sessionTtlDays: config.ACCESS_SESSION_TTL_DAYS,
    secureCookies: false,
  });

  await registerRateLimit(app, config);
  await app.register(accessRoutes, { prefix: "/api", config, accessService: service });
  await app.ready();
  return app;
}

describe("private access routes", () => {
  it("blocks protected routes without a valid access session", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/protected" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Access required." });
  });

  it("sets a session cookie for a valid invite and allows protected requests", async () => {
    const app = await buildApp();

    const login = await app.inject({
      method: "POST",
      url: "/api/access/login",
      payload: { code: "demo-code" },
    });

    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({ authenticated: true, label: "Recruiter" });
    const cookie = login.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const response = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: Array.isArray(cookie) ? cookie[0] : cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("immediately blocks existing sessions when their invite is revoked", async () => {
    const store = new MemoryAccessStore();
    const app = await buildApp({ store });
    const login = await app.inject({
      method: "POST",
      url: "/api/access/login",
      payload: { code: "demo-code" },
    });
    const cookie = login.headers["set-cookie"];

    store.sessions[0].inviteRevokedAt = new Date();
    const response = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: Array.isArray(cookie) ? cookie[0] : cookie },
    });

    expect(response.statusCode).toBe(401);
  });

  it("does not consume another invite session when an authenticated browser logs in again", async () => {
    const store = new MemoryAccessStore();
    const app = await buildApp({ store });
    const firstLogin = await app.inject({
      method: "POST",
      url: "/api/access/login",
      payload: { code: "demo-code" },
    });
    const cookie = firstLogin.headers["set-cookie"];

    const secondLogin = await app.inject({
      method: "POST",
      url: "/api/access/login",
      headers: { cookie: Array.isArray(cookie) ? cookie[0] : cookie },
      payload: { code: "demo-code" },
    });

    expect(secondLogin.statusCode).toBe(200);
    expect(secondLogin.json()).toMatchObject({ authenticated: true, label: "Recruiter" });
    expect(store.sessions).toHaveLength(1);
  });

  it("rate limits access login by forwarded client IP from a trusted proxy", async () => {
    const app = await buildRateLimitedAccessApp({
      trustedProxyIps: ["127.0.0.1", "::1", "::ffff:127.0.0.1"],
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/access/login",
      headers: { "x-forwarded-for": "203.0.113.10" },
      payload: { code: "demo-code" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/access/login",
      headers: { "x-forwarded-for": "203.0.113.11" },
      payload: { code: "demo-code" },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it("does not trust forwarded IPs from untrusted remotes for access login limits", async () => {
    const app = await buildRateLimitedAccessApp();

    const first = await app.inject({
      method: "POST",
      url: "/api/access/login",
      headers: { "x-forwarded-for": "203.0.113.10" },
      payload: { code: "demo-code" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/access/login",
      headers: { "x-forwarded-for": "203.0.113.11" },
      payload: { code: "demo-code" },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
  });

  it("does not block protected routes when private access is disabled", async () => {
    const app = await buildApp({ enabled: false });

    const response = await app.inject({ method: "GET", url: "/api/protected" });

    expect(response.statusCode).toBe(200);
  });
});
