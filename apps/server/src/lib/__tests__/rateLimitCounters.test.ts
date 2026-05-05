import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { globalCounters } from "../rateLimitCounters.js";

describe("GlobalCounters", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Force rollover: advance to a new day to reset counters from prior tests
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));
    await globalCounters.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canSubmit / reserveSubmission", () => {
    it("allows submissions under the daily limit", async () => {
      await expect(globalCounters.canSubmit(100)).resolves.toBe(true);
    });

    it("reserveSubmission returns true and blocks at the limit", async () => {
      await expect(globalCounters.reserveSubmission(2)).resolves.toBe(true);
      await expect(globalCounters.reserveSubmission(2)).resolves.toBe(true);
      await expect(globalCounters.reserveSubmission(2)).resolves.toBe(false);
    });

    it("canSubmit returns false at the limit", async () => {
      await globalCounters.reserveSubmission(1);
      await expect(globalCounters.canSubmit(1)).resolves.toBe(false);
    });

    it("recordSubmission increments counter", async () => {
      await globalCounters.recordSubmission();
      await globalCounters.recordSubmission();
      await expect(globalCounters.canSubmit(2)).resolves.toBe(false);
    });
  });

  describe("canImport / recordImport", () => {
    it("allows imports under the daily limit", async () => {
      await expect(globalCounters.canImport(50)).resolves.toBe(true);
    });

    it("recordImport increments and blocks at limit", async () => {
      for (let i = 0; i < 3; i++) {
        await globalCounters.recordImport();
      }
      await expect(globalCounters.canImport(3)).resolves.toBe(false);
    });
  });

  describe("canCallLLM / recordLLMCall", () => {
    it("allows llm calls under the daily limit", async () => {
      await expect(globalCounters.canCallLLM(5)).resolves.toBe(true);
    });

    it("recordLLMCall increments and blocks at the limit", async () => {
      await globalCounters.recordLLMCall();
      await globalCounters.recordLLMCall();

      await expect(globalCounters.canCallLLM(2)).resolves.toBe(false);
    });
  });

  describe("daily rollover", () => {
    it("resets counters when the day changes", async () => {
      await globalCounters.reserveSubmission(1);
      await globalCounters.recordImport();
      await globalCounters.recordLLMCall();
      await expect(globalCounters.canSubmit(1)).resolves.toBe(false);
      await expect(globalCounters.canImport(1)).resolves.toBe(false);
      await expect(globalCounters.canCallLLM(1)).resolves.toBe(false);

      // Advance 48h to guarantee a local-day boundary in any timezone
      vi.setSystemTime(new Date("2099-01-03T12:00:00Z"));
      await expect(globalCounters.canSubmit(1)).resolves.toBe(true);
      await expect(globalCounters.canImport(1)).resolves.toBe(true);
      await expect(globalCounters.canCallLLM(1)).resolves.toBe(true);
    });

    it("does not reset counters within the same day", async () => {
      await globalCounters.reserveSubmission(2);
      await globalCounters.reserveSubmission(2);
      vi.setSystemTime(new Date("2099-01-01T23:59:59Z"));
      await expect(globalCounters.canSubmit(2)).resolves.toBe(false);
    });
  });
});
