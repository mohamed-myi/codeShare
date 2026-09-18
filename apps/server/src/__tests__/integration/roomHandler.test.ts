import type {
  ProblemDetail,
  RoomState,
  UserJoinedPayload,
  YjsTokenRotatedPayload,
} from "@codeshare/shared";
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
    roomManager.resetDefaults();
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

      const payloadPromise = waitForEvent<UserJoinedPayload>(client, SocketEvents.USER_JOINED);
      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const payload = await payloadPromise;

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

      const userJoinedPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise;

      // Bob joins, should receive his own user:joined
      const aliceBroadcastPromise = waitForEvent<UserJoinedPayload>(
        alice,
        SocketEvents.USER_JOINED,
      );
      const bobPayloadPromise = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      const bobPayload = await bobPayloadPromise;
      expect(bobPayload.displayName).toBe("Bob");
      expect(bobPayload.role).toBe("peer");

      // Alice should receive broadcast about Bob joining
      const aliceBroadcast = await aliceBroadcastPromise;
      expect(aliceBroadcast.displayName).toBe("Bob");
    });

    it("normalizes uppercase room codes for socket joins", async () => {
      const { server, room } = await setup();
      const client = connectClient(server.port, room.roomCode.toUpperCase());
      await waitForEvent(client, "connect");

      const payloadPromise2 = waitForEvent<UserJoinedPayload>(client, SocketEvents.USER_JOINED);
      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const payload = await payloadPromise2;

      expect(payload.displayName).toBe("Alice");
      expect(room.users).toHaveLength(1);
      expect(room.users[0]?.connected).toBe(true);
    });

    it("treats repeated user:join from the same socket as idempotent", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      const firstJoinPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const firstJoin = await firstJoinPromise;

      const userJoinedPromise3 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise2 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise2;
      await userJoinedPromise3;

      const unexpectedBroadcast = waitForEvent<UserJoinedPayload>(
        bob,
        SocketEvents.USER_JOINED,
        150,
      );

      const secondJoinPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const secondJoin = await secondJoinPromise;

      expect(secondJoin.userId).toBe(firstJoin.userId);
      expect(secondJoin.displayName).toBe("Alice");
      expect(room.users).toHaveLength(2);

      await expect(unexpectedBroadcast).rejects.toThrow(/Timed out/);
    });

    it("rejects invalid join payloads without mutating the room", async () => {
      const { server, room } = await setup();
      const client = connectClient(server.port, room.roomCode);
      await waitForEvent(client, "connect");

      const rejectedPromise = waitForEvent<{ event: string; reason: string }>(
        client,
        SocketEvents.EVENT_REJECTED,
      );
      client.emit(SocketEvents.USER_JOIN, { reconnectToken: "deadbeefdeadbeefdeadbeefdeadbeef" });

      const rejected = await rejectedPromise;

      expect(rejected.event).toBe(SocketEvents.USER_JOIN);
      expect(rejected.reason).toBe("Invalid join payload.");
      expect(room.users).toHaveLength(0);
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

      const userJoinedPromise4 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise4;

      const rejectedPromise2 = waitForEvent<{
        event: string;
        reason: string;
        retryAfterSeconds?: number;
      }>(bob, SocketEvents.EVENT_REJECTED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      const rejected = await rejectedPromise2;

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

      const iPayloadPromise = waitForEvent<UserJoinedPayload>(
        interviewer,
        SocketEvents.USER_JOINED,
      );
      interviewer.emit(SocketEvents.USER_JOIN, { displayName: "Interviewer" });
      const iPayload = await iPayloadPromise;
      expect(iPayload.role).toBe("interviewer");

      const cPayloadPromise = waitForEvent<UserJoinedPayload>(candidate, SocketEvents.USER_JOINED);
      candidate.emit(SocketEvents.USER_JOIN, { displayName: "Candidate" });
      const cPayload = await cPayloadPromise;
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

      const userJoinedPromise5 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise5;

      const userJoinedPromise6 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise6;

      const roomFullPromise = waitForEvent(charlie, SocketEvents.ROOM_FULL);
      charlie.emit(SocketEvents.USER_JOIN, { displayName: "Charlie" });
      await roomFullPromise;
    });
  });

  // --- 7d: Reconnection with valid token ---

  describe("7d: reconnection", () => {
    it("reconnects with valid token, receives new token + room:sync", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      const aliceJoinedPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const aliceJoined = await aliceJoinedPromise;

      const userJoinedPromise8 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise7 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise7;
      // Also consume Alice's broadcast for Bob
      await userJoinedPromise8;

      // Alice disconnects
      const userLeftPromise = waitForEvent(bob, SocketEvents.USER_LEFT);
      alice.disconnect();
      await userLeftPromise;

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

      const aliceJoinedPromise2 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const aliceJoined = await aliceJoinedPromise2;

      const userJoinedPromise10 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise9 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise9;
      await userJoinedPromise10;

      const userLeftPromise2 = waitForEvent(bob, SocketEvents.USER_LEFT);
      alice.disconnect();
      await userLeftPromise2;

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

    it("keeps the user in the room when they reconnect before grace period expiry", async () => {
      roomManager.configureDefaults({ gracePeriodMs: 1_000 });
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);
      const server = await createTestServer({
        pingInterval: 60_000,
        pingTimeout: 60_000,
      });
      cleanup = server.cleanup;
      setupSocketIO(server.io, logger);

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      const aliceJoinedPromise3 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const aliceJoined = await aliceJoinedPromise3;

      const userJoinedPromise12 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise11 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise11;
      await userJoinedPromise12;

      const userLeftPromise3 = waitForEvent<{ userId: string }>(bob, SocketEvents.USER_LEFT);
      alice.disconnect();
      await userLeftPromise3;

      const alice2 = connectClient(server.port, room.roomCode);
      await waitForEvent(alice2, "connect");

      const rejoinPromise = waitForEvent<UserJoinedPayload>(alice2, SocketEvents.USER_JOINED);
      alice2.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: aliceJoined.reconnectToken,
      });
      const rejoined = await rejoinPromise;

      expect(rejoined.userId).toBe(aliceJoined.userId);

      await vi.advanceTimersByTimeAsync(1_100);

      expect(room.users).toHaveLength(2);
      expect(room.users.find((user) => user.id === aliceJoined.userId)?.connected).toBe(true);
    });

    it("still joins as a new user when a valid-format reconnect token does not match a disconnected user", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const payloadPromise3 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: "deadbeefdeadbeefdeadbeefdeadbeef",
      });

      const payload = await payloadPromise3;
      expect(payload.displayName).toBe("Alice");
      expect(room.users).toHaveLength(1);
      expect(room.users[0]?.id).toBe(payload.userId);
    });

    it("completes join hydration even when the active problem can no longer be loaded", async () => {
      mockGetById.mockResolvedValue(null);
      const { server, room } = await setup();
      room.problemId = activeProblem.id;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const joinedPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const syncPromise = waitForEvent<RoomState>(alice, SocketEvents.ROOM_SYNC);
      const unexpectedProblemLoaded = waitForEvent(alice, SocketEvents.PROBLEM_LOADED, 150);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const joined = await joinedPromise;
      const sync = await syncPromise;

      expect(joined.displayName).toBe("Alice");
      expect(sync.problemId).toBe(activeProblem.id);
      await expect(unexpectedProblemLoaded).rejects.toThrow(/Timed out/);
      expect(mockGetById).toHaveBeenCalledWith(activeProblem.id);
    });

    it("completes join hydration even when active problem loading throws", async () => {
      mockGetById.mockRejectedValue(new Error("database unavailable"));
      const { server, room } = await setup();
      room.problemId = activeProblem.id;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const joinedPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const syncPromise = waitForEvent<RoomState>(alice, SocketEvents.ROOM_SYNC);
      const unexpectedProblemLoaded = waitForEvent(alice, SocketEvents.PROBLEM_LOADED, 150);

      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const joined = await joinedPromise;
      const sync = await syncPromise;

      expect(joined.displayName).toBe("Alice");
      expect(sync.problemId).toBe(activeProblem.id);
      await expect(unexpectedProblemLoaded).rejects.toThrow(/Timed out/);
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

      const userJoinedPromise13 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise13;

      const userJoinedPromise14 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise14;

      const imposter = connectClient(server.port, room.roomCode);
      await waitForEvent(imposter, "connect");

      const roomFullPromise2 = waitForEvent(imposter, SocketEvents.ROOM_FULL);
      imposter.emit(SocketEvents.USER_JOIN, {
        displayName: "Imposter",
        reconnectToken: "fake-token-12345",
      });

      await roomFullPromise2;
    });

    it("malformed reconnect token (wrong length) is rejected gracefully", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const payloadPromise4 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: "tooshort",
      });

      // Falls through to normal join (room not full)
      const payload = await payloadPromise4;
      expect(payload.displayName).toBe("Alice");
      expect(payload.role).toBe("peer");
    });

    it("malformed reconnect token (non-hex chars) is rejected gracefully", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const payloadPromise5 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, {
        displayName: "Alice",
        reconnectToken: "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      });

      const payload = await payloadPromise5;
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

      const alicePayloadPromise = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      const alicePayload = await alicePayloadPromise;

      const userJoinedPromise16 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise15 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise15;
      await userJoinedPromise16;

      const leftPayloadPromise = waitForEvent<{ userId: string }>(bob, SocketEvents.USER_LEFT);
      alice.disconnect();

      const leftPayload = await leftPayloadPromise;
      expect(leftPayload.userId).toBe(alicePayload.userId);
    });

    it("user removed from room after 5-minute grace period", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const userJoinedPromise17 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise17;

      expect(room.users).toHaveLength(1);

      alice.disconnect();
      await vi.waitFor(() => expect(room.users[0]?.connected).toBe(false));

      // User should still be in room during grace period
      expect(room.users).toHaveLength(1);

      // Advance past grace period
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

      expect(room.users).toHaveLength(0);
    });

    it("room destroyed when last user grace period expires", async () => {
      const { server } = await setup();
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const userJoinedPromise18 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise18;

      alice.disconnect();
      await vi.waitFor(() => expect(room.users[0]?.connected).toBe(false));

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

      expect(roomManager.getRoom(room.roomCode)).toBeUndefined();
    });
  });

  // --- Yjs token rotation on user removal ---

  describe("Yjs token rotation", () => {
    it("emits YJS_TOKEN_ROTATED to remaining user after grace period removal", async () => {
      roomManager.configureDefaults({ gracePeriodMs: 500 });
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);
      const server = await createTestServer({
        pingInterval: 60_000,
        pingTimeout: 60_000,
      });
      cleanup = server.cleanup;
      setupSocketIO(server.io, logger);

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      const userJoinedPromise19 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise19;

      const alicePeerJoin = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      const userJoinedPromise20 = waitForEvent<UserJoinedPayload>(bob, SocketEvents.USER_JOINED);
      bob.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
      await userJoinedPromise20;
      await alicePeerJoin;

      const originalToken = room.yjsToken;

      const tokenRotatedPromise = waitForEvent<YjsTokenRotatedPayload>(
        bob,
        SocketEvents.YJS_TOKEN_ROTATED,
      );

      const userLeftPromise4 = waitForEvent<{ userId: string }>(bob, SocketEvents.USER_LEFT);
      alice.disconnect();
      await userLeftPromise4;

      await vi.advanceTimersByTimeAsync(600);

      const rotatedPayload = await tokenRotatedPromise;
      expect(rotatedPayload.yjsToken).toBeDefined();
      expect(rotatedPayload.yjsToken).not.toBe(originalToken);
      expect(room.yjsToken).toBe(rotatedPayload.yjsToken);
    });

    it("does not emit YJS_TOKEN_ROTATED when last user is removed (room destroyed)", async () => {
      roomManager.configureDefaults({ gracePeriodMs: 500 });
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);
      const server = await createTestServer({
        pingInterval: 60_000,
        pingTimeout: 60_000,
      });
      cleanup = server.cleanup;
      setupSocketIO(server.io, logger);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      const userJoinedPromise21 = waitForEvent<UserJoinedPayload>(alice, SocketEvents.USER_JOINED);
      alice.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
      await userJoinedPromise21;

      alice.disconnect();
      await vi.waitFor(() => expect(room.users[0]?.connected).toBe(false));

      await vi.advanceTimersByTimeAsync(600);

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

      const errorPromise = waitForEvent<{ event: string; reason: string }>(
        client,
        SocketEvents.EVENT_REJECTED,
      );
      client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });

      const error = await errorPromise;
      expect(error.reason).toBeDefined();
      expect(error.event).toBe(SocketEvents.USER_JOIN);
    });
  });
});
