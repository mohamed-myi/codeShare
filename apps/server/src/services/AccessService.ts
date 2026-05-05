import crypto from "node:crypto";
import type { AccessInviteRecord, AccessStore } from "@codeshare/shared";

export type { AccessInviteRecord, AccessSessionRecord, AccessStore } from "@codeshare/shared";

const INVITE_HASH_VERSION = "scrypt:v1";
const COOKIE_VERSION = "v1";
const SESSION_HASH_VERSION = "hmac:sha256";
const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessLoginRejectionReason = "invalid_code" | "session_limit_reached";
export type AccessValidationRejectionReason =
  | "missing_cookie"
  | "invalid_cookie"
  | "session_not_found"
  | "session_revoked"
  | "session_expired"
  | "invite_revoked"
  | "invite_expired";

export type AccessLoginResult =
  | {
      allowed: true;
      cookieHeader: string;
      session: {
        id: string;
        inviteLabel: string;
        expiresAt: Date;
      };
    }
  | { allowed: false; reason: AccessLoginRejectionReason };

export type AccessValidationResult =
  | {
      allowed: true;
      session: {
        id: string;
        inviteId: string;
        inviteLabel: string;
        expiresAt: Date;
      };
    }
  | { allowed: false; reason: AccessValidationRejectionReason };

interface AccessServiceOptions {
  store: AccessStore;
  cookieName: string;
  sessionSecret: string;
  sessionTtlDays: number;
  secureCookies: boolean;
}

export interface AccessService {
  login(code: string, now?: Date): Promise<AccessLoginResult>;
  validateCookie(cookieHeader: string | undefined, now?: Date): Promise<AccessValidationResult>;
  revokeCookie(cookieHeader: string | undefined, now?: Date): Promise<void>;
  buildClearCookieHeader(): string;
}

export function createAccessService(options: AccessServiceOptions): AccessService {
  if (!options.sessionSecret) {
    throw new Error("ACCESS_SESSION_SECRET is required for private access.");
  }

  return {
    login: (code, now = new Date()) => loginWithInviteCode(options, code, now),
    validateCookie: (cookieHeader, now = new Date()) =>
      validateCookieHeader(options, cookieHeader, now),
    revokeCookie: (cookieHeader, now = new Date()) =>
      revokeCookieSession(options, cookieHeader, now),
    buildClearCookieHeader: () => buildClearCookieHeader(options.cookieName, options.secureCookies),
  };
}

export function createInviteCodeHash(code: string, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.scryptSync(normalizeInviteCode(code), salt, 32).toString("hex");
  return `${INVITE_HASH_VERSION}:${salt}:${digest}`;
}

export function verifyInviteCodeHash(code: string, codeHash: string): boolean {
  const parsed = parseInviteCodeHash(codeHash);
  if (!parsed) return false;

  const actual = crypto.scryptSync(normalizeInviteCode(code), parsed.salt, 32);
  const expected = Buffer.from(parsed.digest, "hex");
  return timingSafeEqual(actual, expected);
}

