export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory limiter keyed by bucket + client identifier.
 * Accepted for MVP because the server is single-process.
 */
export class IpRateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();

  consume(
    bucket: string,
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): RateLimitCheckResult {
    const bucketKey = `${bucket}:${key}`;
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.buckets.clear();
  }
}
