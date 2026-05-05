import { describe, expect, it } from "vitest";
import {
  type AccessInviteRecord,
  type AccessSessionRecord,
  type AccessStore,
  createAccessService,
  createInviteCodeHash,
} from "../AccessService.js";

const secret = "test-access-secret-that-is-long-enough";
const now = new Date("2026-05-04T12:00:00.000Z");

class MemoryAccessStore implements AccessStore {
  invites: AccessInviteRecord[] = [];
  sessions: AccessSessionRecord[] = [];

  async listUsableInvites(at: Date): Promise<AccessInviteRecord[]> {
    return this.invites.filter(
      (invite) =>
        !invite.revokedAt && (!invite.expiresAt || invite.expiresAt.getTime() > at.getTime()),
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
    const activeSessions = this.sessions.filter(
      (session) =>
        session.inviteId === invite.id &&
        !session.revokedAt &&
        session.expiresAt.getTime() > input.now.getTime(),
    );
    if (activeSessions.length >= invite.maxSessions) return null;

    const session: AccessSessionRecord = {
      id: `session-${this.sessions.length + 1}`,
      inviteId: input.inviteId,
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

function buildStore(): MemoryAccessStore {
  const store = new MemoryAccessStore();
  store.invites.push({
    id: "invite-1",
    label: "Recruiter",
    codeHash: createInviteCodeHash("valid-code", "0123456789abcdef"),
    maxSessions: 3,
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
  });
  return store;
}

describe("AccessService", () => {
  it("creates a signed access cookie for a valid invite code", async () => {
    const store = buildStore();
    const service = createAccessService({
      store,
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });

    const login = await service.login("valid-code", now);

    expect(login.allowed).toBe(true);
    if (!login.allowed) throw new Error("login unexpectedly rejected");
    expect(login.cookieHeader).toContain("codeshare_access=");
    expect(login.cookieHeader).toContain("Max-Age=2592000");
    expect(login.session.expiresAt.toISOString()).toBe("2026-06-03T12:00:00.000Z");

    const validation = await service.validateCookie(login.cookieHeader, now);
    expect(validation.allowed).toBe(true);
    if (!validation.allowed) throw new Error("cookie unexpectedly rejected");
    expect(validation.session.inviteLabel).toBe("Recruiter");
  });

  it("rejects an invalid invite code without revealing which codes exist", async () => {
    const service = createAccessService({
      store: buildStore(),
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });

    const login = await service.login("wrong-code", now);

    expect(login).toEqual({ allowed: false, reason: "invalid_code" });
  });

  it("rejects new sessions when the invite is at its active session limit", async () => {
    const store = buildStore();
    store.invites[0].maxSessions = 1;
    const service = createAccessService({
      store,
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });

    const first = await service.login("valid-code", now);
    const second = await service.login("valid-code", now);

    expect(first.allowed).toBe(true);
    expect(second).toEqual({ allowed: false, reason: "session_limit_reached" });
  });

  it("rejects an existing session after its invite is revoked", async () => {
    const store = buildStore();
    const service = createAccessService({
      store,
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });
    const login = await service.login("valid-code", now);
    if (!login.allowed) throw new Error("login unexpectedly rejected");

    store.sessions[0].inviteRevokedAt = new Date("2026-05-04T12:01:00.000Z");
    const validation = await service.validateCookie(login.cookieHeader, now);

    expect(validation).toEqual({ allowed: false, reason: "invite_revoked" });
  });

  it("rejects tampered access cookie values", async () => {
    const store = buildStore();
    const service = createAccessService({
      store,
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });
    const login = await service.login("valid-code", now);
    if (!login.allowed) throw new Error("login unexpectedly rejected");

    const validation = await service.validateCookie(
      login.cookieHeader.replace("session-1", "session-x"),
      now,
    );

    expect(validation).toEqual({ allowed: false, reason: "invalid_cookie" });
  });

  it("rejects malformed encoded cookie values without throwing", async () => {
    const service = createAccessService({
      store: buildStore(),
      cookieName: "codeshare_access",
      sessionSecret: secret,
      sessionTtlDays: 30,
      secureCookies: false,
    });

    const validation = await service.validateCookie("codeshare_access=%", now);

    expect(validation).toEqual({ allowed: false, reason: "invalid_cookie" });
  });
});
