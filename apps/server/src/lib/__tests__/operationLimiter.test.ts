import { describe, expect, it, vi } from "vitest";
import { OperationLimitExceededError, OperationLimiter } from "../operationLimiter.js";

describe("OperationLimiter", () => {
  it("runs work immediately when capacity is available", async () => {
    const limiter = new OperationLimiter({ name: "judge0", maxInFlight: 1, maxQueue: 0 });

    await expect(limiter.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
    expect(limiter.snapshot()).toEqual({
      name: "judge0",
      active: 0,
      queued: 0,
      maxInFlight: 1,
      maxQueue: 0,
    });
  });

  it("queues work up to maxQueue and drains in order", async () => {
    const limiter = new OperationLimiter({ name: "llm", maxInFlight: 1, maxQueue: 1 });
    let releaseFirst: (() => void) | undefined;
    const first = limiter.run(
      () =>
        new Promise<string>((resolve) => {
          releaseFirst = () => resolve("first");
        }),
    );
    const secondWork = vi.fn().mockResolvedValue("second");

    const second = limiter.run(secondWork);
    expect(limiter.snapshot()).toMatchObject({ active: 1, queued: 1 });
    expect(secondWork).not.toHaveBeenCalled();

    releaseFirst?.();

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(secondWork).toHaveBeenCalledOnce();
    expect(limiter.snapshot()).toMatchObject({ active: 0, queued: 0 });
  });

  it("rejects quickly when active and queued work are saturated", async () => {
    const limiter = new OperationLimiter({ name: "imports", maxInFlight: 1, maxQueue: 0 });
    void limiter.run(() => new Promise(() => {}));

    await expect(limiter.run(() => Promise.resolve("overflow"))).rejects.toBeInstanceOf(
      OperationLimitExceededError,
    );
    await expect(limiter.run(() => Promise.resolve("overflow"))).rejects.toMatchObject({
      operation: "imports",
      retryAfterSeconds: 1,
    });
  });
});
