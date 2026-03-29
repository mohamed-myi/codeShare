import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { globalCounters } from "../rateLimitCounters.js";

describe("GlobalCounters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Force rollover: advance to a new day to reset counters from prior tests
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));
    globalCounters.canSubmit(1_000_000); // triggers rolloverIfNeeded
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canSubmit / reserveSubmission", () => {
    it("allows submissions under the daily limit", () => {
      expect(globalCounters.canSubmit(100)).toBe(true);
    });

    it("reserveSubmission returns true and blocks at the limit", () => {
      expect(globalCounters.reserveSubmission(2)).toBe(true);
      expect(globalCounters.reserveSubmission(2)).toBe(true);
      expect(globalCounters.reserveSubmission(2)).toBe(false);
    });

    it("canSubmit returns false at the limit", () => {
      globalCounters.reserveSubmission(1);
      expect(globalCounters.canSubmit(1)).toBe(false);
    });

    it("recordSubmission increments counter", () => {
      globalCounters.recordSubmission();
      globalCounters.recordSubmission();
      expect(globalCounters.canSubmit(2)).toBe(false);
    });
  });

  describe("canImport / recordImport", () => {
    it("allows imports under the daily limit", () => {
      expect(globalCounters.canImport(50)).toBe(true);
    });

    it("recordImport increments and blocks at limit", () => {
      for (let i = 0; i < 3; i++) {
        globalCounters.recordImport();
      }
      expect(globalCounters.canImport(3)).toBe(false);
    });
  });

  describe("canCallLLM / recordLLMCall", () => {
    it("allows llm calls under the daily limit", () => {
      expect(globalCounters.canCallLLM(5)).toBe(true);
    });

    it("recordLLMCall increments and blocks at the limit", () => {
      globalCounters.recordLLMCall();
      globalCounters.recordLLMCall();

      expect(globalCounters.canCallLLM(2)).toBe(false);
    });
  });

  describe("daily rollover", () => {
    it("resets counters when the day changes", () => {
      globalCounters.reserveSubmission(1);
      globalCounters.recordImport();
      globalCounters.recordLLMCall();
      expect(globalCounters.canSubmit(1)).toBe(false);
      expect(globalCounters.canImport(1)).toBe(false);
      expect(globalCounters.canCallLLM(1)).toBe(false);

      // Advance 48h to guarantee a local-day boundary in any timezone
      vi.setSystemTime(new Date("2099-01-03T12:00:00Z"));
      expect(globalCounters.canSubmit(1)).toBe(true);
      expect(globalCounters.canImport(1)).toBe(true);
      expect(globalCounters.canCallLLM(1)).toBe(true);
    });

    it("does not reset counters within the same day", () => {
      globalCounters.reserveSubmission(2);
      globalCounters.reserveSubmission(2);
      vi.setSystemTime(new Date("2099-01-01T23:59:59Z"));
      expect(globalCounters.canSubmit(2)).toBe(false);
    });
  });
});
