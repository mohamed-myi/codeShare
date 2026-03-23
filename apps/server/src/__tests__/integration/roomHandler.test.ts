import type { ProblemDetail, RoomState, UserJoinedPayload } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import type { Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../../lib/logger.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { createTestClient, createTestServer, waitForEvent } from "../helpers/socketTestHelper.js";

const mockGetById = vi.hoisted(() => vi.fn());

vi.mock("../../services/ProblemService.js", () => ({
  problemService: {
    getById: mockGetById,
  },
}));

const logger = createLogger("silent");
const activeProblem: ProblemDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays",
  description: "Find two numbers.",
  constraints: [],
  solution: "Use a hash map.",
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  visibleTestCases: [
    {
      id: "tc-1",
      problemId: "00000000-0000-4000-8000-000000000001",
      input: { nums: [2, 7, 11, 15], target: 9 },
      expectedOutput: [0, 1],
      isVisible: true,
      orderIndex: 0,
    },
  ],
  boilerplate: {
    id: "bp-1",
    problemId: "00000000-0000-4000-8000-000000000001",
    language: "python",
    template: "def twoSum(nums, target):\n    pass",
    methodName: "twoSum",
    parameterNames: ["nums", "target"],
  },
};

describe("Room handler", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetById.mockReset();
    mockGetById.mockResolvedValue(null);
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

  async function setup(mode: "collaboration" | "interview" = "collaboration") {
    const room = roomManager.createRoom(mode);
    roomCodes.push(room.roomCode);
    const server = await createTestServer();
    cleanup = server.cleanup;

    // setupSocketIO registers auth middleware + room handler internally
    setupSocketIO(server.io, logger);

    return { server, room };
  }

  function connectClient(port: number, roomCode: string): ClientSocket {
    const client = createTestClient(port, roomCode);
    clients.push(client);
    return client;
  }

  // --- 7a: New user joins collaboration room ---

  describe("7a: collaboration join", () => {
    it("first user receives user:joined with role=peer", async () => {
      const { server, room } = await setup();
      const client = connectClient(server.port, room.roomCode);
      await waitForEvent(client, "connect");

      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const payload = await waitForEvent<UserJoinedPayload>(client, SocketEvents.USER_JOINED);

      expect(payload.userId).toBeDefined();
      expect(payload.displayName).toBe("Alice");
      expect(payload.role).toBe("peer");
      expect(payload.mode).toBe("collaboration");
      expect(payload.reconnectToken).toBeDefined();
    });

    it("second user receives user:joined, first user gets broadcast", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      // Bob joins, should receive his own user:joined
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      const bobPayload = await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      expect(bobPayload.displayName).toBe("Bob");
      expect(bobPayload.role).toBe("peer");

      // Alice should receive broadcast about Bob joining
      const aliceBroadcast = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      expect(aliceBroadcast.displayName).toBe("Bob");
    });

    it("normalizes uppercase room codes for socket joins", async () => {
      const { server, room } = await setup();
      const client = connectClient(server.port, room.roomCode.toUpperCase());
      await waitForEvent(client, "connect");

      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const payload = await waitForEvent<UserJoinedPayload>(client, SocketEvents.USER_JOINED);

      expect(payload.displayName).toBe("Alice");
      expect(room.users).toHaveLength(1);
      expect(room.users[0]?.connected).toBe(true);
    });

    it("treats repeated user:join from the same socket as idempotent", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const firstJoin = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      const unexpectedBroadcast = waitForEvent<UserJoinedPayload>(
        bob,
        SocketEvents.USER_JOINED,
        150,
      );

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const secondJoin = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      expect(secondJoin.userId).toBe(firstJoin.userId);
      expect(secondJoin.displayName).toBe("Alice");
      expect(room.users).toHaveLength(2);

      await expect(unexpectedBroadcast).rejects.toThrow(/Timed out/);
    });
  });

  describe("7a: join rate limiting", () => {
    it("rejects additional join attempts from the same ip after the configured limit", async () => {
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);
      const server = await createTestServer();
      cleanup = server.cleanup;

      setupSocketIO(server.io, logger, {
        rateLimits: {
          joinAttemptsPerHour: 1,
        },
      });

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      const rejected = await waitForEvent<{
        event: string;
        reason: string;
        retryAfterSeconds?: number;
      }>(bob, SocketEvents.EVENT_REJECTED);

      expect(rejected.event).toBe(SocketEvents.USER_JOIN);
      expect(rejected.reason).toContain("Too many join attempts");
      expect(rejected.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  // --- 7b: New user joins interview room ---

  describe("7b: interview join", () => {
    it("first joiner gets role=interviewer, second gets role=candidate", async () => {
      const { server, room } = await setup("interview");

      const interviewer = connectClient(server.port, room.roomCode);
      const candidate = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(interviewer, "connect"), waitForEvent(candidate, "connect")]);

      interviewer.emit(SocketEvents.USER_JOIN, { displayName: "Interviewer" });
      const iPayload = await waitForEvent<UserJoinedPayload>(interviewer, SocketEvents.USER_JOINED);
      expect(iPayload.role).toBe("interviewer");

      candidate.emit(SocketEvents.USER_JOIN, { displayName: "Candidate" });
      const cPayload = await waitForEvent<UserJoinedPayload>(candidate, SocketEvents.USER_JOINED);
      expect(cPayload.role).toBe("candidate");
    });
  });

  // --- 7c: Room full rejection ---

  describe("7c: room full", () => {
    it("third client receives room:full", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      const charlie = connectClient(server.port, room.roomCode);

      await Promise.all([
        waitForEvent(alice, "connect"),
        waitForEvent(bob, "connect"),
        waitForEvent(charlie, "connect"),
      ]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);

      charlie.emit(SocketEvents.USER_JOIN, { displayName: "Charlie" });
      await waitForEvent(charlie, SocketEvents.ROOM_FULL);
    });
  });

  // --- 7d: Reconnection with valid token ---

  describe("7d: reconnection", () => {
    it("reconnects with valid token, receives new token + room:sync", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const aliceJoined = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      // Also consume Alice's broadcast for Bob
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      // Alice disconnects
      alice.disconnect();
      await waitForEvent(bob, SocketEvents.USER_LEFT);

      // Alice reconnects with her token
      const alice2 = connectClient(server.port, room.roomCode);
      await waitForEvent(alice2, "connect");

      // Set up listeners BEFORE emitting to avoid race condition
      const reconnectedPromise = waitForEvent<UserJoinedPayload>(alice2, SocketEvents.USER_JOINED);
      const syncPromise = waitForEvent<RoomState>(alice2, SocketEvents.ROOM_SYNC);
      const bobBroadcastPromise = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);

      alice2.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: aliceJoined.reconnectToken,
      });

      const reconnected = await reconnectedPromise;
      expect(reconnected.userId).toBe(aliceJoined.userId);
      expect(reconnected.reconnectToken).not.toBe(aliceJoined.reconnectToken);

      const sync = await syncPromise;
      expect(sync.roomCode).toBe(room.roomCode);
      expect(sync.users).toHaveLength(2);

      const bobBroadcast = await bobBroadcastPromise;
      expect(bobBroadcast.userId).toBe(aliceJoined.userId);
    });

    it("reconnects with the active problem payload when the room already has a selected problem", async () => {
      mockGetById.mockResolvedValue(activeProblem);
      const { server, room } = await setup();
      room.problemId = activeProblem.id;

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const aliceJoined = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      alice.disconnect();
      await waitForEvent(bob, SocketEvents.USER_LEFT);

      const alice2 = connectClient(server.port, room.roomCode);
      await waitForEvent(alice2, "connect");

      const problemLoadedPromise = waitForEvent<{
        problem: { id: string };
        parameterNames: string[];
      }>(alice2, SocketEvents.PROBLEM_LOADED);

      alice2.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: aliceJoined.reconnectToken,
      });

      const problemLoaded = await problemLoadedPromise;
      expect(problemLoaded.problem.id).toBe(activeProblem.id);
      expect(problemLoaded.parameterNames).toEqual(["nums", "target"]);
      expect(mockGetById).toHaveBeenCalledWith(activeProblem.id);
    });
  });

  // --- 7e: Reconnection with invalid token ---

  describe("7e: invalid reconnection", () => {
    it("fabricated token on full room gets room:full", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);

      const imposter = connectClient(server.port, room.roomCode);
      await waitForEvent(imposter, "connect");

      imposter.emit(SocketEvents.USER_JOIN, {
        displayName: "Imposter",
        reconnectToken: "fake-token-12345",
      });

      await waitForEvent(imposter, SocketEvents.ROOM_FULL);
    });

    it("malformed reconnect token (wrong length) is rejected gracefully", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      alice.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: "tooshort",
      });

      // Falls through to normal join (room not full)
      const payload = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      expect(payload.displayName).toBe("Alice");
      expect(payload.role).toBe("peer");
    });

    it("malformed reconnect token (non-hex chars) is rejected gracefully", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      alice.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      });

      const payload = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      expect(payload.displayName).toBe("Alice");
    });
  });

  // --- 7f: Disconnect triggers grace period ---

  describe("7f: disconnect and grace period", () => {
    it("other user receives user:left on disconnect", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const alicePayload = await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      alice.disconnect();

      const leftPayload = await waitForEvent<{ userId: string }>(bob, SocketEvents.USER_LEFT);
      expect(leftPayload.userId).toBe(alicePayload.userId);
    });

    it("user removed from room after 5-minute grace period", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      expect(room.users).toHaveLength(1);

      alice.disconnect();
      await new Promise((r) => setTimeout(r, 100));

      // User should still be in room during grace period
      expect(room.users).toHaveLength(1);

      // Advance past grace period
      vi.advanceTimersByTime(5 * 60 * 1000 + 100);
      await new Promise((r) => setTimeout(r, 100));

      expect(room.users).toHaveLength(0);
    });

    it("room destroyed when last user grace period expires", async () => {
      const { server } = await setup();
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);

      alice.disconnect();
      await new Promise((r) => setTimeout(r, 100));

      vi.advanceTimersByTime(5 * 60 * 1000 + 100);
      await new Promise((r) => setTimeout(r, 100));

      expect(roomManager.getRoom(room.roomCode)).toBeUndefined();
    });
  });

  // --- 7g: Non-existent room ---

  describe("7g: non-existent room", () => {
    it("user:join on non-existent room gets EVENT_REJECTED", async () => {
      const server = await createTestServer();
      cleanup = server.cleanup;

      setupSocketIO(server.io, logger);

      const client = connectClient(server.port, "nonexistent-room");
      await waitForEvent(client, "connect");

      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const error = await waitForEvent<{ event: string; reason: string }>(
        client,
        SocketEvents.EVENT_REJECTED,
      );
      expect(error.reason).toBeDefined();
      expect(error.event).toBe(SocketEvents.USER_JOIN);
    });
  });
});
