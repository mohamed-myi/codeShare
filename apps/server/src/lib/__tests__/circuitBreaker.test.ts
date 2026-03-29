import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CircuitState, createCircuitBreaker } from "../circuitBreaker.js";
import { DependencyError } from "../dependencyError.js";

describe("createCircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("CLOSED passes through successful calls", async () => {
    const cb = createCircuitBreaker({ name: "test" });
    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.getState()).toBe("closed");
  });

  it("CLOSED records failure, stays CLOSED below threshold", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 3 });

    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");

    expect(cb.getState()).toBe("closed");
  });

  it("transitions CLOSED -> OPEN after failureThreshold consecutive failures", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }

    expect(cb.getState()).toBe("open");
  });

  it("OPEN rejects immediately with DependencyError (circuit_open)", async () => {
    const cb = createCircuitBreaker({ name: "judge0", failureThreshold: 1 });
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();

    expect(cb.getState()).toBe("open");

    const fn = vi.fn();
    const error = await cb.execute(fn).catch((e) => e);

    expect(fn).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(DependencyError);
    expect(error).toMatchObject({
      dependency: "judge0",
      errorType: "circuit_open",
    });
  });

  it("transitions OPEN -> HALF_OPEN after resetTimeoutMs", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 1, resetTimeoutMs: 5000 });
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(5000);
    expect(cb.getState()).toBe("half_open");
  });

  it("HALF_OPEN success -> CLOSED", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 1, resetTimeoutMs: 5000 });
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();

    vi.advanceTimersByTime(5000);
    expect(cb.getState()).toBe("half_open");

    const result = await cb.execute(async () => "recovered");
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");
  });

  it("HALF_OPEN failure -> OPEN", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 1, resetTimeoutMs: 5000 });
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();

    vi.advanceTimersByTime(5000);
    expect(cb.getState()).toBe("half_open");

    await expect(
      cb.execute(async () => {
        throw new Error("fail again");
      }),
    ).rejects.toThrow("fail again");
    expect(cb.getState()).toBe("open");
  });

  it("success resets consecutive failure count", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 3 });

    await expect(
      cb.execute(async () => {
        throw new Error("f1");
      }),
    ).rejects.toThrow();
    await expect(
      cb.execute(async () => {
        throw new Error("f2");
      }),
    ).rejects.toThrow();
    await cb.execute(async () => "ok");

    // Two more failures should NOT trip -- count was reset
    await expect(
      cb.execute(async () => {
        throw new Error("f3");
      }),
    ).rejects.toThrow();
    await expect(
      cb.execute(async () => {
        throw new Error("f4");
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe("closed");
  });

  it("onStateChange callback fires with correct from/to", async () => {
    const changes: Array<{ from: CircuitState; to: CircuitState }> = [];
    const cb = createCircuitBreaker({
      name: "test",
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      onStateChange: (from, to) => changes.push({ from, to }),
    });

    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(changes).toEqual([{ from: "closed", to: "open" }]);

    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([
      { from: "closed", to: "open" },
      { from: "open", to: "half_open" },
    ]);

    await cb.execute(async () => "ok");
    expect(changes).toEqual([
      { from: "closed", to: "open" },
      { from: "open", to: "half_open" },
      { from: "half_open", to: "closed" },
    ]);
  });

  it("reset() returns to CLOSED", async () => {
    const cb = createCircuitBreaker({ name: "test", failureThreshold: 1 });
    await expect(
      cb.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    cb.reset();
    expect(cb.getState()).toBe("closed");

    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
  });
});
