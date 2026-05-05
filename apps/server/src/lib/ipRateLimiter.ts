import {
  MemoryReliabilityStore,
  type RateLimitCheckResult,
  type ReliabilityStore,
} from "./reliabilityStore.js";

/**
 * Fixed-window limiter keyed by bucket + client identifier.
 * Backed by memory in dev/test and Redis/Valkey in production.
 */
export class IpRateLimiter {
  constructor(private readonly store: ReliabilityStore = new MemoryReliabilityStore()) {}

  async consume(
    bucket: string,
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): Promise<RateLimitCheckResult> {
    return this.store.consumeFixedWindow({
      bucket,
      key,
      limit,
      windowMs,
      now,
    });
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}

export interface RateLimitConsumer {
  consume(
    bucket: string,
    key: string,
    limit: number,
    windowMs: number,
    now?: number,
  ): Promise<RateLimitCheckResult> | RateLimitCheckResult;
  clear?(): Promise<void> | void;
}
