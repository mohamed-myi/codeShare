import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryReliabilityStore } from "../reliabilityStore.js";

describe("MemoryReliabilityStore", () => {
  let store: MemoryReliabilityStore;

  beforeEach(() => {
    store = new MemoryReliabilityStore();
  });

  it("enforces fixed-window limits per bucket and key", async () => {
    await expect(
      store.consumeFixedWindow({
        bucket: "ws-connect",
        key: "192.0.2.10",
        limit: 2,
        windowMs: 60_000,
        now: 1_000,
      }),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await store.consumeFixedWindow({
      bucket: "ws-connect",
      key: "192.0.2.10",
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    });

    const rejected = await store.consumeFixedWindow({
      bucket: "ws-connect",
      key: "192.0.2.10",
      limit: 2,
      windowMs: 60_000,
      now: 31_000,
    });

    expect(rejected).toEqual({ allowed: false, retryAfterSeconds: 30 });
    await expect(
      store.consumeFixedWindow({
        bucket: "join-attempt",
        key: "192.0.2.10",
        limit: 2,
        windowMs: 60_000,
        now: 31_000,
      }),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("resets fixed-window limits when the window expires", async () => {
    await store.consumeFixedWindow({
      bucket: "imports",
      key: "198.51.100.2",
      limit: 1,
      windowMs: 60_000,
      now: 1_000,
    });

    const result = await store.consumeFixedWindow({
      bucket: "imports",
      key: "198.51.100.2",
      limit: 1,
      windowMs: 60_000,
      now: 61_001,
    });

    expect(result.allowed).toBe(true);
  });

  it("reserves daily quotas atomically per resource and UTC day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));

    await expect(store.reserveDailyQuota({ resource: "judge0", limit: 2 })).resolves.toMatchObject({
      allowed: true,
      used: 1,
    });
    await store.reserveDailyQuota({ resource: "judge0", limit: 2 });
    await expect(store.reserveDailyQuota({ resource: "judge0", limit: 2 })).resolves.toMatchObject({
      allowed: false,
      used: 2,
      retryAfterSeconds: expect.any(Number),
    });
    await expect(store.reserveDailyQuota({ resource: "llm", limit: 2 })).resolves.toMatchObject({
      allowed: true,
      used: 1,
    });

    vi.setSystemTime(new Date("2099-01-02T00:00:01Z"));
    await expect(store.reserveDailyQuota({ resource: "judge0", limit: 2 })).resolves.toMatchObject({
      allowed: true,
      used: 1,
    });
    vi.useRealTimers();
  });

  it("reports daily usage snapshots and clears in-memory state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));
    await store.reserveDailyQuota({ resource: "judge0", limit: 10 });
    await store.reserveDailyQuota({ resource: "imports", limit: 10 });

    await expect(store.getUsageSnapshot()).resolves.toEqual({
      judge0: 1,
      imports: 1,
      llm: 0,
    });

    await store.clear();
    await expect(store.getUsageSnapshot()).resolves.toEqual({
      judge0: 0,
      imports: 0,
      llm: 0,
    });
    vi.useRealTimers();
  });

  it("reports healthy memory-store status", async () => {
    await expect(store.health()).resolves.toEqual({ available: true, kind: "memory" });
  });
});
