import { describe, expect, it, vi } from "vitest";
import { createBrowserLogger } from "../lib/logger.ts";

describe("createBrowserLogger", () => {
  it("logs structured browser errors and forwards them to the dev sink", async () => {
    const consoleApi = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const transport = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const logger = createBrowserLogger({
      environment: "development",
      route: "/room/abc-xyz/session",
      transport,
      consoleApi,
    });

    await logger.error({
      event: "client_render_failed",
      roomCode: "abc-xyz",
      socketId: "socket-1",
      error: new Error("Room exploded"),
    });

    expect(consoleApi.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_render_failed",
        room_code: "abc-xyz",
        socket_id: "socket-1",
      }),
    );
    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_render_failed",
        route: "/room/abc-xyz/session",
      }),
    );
  });

  it("falls back to console only when the dev sink fails", async () => {
    const consoleApi = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const transport = {
      send: vi.fn().mockRejectedValue(new Error("write failed")),
    };
    const logger = createBrowserLogger({
      environment: "development",
      route: "/room/abc-xyz/session",
      transport,
      consoleApi,
    });

    await expect(
      logger.error({
        event: "client_socket_connect_failed",
        error: new Error("Origin not allowed"),
      }),
    ).resolves.toBeUndefined();

    expect(consoleApi.error).toHaveBeenCalledTimes(2);
  });

  it("resolves the route at write time when getRoute is provided", async () => {
    const consoleApi = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    let route = "/room/abc-xyz/session/problems";
    const logger = createBrowserLogger({
      environment: "development",
      getRoute: () => route,
      transport: { send: vi.fn().mockResolvedValue(undefined) },
      consoleApi,
    });

    await logger.info({
      event: "client_socket_connected",
      roomCode: "abc-xyz",
    });

    route = "/room/abc-xyz/session/solve";

    await logger.warn({
      event: "client_yjs_disconnected",
      roomCode: "abc-xyz",
    });

    expect(consoleApi.info).toHaveBeenCalledWith(
      expect.objectContaining({ route: "/room/abc-xyz/session/problems" }),
    );
    expect(consoleApi.warn).toHaveBeenCalledWith(
      expect.objectContaining({ route: "/room/abc-xyz/session/solve" }),
    );
  });

  it("uses the current route for ingest-failure fallback logs", async () => {
    const consoleApi = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    let route = "/room/abc-xyz/session/problems";
    const logger = createBrowserLogger({
      environment: "development",
      getRoute: () => route,
      transport: {
        send: vi.fn().mockRejectedValue(new Error("write failed")),
      },
      consoleApi,
    });

    route = "/room/abc-xyz/session/solve";

    await logger.error({
      event: "client_socket_connect_failed",
      error: new Error("Origin not allowed"),
    });

    expect(consoleApi.error).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: "client_log_ingest_failed",
        route: "/room/abc-xyz/session/solve",
      }),
    );
  });
});
