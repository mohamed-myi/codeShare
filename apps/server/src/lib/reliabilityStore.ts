import { createClient } from "redis";

export type ReliabilityStoreKind = "memory" | "redis";
export type DailyQuotaResource = "judge0" | "imports" | "llm";

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface DailyQuotaReservation extends RateLimitCheckResult {
  used: number;
  limit: number;
}

export interface FixedWindowLimitOptions {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface DailyQuotaOptions {
  resource: DailyQuotaResource;
  limit: number;
  now?: number;
}

export interface DailyUsageSnapshot {
  judge0: number;
  imports: number;
  llm: number;
}

export interface ReliabilityStoreHealth {
  available: boolean;
  kind: ReliabilityStoreKind;
  error?: string;
}

export interface ReliabilityStore {
  readonly kind: ReliabilityStoreKind;
  consumeFixedWindow(options: FixedWindowLimitOptions): Promise<RateLimitCheckResult>;
  reserveDailyQuota(options: DailyQuotaOptions): Promise<DailyQuotaReservation>;
  getUsageSnapshot(now?: number): Promise<DailyUsageSnapshot>;
  health(): Promise<ReliabilityStoreHealth>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

interface FixedWindowEntry {
  count: number;
  resetAt: number;
}

type DailyCounterMap = Record<DailyQuotaResource, number>;

const DAILY_RESOURCES: DailyQuotaResource[] = ["judge0", "imports", "llm"];

function blankDailyCounters(): DailyCounterMap {
  return {
    judge0: 0,
    imports: 0,
    llm: 0,
  };
}

function utcDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function msUntilNextUtcDay(now = Date.now()): number {
  const current = new Date(now);
  const nextDay = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1,
  );
  return Math.max(1, nextDay - now);
}

function retryAfterSeconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

export class MemoryReliabilityStore implements ReliabilityStore {
  readonly kind = "memory" as const;

  private readonly fixedWindows = new Map<string, FixedWindowEntry>();
  private readonly dailyCounters = new Map<string, DailyCounterMap>();

  async consumeFixedWindow(options: FixedWindowLimitOptions): Promise<RateLimitCheckResult> {
    const now = options.now ?? Date.now();
    const key = `${options.bucket}:${options.key}`;
    const existing = this.fixedWindows.get(key);

    if (!existing || existing.resetAt <= now) {
      this.fixedWindows.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(existing.resetAt - now),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async reserveDailyQuota(options: DailyQuotaOptions): Promise<DailyQuotaReservation> {
    const now = options.now ?? Date.now();
    const day = utcDayKey(now);
    const counters = this.getOrCreateDailyCounters(day);
    const used = counters[options.resource];

    if (used >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(msUntilNextUtcDay(now)),
        used,
        limit: options.limit,
      };
    }

    const nextUsed = used + 1;
    counters[options.resource] = nextUsed;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      used: nextUsed,
      limit: options.limit,
    };
  }

  async getUsageSnapshot(now = Date.now()): Promise<DailyUsageSnapshot> {
    return { ...this.getOrCreateDailyCounters(utcDayKey(now)) };
  }

  async health(): Promise<ReliabilityStoreHealth> {
    return { available: true, kind: this.kind };
  }

  async clear(): Promise<void> {
    this.fixedWindows.clear();
    this.dailyCounters.clear();
  }

  async close(): Promise<void> {
    await this.clear();
  }

