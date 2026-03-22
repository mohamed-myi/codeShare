import { beforeEach, describe, expect, it } from "vitest";
import { IpRateLimiter } from "../ipRateLimiter.js";

describe("IpRateLimiter", () => {
  let limiter: IpRateLimiter;

  beforeEach(() => {
    limiter = new IpRateLimiter();
  });

  describe("consume", () => {
    it("allows the first request in a window", () => {
      const result = limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("allows requests up to the limit", () => {
      for (let i = 0; i < 5; i++) {
        expect(limiter.consume("create", "192.168.1.1", 5, 60_000, 1000).allowed).toBe(true);
      }
    });

    it("rejects requests exceeding the limit", () => {
      for (let i = 0; i < 5; i++) {
        limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      const result = limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("returns retryAfterSeconds with minimum of 1", () => {
      for (let i = 0; i < 3; i++) {
        limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      const result = limiter.consume("create", "192.168.1.1", 3, 60_000, 60_500);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBe(1);
    });

    it("resets counter after window expires", () => {
      for (let i = 0; i < 5; i++) {
        limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      const result = limiter.consume("create", "192.168.1.1", 5, 60_000, 61_001);
      expect(result.allowed).toBe(true);
    });

    it("treats different buckets independently", () => {
      for (let i = 0; i < 3; i++) {
        limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      expect(limiter.consume("join", "192.168.1.1", 3, 60_000, 1000).allowed).toBe(true);
    });

    it("treats different keys within same bucket independently", () => {
      for (let i = 0; i < 3; i++) {
        limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      expect(limiter.consume("create", "10.0.0.1", 3, 60_000, 1000).allowed).toBe(true);
    });

    it("calculates retryAfterSeconds based on remaining window time", () => {
      for (let i = 0; i < 3; i++) {
        limiter.consume("create", "192.168.1.1", 3, 60_000, 1000);
      }
      const result = limiter.consume("create", "192.168.1.1", 3, 60_000, 31_000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBe(30);
    });
  });

  describe("clear", () => {
    it("resets all buckets allowing new requests", () => {
      for (let i = 0; i < 5; i++) {
        limiter.consume("create", "192.168.1.1", 5, 60_000, 1000);
      }
      limiter.clear();
      expect(limiter.consume("create", "192.168.1.1", 5, 60_000, 1000).allowed).toBe(true);
    });
  });
});
