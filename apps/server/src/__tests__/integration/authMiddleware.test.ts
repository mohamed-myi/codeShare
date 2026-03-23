import { SocketEvents } from "@codeshare/shared";
import type { Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createLogger } from "../../lib/logger.js";
import { createAuthMiddleware } from "../../middleware/authMiddleware.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { createTestClient, createTestServer, waitForEvent } from "../helpers/socketTestHelper.js";

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

    room.addUser("Alice", "peer", client.id as string);
    room.problemId = "problem-1";

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

    room.addUser("Candidate", "candidate", client.id as string);

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

    room.addUser("Alice", "peer", client.id as string);
    room.problemId = "problem-1";
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

    room.addUser("Interviewer", "interviewer", client.id as string);

    client.emit(SocketEvents.HINT_REQUEST);

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.HINT_REQUEST);
  });

  it("rejects hint:approve from the requester", async () => {
    const { server, room } = await setup();

    const requester = createTestClient(server.port, room.roomCode);
    clients.push(requester);
    await waitForEvent(requester, "connect");

    const approver = createTestClient(server.port, room.roomCode);
    clients.push(approver);
    await waitForEvent(approver, "connect");

    const requesterUser = room.addUser("Alice", "peer", requester.id as string);
    room.addUser("Bob", "peer", approver.id as string);
    room.pendingHintRequest = {
      requestedBy: requesterUser.id,
      requestedAt: new Date().toISOString(),
    };

    requester.emit(SocketEvents.HINT_APPROVE);

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      requester,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.HINT_APPROVE);
    expect(rejection.reason).toContain("other participant");
  });

  it("rejects hint:deny from the requester", async () => {
    const { server, room } = await setup();

    const requester = createTestClient(server.port, room.roomCode);
    clients.push(requester);
    await waitForEvent(requester, "connect");

    const approver = createTestClient(server.port, room.roomCode);
    clients.push(approver);
    await waitForEvent(approver, "connect");

    const requesterUser = room.addUser("Alice", "peer", requester.id as string);
    room.addUser("Bob", "peer", approver.id as string);
    room.pendingHintRequest = {
      requestedBy: requesterUser.id,
      requestedAt: new Date().toISOString(),
    };

    requester.emit(SocketEvents.HINT_DENY);

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      requester,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.HINT_DENY);
    expect(rejection.reason).toContain("other participant");
  });

  it("rejects problem:import while execution is in progress", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Alice", "peer", client.id as string);
    room.executionInProgress = true;

    client.emit(SocketEvents.PROBLEM_IMPORT, {
      leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    });

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.PROBLEM_IMPORT);
    expect(rejection.reason).toContain("running");
  });

  it("rejects problem:import while a hint is being delivered", async () => {
    const { server, room } = await setup();

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    room.addUser("Alice", "peer", client.id as string);
    room.hintStreaming = true;

    client.emit(SocketEvents.PROBLEM_IMPORT, {
      leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    });

    const rejection = await waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );

    expect(rejection.event).toBe(SocketEvents.PROBLEM_IMPORT);
    expect(rejection.reason).toContain("hint");
  });
});
