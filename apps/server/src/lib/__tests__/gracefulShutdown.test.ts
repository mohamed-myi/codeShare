import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGracefulShutdown,
  registerProcessErrorHandlers,
  type ShutdownDeps,
} from "../gracefulShutdown.js";

function createMockDeps(overrides?: Partial<ShutdownDeps>): ShutdownDeps {
  return {
    httpServer: { close: vi.fn((cb: () => void) => cb()) } as unknown as ShutdownDeps["httpServer"],
    io: { close: vi.fn((cb: () => void) => cb()) } as unknown as ShutdownDeps["io"],
    wss: { close: vi.fn((cb: () => void) => cb()) } as unknown as ShutdownDeps["wss"],
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    } as unknown as ShutdownDeps["logger"],
    destroyAllDocs: vi.fn(),
    resetRooms: vi.fn(),
    closePool: vi.fn().mockResolvedValue(undefined),
    forceTimeoutMs: 10_000,
    ...overrides,
  };
}

describe("createGracefulShutdown", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls shutdown steps in correct order", async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      httpServer: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("httpServer.close");
          cb();
        }),
      } as unknown as ShutdownDeps["httpServer"],
      io: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("io.close");
          cb();
        }),
      } as unknown as ShutdownDeps["io"],
      wss: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("wss.close");
          cb();
        }),
      } as unknown as ShutdownDeps["wss"],
      destroyAllDocs: vi.fn(() => {
        callOrder.push("destroyAllDocs");
      }),
      resetRooms: vi.fn(() => {
        callOrder.push("resetRooms");
      }),
      closePool: vi.fn(async () => {
        callOrder.push("closePool");
      }),
    });

    const { shutdown } = createGracefulShutdown(deps);
    await shutdown();

    expect(callOrder).toEqual([
      "httpServer.close",
      "io.close",
      "wss.close",
      "destroyAllDocs",
      "resetRooms",
      "closePool",
    ]);
  });

  it("httpServer.close() called before io.close()", async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      httpServer: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("http");
          cb();
        }),
      } as unknown as ShutdownDeps["httpServer"],
      io: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("io");
          cb();
        }),
      } as unknown as ShutdownDeps["io"],
    });

    const { shutdown } = createGracefulShutdown(deps);
    await shutdown();

    const httpIdx = callOrder.indexOf("http");
    const ioIdx = callOrder.indexOf("io");
    expect(httpIdx).toBeLessThan(ioIdx);
  });

  it("pool.end() called last", async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      httpServer: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("http");
          cb();
        }),
      } as unknown as ShutdownDeps["httpServer"],
      io: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("io");
          cb();
        }),
      } as unknown as ShutdownDeps["io"],
      wss: {
        close: vi.fn((cb: () => void) => {
          callOrder.push("wss");
          cb();
        }),
      } as unknown as ShutdownDeps["wss"],
      destroyAllDocs: vi.fn(() => {
        callOrder.push("docs");
      }),
      resetRooms: vi.fn(() => {
        callOrder.push("rooms");
      }),
      closePool: vi.fn(async () => {
        callOrder.push("pool");
      }),
    });

    const { shutdown } = createGracefulShutdown(deps);
    await shutdown();

    expect(callOrder[callOrder.length - 1]).toBe("pool");
  });

  it("double invocation is no-op (deps called once)", async () => {
    const deps = createMockDeps();
    const { shutdown } = createGracefulShutdown(deps);

    await Promise.all([shutdown(), shutdown()]);

    expect(deps.closePool).toHaveBeenCalledTimes(1);
  });

  it("isShuttingDown() returns true after first call", async () => {
    const deps = createMockDeps();
    const { shutdown, isShuttingDown } = createGracefulShutdown(deps);

    expect(isShuttingDown()).toBe(false);
    const p = shutdown();
    expect(isShuttingDown()).toBe(true);
    await p;
    expect(isShuttingDown()).toBe(true);
  });

  it("continues cleanup if one step throws", async () => {
    const deps = createMockDeps({
      io: {
        close: vi.fn(() => {
          throw new Error("io close failed");
        }),
      } as unknown as ShutdownDeps["io"],
    });

    const { shutdown } = createGracefulShutdown(deps);
    await shutdown();

    expect(deps.closePool).toHaveBeenCalledTimes(1);
    expect(deps.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("resolves promise after all steps complete", async () => {
    const deps = createMockDeps();
    const { shutdown } = createGracefulShutdown(deps);

    await expect(shutdown()).resolves.toBeUndefined();
  });

  it("force timeout calls process.exit(1)", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const deps = createMockDeps({
      httpServer: {
        close: vi.fn(), // never calls callback, simulating a hang
      } as unknown as ShutdownDeps["httpServer"],
      forceTimeoutMs: 5_000,
    });

    const { shutdown } = createGracefulShutdown(deps);
    void shutdown();

    vi.advanceTimersByTime(5_000);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();

    // The promise will never resolve since httpServer.close never calls back,
    // but force exit was triggered.
  });
});