async function loginWithInviteCode(
  options: AccessServiceOptions,
  code: string,
  now: Date,
): Promise<AccessLoginResult> {
  const invite = await findMatchingInvite(options.store, code, now);
  if (!invite) {
    return { allowed: false, reason: "invalid_code" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = createSessionTokenHash(token, options.sessionSecret);
  const expiresAt = new Date(now.getTime() + options.sessionTtlDays * DAY_MS);
  const session = await options.store.createSession({
    inviteId: invite.id,
    sessionTokenHash,
    expiresAt,
    now,
  });
  if (!session) {
    return { allowed: false, reason: "session_limit_reached" };
  }

  return {
    allowed: true,
    cookieHeader: buildSetCookieHeader(
      options.cookieName,
      createCookieValue(session.id, token, options.sessionSecret),
      expiresAt,
      now,
      options.secureCookies,
    ),
    session: {
      id: session.id,
      inviteLabel: session.inviteLabel,
      expiresAt: session.expiresAt,
    },
  };
}

async function validateCookieHeader(
  options: AccessServiceOptions,
  cookieHeader: string | undefined,
  now: Date,
): Promise<AccessValidationResult> {
  const cookieValue = extractCookie(cookieHeader, options.cookieName);
  if (cookieValue === undefined) {
    return { allowed: false, reason: "missing_cookie" };
  }
  if (cookieValue === null) return { allowed: false, reason: "invalid_cookie" };

  const parsed = parseCookieValue(cookieValue, options.sessionSecret);
  if (!parsed) {
    return { allowed: false, reason: "invalid_cookie" };
  }

  const session = await options.store.findSessionById(parsed.sessionId);
  if (!session) return { allowed: false, reason: "session_not_found" };
  if (
    !timingSafeStringEqual(
      session.sessionTokenHash,
      createSessionTokenHash(parsed.token, options.sessionSecret),
    )
  ) {
    return { allowed: false, reason: "invalid_cookie" };
  }
  if (session.revokedAt) return { allowed: false, reason: "session_revoked" };
  if (session.expiresAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "session_expired" };
  }
  if (session.inviteRevokedAt) return { allowed: false, reason: "invite_revoked" };
  if (session.inviteExpiresAt && session.inviteExpiresAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "invite_expired" };
  }

  return {
    allowed: true,
    session: {
      id: session.id,
      inviteId: session.inviteId,
      inviteLabel: session.inviteLabel,
      expiresAt: session.expiresAt,
    },
  };
}

async function revokeCookieSession(
  options: AccessServiceOptions,
  cookieHeader: string | undefined,
  now: Date,
): Promise<void> {
  const cookieValue = extractCookie(cookieHeader, options.cookieName);
  if (!cookieValue) return;
  const parsed = parseCookieValue(cookieValue, options.sessionSecret);
  if (!parsed) return;
  await options.store.revokeSession(parsed.sessionId, now);
}

async function findMatchingInvite(
  store: AccessStore,
  code: string,
  now: Date,
): Promise<AccessInviteRecord | null> {
  const invites = await store.listUsableInvites(now);
  return invites.find((invite) => verifyInviteCodeHash(code, invite.codeHash)) ?? null;
}

function normalizeInviteCode(code: string): string {
  return code.trim();
}

function parseInviteCodeHash(codeHash: string): { salt: string; digest: string } | null {
  const [algorithm, version, salt, digest] = codeHash.split(":");
  if (`${algorithm}:${version}` !== INVITE_HASH_VERSION || !salt || !digest) {
    return null;
  }
  return { salt, digest };
}

function createSessionTokenHash(token: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(token).digest("hex");
  return `${SESSION_HASH_VERSION}:${digest}`;
}

function createCookieValue(sessionId: string, token: string, secret: string): string {
  const payload = `${COOKIE_VERSION}.${sessionId}.${token}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

function parseCookieValue(
  cookieValue: string,
  secret: string,
): { sessionId: string; token: string } | null {
  const [version, sessionId, token, signature] = cookieValue.split(".");
  if (version !== COOKIE_VERSION || !sessionId || !token || !signature) {
    return null;
  }

  const payload = `${version}.${sessionId}.${token}`;
  if (!timingSafeStringEqual(signature, sign(payload, secret))) {
    return null;
  }
  return { sessionId, token };
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function extractCookie(cookieHeader: string | undefined, name: string): string | null | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValueParts.join("="));
      } catch {
        return null;
      }
    }
  }
  return undefined;
}

function buildSetCookieHeader(
  name: string,
  value: string,
  expiresAt: Date,
  now: Date,
  secureCookies: boolean,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))}`,
  ];
  if (secureCookies) parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookieHeader(name: string, secureCookies: boolean): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
  ];
  if (secureCookies) parts.push("Secure");
  return parts.join("; ");
}

function timingSafeStringEqual(left: string, right: string): boolean {
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function timingSafeEqual(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