  private getOrCreateDailyCounters(day: string): DailyCounterMap {
    const existing = this.dailyCounters.get(day);
    if (existing) {
      return existing;
    }

    const counters = blankDailyCounters();
    this.dailyCounters.set(day, counters);
    return counters;
  }
}

type RedisCommandClient = {
  readonly isOpen: boolean;
  connect(): Promise<unknown>;
  quit(): Promise<unknown>;
  sendCommand(command: string[]): Promise<unknown>;
};

export interface RedisReliabilityStoreOptions {
  url: string;
  connectTimeoutMs: number;
  prefix?: string;
}

const RESERVE_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
if current > tonumber(ARGV[1]) then
  return {0, current - 1, ttl}
end
return {1, current, ttl}
`;

export class RedisReliabilityStore implements ReliabilityStore {
  readonly kind = "redis" as const;

  private readonly client: RedisCommandClient;
  private readonly prefix: string;

  constructor(options: RedisReliabilityStoreOptions) {
    this.client = createClient({
      url: options.url,
      socket: {
        connectTimeout: options.connectTimeoutMs,
      },
    }) as unknown as RedisCommandClient;
    this.prefix = options.prefix ?? "codeshare";
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async consumeFixedWindow(options: FixedWindowLimitOptions): Promise<RateLimitCheckResult> {
    await this.connect();
    const now = options.now ?? Date.now();
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
    const ttlMs = windowStart + options.windowMs - now;
    const redisKey = this.redisKey("fixed", options.bucket, options.key, String(windowStart));
    const result = await this.reserve(redisKey, options.limit, ttlMs);
    return {
      allowed: result.allowed,
      retryAfterSeconds: result.allowed ? 0 : retryAfterSeconds(result.ttlMs),
    };
  }

  async reserveDailyQuota(options: DailyQuotaOptions): Promise<DailyQuotaReservation> {
    await this.connect();
    const now = options.now ?? Date.now();
    const redisKey = this.dailyQuotaKey(options.resource, now);
    const result = await this.reserve(redisKey, options.limit, msUntilNextUtcDay(now) + 86_400_000);
    return {
      allowed: result.allowed,
      retryAfterSeconds: result.allowed ? 0 : retryAfterSeconds(result.ttlMs),
      used: result.used,
      limit: options.limit,
    };
  }

  async getUsageSnapshot(now = Date.now()): Promise<DailyUsageSnapshot> {
    await this.connect();
    const entries = await Promise.all(
      DAILY_RESOURCES.map(async (resource) => {
        const value = await this.client.sendCommand(["GET", this.dailyQuotaKey(resource, now)]);
        return [resource, Number(value ?? 0)] as const;
      }),
    );

    return entries.reduce<DailyUsageSnapshot>((snapshot, [resource, value]) => {
      snapshot[resource] = Number.isFinite(value) ? value : 0;
      return snapshot;
    }, blankDailyCounters());
  }

  async health(): Promise<ReliabilityStoreHealth> {
    try {
      await this.connect();
      await this.client.sendCommand(["PING"]);
      return { available: true, kind: this.kind };
    } catch (error) {
      return {
        available: false,
        kind: this.kind,
        error: error instanceof Error ? error.message : "Redis unavailable",
      };
    }
  }

  async clear(): Promise<void> {
    await this.connect();
    const keys = await this.client.sendCommand(["KEYS", this.redisKey("*")]);
    if (!Array.isArray(keys) || keys.length === 0) {
      return;
    }
    await this.client.sendCommand(["DEL", ...keys.map(String)]);
  }

  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private async reserve(
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<{ allowed: boolean; used: number; ttlMs: number }> {
    const raw = await this.client.sendCommand([
      "EVAL",
      RESERVE_SCRIPT,
      "1",
      key,
      String(limit),
      String(Math.max(1, ttlMs)),
    ]);

    if (!Array.isArray(raw) || raw.length < 3) {
      throw new Error("Unexpected Redis quota response.");
    }

    const allowed = Number(raw[0]) === 1;
    const used = Number(raw[1]);
    const ttl = Number(raw[2]);
    return {
      allowed,
      used: Number.isFinite(used) ? used : 0,
      ttlMs: Number.isFinite(ttl) && ttl > 0 ? ttl : 1,
    };
  }

  private dailyQuotaKey(resource: DailyQuotaResource, now: number): string {
    return this.redisKey("daily", resource, utcDayKey(now));
  }

  private redisKey(...parts: string[]): string {
    return [this.prefix, ...parts].join(":");
  }
}

export async function createReliabilityStore(options: {
  kind: ReliabilityStoreKind;
  redisUrl?: string;
  redisConnectTimeoutMs: number;
}): Promise<ReliabilityStore> {
  if (options.kind === "memory") {
    return new MemoryReliabilityStore();
  }

  if (!options.redisUrl) {
    throw new Error("REDIS_URL is required when RELIABILITY_STORE=redis.");
  }

  const store = new RedisReliabilityStore({
    url: options.redisUrl,
    connectTimeoutMs: options.redisConnectTimeoutMs,
  });
  await store.connect();
  return store;
}