describe("registerProcessErrorHandlers", () => {
  it("registers uncaughtException listener", () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);

    const before = process.listenerCount("uncaughtException");
    registerProcessErrorHandlers(logger, shutdown);

    expect(process.listenerCount("uncaughtException")).toBe(before + 1);

    // Cleanup
    const listeners = process.listeners("uncaughtException");
    process.removeListener(
      "uncaughtException",
      listeners[listeners.length - 1] as (...args: unknown[]) => void,
    );
  });

  it("registers unhandledRejection listener", () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);

    const before = process.listenerCount("unhandledRejection");
    registerProcessErrorHandlers(logger, shutdown);

    expect(process.listenerCount("unhandledRejection")).toBe(before + 1);

    // Cleanup
    const listeners = process.listeners("unhandledRejection");
    process.removeListener(
      "unhandledRejection",
      listeners[listeners.length - 1] as (...args: unknown[]) => void,
    );
  });

  it("uncaughtException handler calls logger.fatal with correct event", async () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerProcessErrorHandlers(logger, shutdown);

    const listeners = process.listeners("uncaughtException");
    const handler = listeners[listeners.length - 1] as (err: Error) => void;
    const testError = new Error("test uncaught");
    handler(testError);

    // Give shutdown promise time to settle
    await vi.waitFor(() => {
      expect(logger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "uncaught_exception",
          err: testError,
        }),
      );
    });

    process.removeListener("uncaughtException", handler as (...args: unknown[]) => void);
    exitSpy.mockRestore();
  });

  it("uncaughtException handler calls shutdown", async () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerProcessErrorHandlers(logger, shutdown);

    const listeners = process.listeners("uncaughtException");
    const handler = listeners[listeners.length - 1] as (err: Error) => void;
    handler(new Error("test"));

    await vi.waitFor(() => {
      expect(shutdown).toHaveBeenCalled();
    });

    process.removeListener("uncaughtException", handler as (...args: unknown[]) => void);
    exitSpy.mockRestore();
  });

  it("unhandledRejection handler calls logger.fatal", async () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerProcessErrorHandlers(logger, shutdown);

    const listeners = process.listeners("unhandledRejection");
    const handler = listeners[listeners.length - 1] as (reason: unknown) => void;
    handler("unhandled reason");

    await vi.waitFor(() => {
      expect(logger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "unhandled_rejection",
          err: "unhandled reason",
        }),
      );
    });

    process.removeListener("unhandledRejection", handler as (...args: unknown[]) => void);
    exitSpy.mockRestore();
  });

  it("unhandledRejection handler calls shutdown", async () => {
    const logger = { fatal: vi.fn(), info: vi.fn() } as unknown as ShutdownDeps["logger"];
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerProcessErrorHandlers(logger, shutdown);

    const listeners = process.listeners("unhandledRejection");
    const handler = listeners[listeners.length - 1] as (reason: unknown) => void;
    handler("reason");

    await vi.waitFor(() => {
      expect(shutdown).toHaveBeenCalled();
    });

    process.removeListener("unhandledRejection", handler as (...args: unknown[]) => void);
    exitSpy.mockRestore();
  });
});
