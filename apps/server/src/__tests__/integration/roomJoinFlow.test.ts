import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { SocketEvents } from "@codeshare/shared";
import type { UserJoinedPayload, RoomState } from "@codeshare/shared";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "../helpers/socketTestHelper.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { roomManager } from "../../models/RoomManager.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("silent");

describe("Integration: two-client room join flow", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    clients.length = 0;
    for (const code of roomCodes) roomManager.destroyRoom(code);
    roomCodes.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
    vi.useRealTimers();
  });

  function connectClient(port: number, roomCode: string): ClientSocket {
    const client = createTestClient(port, roomCode);
    clients.push(client);
    return client;
  }

  it("full lifecycle: create, join two clients, disconnect, reconnect, reject third", async () => {
    // --- Setup server ---
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;
    setupSocketIO(server.io, logger);

    // --- Client 1 (Alice) joins ---
    const alice = connectClient(server.port, room.roomCode);
    await waitForEvent(alice, "connect");

    alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    const aliceJoined = await waitForEvent<UserJoinedPayload>(
      alice,
      SocketEvents.USER_JOINED,
    );
    expect(aliceJoined.displayName).toBe("Alice");
    expect(aliceJoined.role).toBe("peer");
    expect(aliceJoined.reconnectToken).toBeDefined();

    // --- Client 2 (Bob) joins ---
    const bob = connectClient(server.port, room.roomCode);
    await waitForEvent(bob, "connect");

    const aliceBroadcastPromise = waitForEvent<UserJoinedPayload>(
      alice,
      SocketEvents.USER_JOINED,
    );

    bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
    const bobJoined = await waitForEvent<UserJoinedPayload>(
      bob,
      SocketEvents.USER_JOINED,
    );
    expect(bobJoined.displayName).toBe("Bob");
    expect(bobJoined.role).toBe("peer");

    // Alice receives broadcast about Bob
    const aliceBroadcast = await aliceBroadcastPromise;
    expect(aliceBroadcast.displayName).toBe("Bob");

    // --- Bob disconnects ---
    bob.disconnect();

    const leftPayload = await waitForEvent<{ userId: string }>(
      alice,
      SocketEvents.USER_LEFT,
    );
    expect(leftPayload.userId).toBe(bobJoined.userId);

    // --- Bob reconnects with token ---
    const bob2 = connectClient(server.port, room.roomCode);
    await waitForEvent(bob2, "connect");

    const bob2JoinedPromise = waitForEvent<UserJoinedPayload>(
      bob2,
      SocketEvents.USER_JOINED,
    );
    const bob2SyncPromise = waitForEvent<RoomState>(
      bob2,
      SocketEvents.ROOM_SYNC,
    );
    const aliceReconnectBroadcast = waitForEvent<UserJoinedPayload>(
      alice,
      SocketEvents.USER_JOINED,
    );

    bob2.emit(SocketEvents.USER_JOIN, {
      displayName: "Bob",
      reconnectToken: bobJoined.reconnectToken,
    });

    const bob2Joined = await bob2JoinedPromise;
    expect(bob2Joined.userId).toBe(bobJoined.userId);
    expect(bob2Joined.reconnectToken).not.toBe(bobJoined.reconnectToken);

    const sync = await bob2SyncPromise;
    expect(sync.roomCode).toBe(room.roomCode);
    expect(sync.users).toHaveLength(2);

    const aliceReconnect = await aliceReconnectBroadcast;
    expect(aliceReconnect.userId).toBe(bobJoined.userId);

    // --- Third client tries to join full room ---
    const charlie = connectClient(server.port, room.roomCode);
    await waitForEvent(charlie, "connect");

    charlie.emit(SocketEvents.USER_JOIN, { displayName: "Charlie" });
    await waitForEvent(charlie, SocketEvents.ROOM_FULL);
  });
});
