import { describe, it, expect, afterEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { SocketEvents } from "@codeshare/shared";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "./helpers/socketTestHelper.js";
import { setupSocketIO } from "../ws/socketio.js";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import { roomManager } from "../models/RoomManager.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("silent");

describe("Auth middleware", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    clients.length = 0;
    for (const code of roomCodes) roomManager.destroyRoom(code);
    roomCodes.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  async function setup(mode: "collaboration" | "interview" = "collaboration") {
    const room = roomManager.createRoom(mode);
    roomCodes.push(room.roomCode);
    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    // Apply per-event middleware to each connecting socket
    const authMiddleware = createAuthMiddleware(roomManager);
    server.io.on("connection", (socket) => {
      socket.use(authMiddleware(socket));
    });

    return { server, room };
  }

  it("silently drops events from socket not associated with any room user", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    let receivedRejection = false;
    client.on(SocketEvents.EVENT_REJECTED, () => {
      receivedRejection = true;
    });

    client.emit(SocketEvents.CODE_RUN);

    await new Promise((r) => setTimeout(r, 200));
    expect(receivedRejection).toBe(false);
  });

  it("allows user:join to bypass membership check", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    let dropped = false;
    client.on(SocketEvents.EVENT_REJECTED, () => {
      dropped = true;
    });

    client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

    await new Promise((r) => setTimeout(r, 200));
    expect(dropped).toBe(false);
  });

  it("passes events from room member with correct role", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Alice", "peer", client.id!);

    let rejected = false;
    client.on(SocketEvents.EVENT_REJECTED, () => {
      rejected = true;
    });

    client.emit(SocketEvents.CODE_RUN);

    await new Promise((r) => setTimeout(r, 200));
    expect(rejected).toBe(false);
  });

  it("rejects problem:select from candidate in interview mode", async () => {
    const { server, room } = await setup("interview");

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Candidate", "candidate", client.id!);

    client.emit(SocketEvents.PROBLEM_SELECT, { problemId: "some-uuid" });

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.PROBLEM_SELECT);
    expect(rejection.reason).toBeDefined();
  });

  it("rejects code:run when executionInProgress is true", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Alice", "peer", client.id!);
    room.executionInProgress = true;

    client.emit(SocketEvents.CODE_RUN);

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.CODE_RUN);
    expect(rejection.reason).toContain("progress");
  });

  it("rejects hint:request in interview mode", async () => {
    const { server, room } = await setup("interview");

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Interviewer", "interviewer", client.id!);

    client.emit(SocketEvents.HINT_REQUEST);

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.HINT_REQUEST);
  });
});
