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
});
