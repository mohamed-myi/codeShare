import { describe, it, expect, afterEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "../helpers/socketTestHelper.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("silent");

describe("Socket.io server setup", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];

  afterEach(async () => {
    for (const c of clients) {
      c.disconnect();
    }
    clients.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it("accepts connection with roomCode query", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const client = createTestClient(server.port, "abc-xyz");
    clients.push(client);

    await waitForEvent(client, "connect");
    expect(client.connected).toBe(true);
  });

  it("rejects connection without roomCode", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const client = createTestClient(server.port, "");
    clients.push(client);

    const error = await waitForEvent<Error>(client, "connect_error");
    expect(error.message).toContain("roomCode");
  });

  it("attaches roomCode to socket.data", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    let capturedRoomCode: string | undefined;
    server.io.on("connection", (socket) => {
      capturedRoomCode = socket.data.roomCode;
    });

    const client = createTestClient(server.port, "abc-xyz");
    clients.push(client);

    await waitForEvent(client, "connect");
    // Give server a tick to process the connection event
    await new Promise((r) => setTimeout(r, 50));
    expect(capturedRoomCode).toBe("abc-xyz");
  });

  it("isolates clients with different roomCodes", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const client1 = createTestClient(server.port, "room-aaa");
    const client2 = createTestClient(server.port, "room-bbb");
    clients.push(client1, client2);

    await Promise.all([
      waitForEvent(client1, "connect"),
      waitForEvent(client2, "connect"),
    ]);

    expect(client1.connected).toBe(true);
    expect(client2.connected).toBe(true);

    // Verify they're independent connections
    expect(client1.id).not.toBe(client2.id);
  });

  it("rejects websocket connections after the per-ip connection limit is reached", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, {
      rateLimits: {
        wsConnectionsPerMinute: 1,
      },
    });

    const client1 = createTestClient(server.port, "room-aaa");
    const client2 = createTestClient(server.port, "room-bbb");
    clients.push(client1, client2);

    await waitForEvent(client1, "connect");

    const error = await waitForEvent<Error>(client2, "connect_error");
    expect(error.message).toContain("Too many websocket connections");
  });

  it("rejects websocket connections from disallowed origins", async () => {
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, {
      allowedOrigins: ["http://localhost:5173"],
    });

    const client = createTestClient(server.port, "abcd-efgh", {
      extraHeaders: {
        origin: "https://evil.example",
      },
    });
    clients.push(client);

    const error = await waitForEvent<Error>(client, "connect_error");
    expect(error.message).toContain("Origin not allowed");
  });
});
