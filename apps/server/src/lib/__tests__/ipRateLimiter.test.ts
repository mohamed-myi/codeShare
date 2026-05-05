import { beforeEach, describe, expect, it } from "vitest";
import { IpRateLimiter } from "../ipRateLimiter.js";

describe("IpRateLimiter", () => {
  let limiter: IpRateLimiter;

  beforeEach(() => {
    limiter = new IpRateLimiter();
  });

  describe("consume", () => {
    it("allows the first request in a window", async () => {
      const result = await limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("allows requests up to the limit", async () => {
      for (let i = 0; i < 5; i++) {
        await expect(
          limiter.consume("create", "192.168.1.1", 5, 60_000, 1000),
        ).resolves.toMatchObject({ allowed: true });
      }
    });

    it("rejects requests exceeding the limit", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      const result = await limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("returns retryAfterSeconds with minimum of 1", async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      const result = await limiter.consume("create", "192.168.1.1", 3, 60_000, 60_500);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBe(1);
    });

    it("resets counter after window expires", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      const result = await limiter.consume("create", "192.168.1.1", 5, 60_000, 61_001);
      expect(result.allowed).toBe(true);
    });

    it("treats different buckets independently", async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      await expect(limiter.consume("join", "192.168.1.1", 3, 60_000, 1000)).resolves.toMatchObject({
        allowed: true,
      });
    });

    it("treats different keys within same bucket independently", async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      await expect(limiter.consume("create", "10.0.0.1", 3, 60_000, 1000)).resolves.toMatchObject({
        allowed: true,
      });
    });

    it("calculates retryAfterSeconds based on remaining window time", async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      const result = await limiter.consume("create", "192.168.1.1", 3, 60_000, 31_000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBe(30);
    });
  });

  describe("clear", () => {
    it("resets all buckets allowing new requests", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      await limiter.clear();
      await expect(
        limiter.consume("create", "192.168.1.1", 5, 60_000, 1000),
      ).resolves.toMatchObject({
        allowed: true,
      });
    });
  });
});
