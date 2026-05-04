import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const mockIo = vi.hoisted(() => vi.fn());
interface TestWsInstance {
  emit(event: string, payload?: unknown): void;
}

const wsInstances = vi.hoisted(() => [] as TestWsInstance[]);
const MockWs = vi.hoisted(
  () =>
    class {
      static OPEN = 1;
      readonly close = vi.fn();
      readonly send = vi.fn();
      readonly readyState = 1;
      binaryType = "arraybuffer";
      private readonly listeners = new Map<string, Array<(payload?: unknown) => void>>();

      constructor() {
        wsInstances.push(this as unknown as TestWsInstance);
      }

      on(event: string, handler: (payload?: unknown) => void) {
        const eventListeners = this.listeners.get(event) ?? [];
        eventListeners.push(handler);
        this.listeners.set(event, eventListeners);
      }

      emit(event: string, payload?: unknown) {
        for (const listener of this.listeners.get(event) ?? []) {
          listener(payload);
        }
      }
    },
);

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

vi.mock("ws", () => ({
  default: MockWs,
}));

vi.mock("../lib/logger.js", () => ({
  createLoadTestLogger: () => mockLogger,
  getLoadTestLogger: () => mockLogger,
}));

import { fetchHealth, waitForHealthy } from "../lib/health-client.js";
import { MemoryRecorder } from "../lib/metrics.js";
import { createLoadSocket } from "../lib/socket-client.js";
import { createLoadYjsClient } from "../lib/yjs-client.js";

describe("load-test helper logging", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
    mockIo.mockReset();
    wsInstances.splice(0, wsInstances.length);
  });

  it("logs socket connection failures", async () => {
    const listeners = new Map<string, Array<(payload?: unknown) => void>>();
    mockIo.mockImplementation(() => ({
      disconnect: vi.fn(),
      on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
        const eventListeners = listeners.get(event) ?? [];
        eventListeners.push(handler);
        listeners.set(event, eventListeners);
      }),
    }));

    const socketPromise = createLoadSocket("http://localhost:3001", "abc-xyz");
    for (const handler of listeners.get("connect_error") ?? []) {
      handler(new Error("Origin not allowed"));
    }

    await expect(socketPromise).rejects.toThrow("Socket connect failed");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "load_test_socket_connect_failed",
      expect.objectContaining({
        room_code: "abc-xyz",
      }),
    );
  });

  it("logs Yjs websocket failures", async () => {
    const clientPromise = createLoadYjsClient("http://localhost:3001", "abc-xyz", "token-1");
    wsInstances[0].emit("error", new Error("socket hang up"));

    await expect(clientPromise).rejects.toThrow("Yjs WebSocket error");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "load_test_yjs_connect_failed",
      expect.objectContaining({
        room_code: "abc-xyz",
      }),
    );
  });

  it("logs health polling failures and timeout exhaustion", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("connection refused"))
        .mockRejectedValue(new Error("still down")),
    );

    const waitPromise = waitForHealthy("http://localhost:3001", 5, 1);
    const waitExpectation = expect(waitPromise).rejects.toThrow("Server not healthy");
    await vi.runAllTimersAsync();

    await waitExpectation;
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "load_test_health_wait_failed",
      expect.objectContaining({
        server_url: "http://localhost:3001",
      }),
    );
  });

  it("logs failed health checks and memory samples", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(fetchHealth("http://localhost:3001")).rejects.toThrow("Health check failed");
    const recorder = new MemoryRecorder("http://localhost:3001");
    await expect(recorder.sample()).rejects.toThrow("Health endpoint returned 503");

    expect(mockLogger.error).toHaveBeenCalledWith(
      "load_test_health_check_failed",
      expect.objectContaining({
        server_url: "http://localhost:3001",
        status_code: 503,
      }),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      "load_test_memory_sample_failed",
      expect.objectContaining({
        server_url: "http://localhost:3001",
        status_code: 503,
      }),
    );
  });
});
