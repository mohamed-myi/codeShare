import type { ProblemDetail, ProblemLoadedPayload } from "@codeshare/shared";
import { ROOM_LIMITS, SocketEvents } from "@codeshare/shared";
import type { Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { createLogger } from "../../lib/logger.js";
import { globalCounters } from "../../lib/rateLimitCounters.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { createTestClient, createTestServer, waitForEvent } from "../helpers/socketTestHelper.js";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const UNKNOWN_UUID = "00000000-0000-4000-8000-000000000099";

const mockProblemDetail: ProblemDetail = {
  id: VALID_UUID,
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays & Hashing",
  description: "Given an array of integers...",
  constraints: ["2 <= nums.length <= 10^4"],
  solution: null,
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  visibleTestCases: [
    {
      id: "tc-1",
      problemId: VALID_UUID,
      input: { nums: [2, 7, 11, 15], target: 9 },
      expectedOutput: [0, 1],
      isVisible: true,
      orderIndex: 0,
    },
  ],
  boilerplate: {
    id: "bp-1",
    problemId: VALID_UUID,
    language: "python",
    template: "def twoSum(nums, target):\n    pass",
    methodName: "twoSum",
    parameterNames: ["nums", "target"],
  },
};

const mockGetById = vi.hoisted(() => vi.fn());
const mockImportFromUrl = vi.hoisted(() => vi.fn());

vi.mock("../../services/ProblemService.js", () => ({
  problemService: {
    getById: mockGetById,
  },
}));

vi.mock("../../services/ScraperService.js", () => ({
  scraperService: {
    importFromUrl: mockImportFromUrl,
  },
}));

const logger = createLogger("silent");

describe("Problem handler", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];
  const yjsDocs = new Map<string, Y.Doc>();

  function getDoc(roomCode: string): Y.Doc | undefined {
    return yjsDocs.get(roomCode);
  }

  beforeEach(() => {
    mockGetById.mockReset();
    mockImportFromUrl.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    clients.length = 0;
    for (const code of roomCodes) roomManager.destroyRoom(code);
    roomCodes.length = 0;
    for (const [, doc] of yjsDocs) doc.destroy();
    yjsDocs.clear();
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const doc = new Y.Doc();
    yjsDocs.set(room.roomCode, doc);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, { getDoc });

    return { server, room, doc };
  }

  async function setupWithRateLimits(rateLimits: {
    importsPerHour?: number;
    joinAttemptsPerHour?: number;
    wsConnectionsPerMinute?: number;
  }) {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const doc = new Y.Doc();
    yjsDocs.set(room.roomCode, doc);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, { getDoc, rateLimits });

    return { server, room, doc };
  }

  async function setupWithOptions(options: Parameters<typeof setupSocketIO>[2]) {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const doc = new Y.Doc();
    yjsDocs.set(room.roomCode, doc);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, {
      getDoc,
      ...options,
    });

    return { server, room, doc };
  }

  function connectClient(port: number, roomCode: string): ClientSocket {
    const client = createTestClient(port, roomCode);
    clients.push(client);
    return client;
  }

  async function joinUser(client: ClientSocket, displayName: string) {
    client.emit(SocketEvents.USER_JOIN, { displayName });
    await waitForEvent(client, SocketEvents.USER_JOINED);
  }

  // --- Valid problem selection ---

  describe("valid problem selection", () => {
    it("both clients receive problem:loaded with correct payload", async () => {
      mockGetById.mockResolvedValue(mockProblemDetail);
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      await joinUser(alice, "Alice");
      await joinUser(bob, "Bob");
      // Consume Alice's broadcast about Bob
      await waitForEvent(alice, SocketEvents.USER_JOINED);

      const aliceLoadedPromise = waitForEvent<ProblemLoadedPayload>(
        alice,
        SocketEvents.PROBLEM_LOADED,
      );
      const bobLoadedPromise = waitForEvent<ProblemLoadedPayload>(bob, SocketEvents.PROBLEM_LOADED);

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: VALID_UUID });

      const [alicePayload, bobPayload] = await Promise.all([aliceLoadedPromise, bobLoadedPromise]);

      expect(alicePayload.problem.id).toBe(VALID_UUID);
      expect(alicePayload.problem.title).toBe("Two Sum");
      expect(alicePayload.visibleTestCases).toHaveLength(1);
      expect(alicePayload.boilerplate).toBe("def twoSum(nums, target):\n    pass");

      expect(bobPayload.problem.id).toBe(VALID_UUID);
      expect(bobPayload.boilerplate).toBe(alicePayload.boilerplate);
    });
  });

  // --- Unknown problem ID ---

  describe("unknown problem ID", () => {
    it("sender receives problem:error", async () => {
      mockGetById.mockResolvedValue(null);
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: UNKNOWN_UUID });

      const error = await waitForEvent<{ message: string }>(alice, SocketEvents.PROBLEM_ERROR);
      expect(error.message).toBe("Problem not found.");
    });
  });

  // --- Invalid payload ---

  describe("invalid payload", () => {
    it("sender receives problem:error for missing problemId", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { wrong: "field" });

      const error = await waitForEvent<{ message: string }>(alice, SocketEvents.PROBLEM_ERROR);
      expect(error.message).toBe("Invalid problem selection payload.");
    });

    it("sender receives problem:error for non-uuid problemId", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: "not-a-uuid" });

      const error = await waitForEvent<{ message: string }>(alice, SocketEvents.PROBLEM_ERROR);
      expect(error.message).toBe("Invalid problem selection payload.");
    });
  });

  // --- Yjs doc reset ---

  describe("Yjs doc reset", () => {
    it("clears existing text and inserts new boilerplate", async () => {
      mockGetById.mockResolvedValue(mockProblemDetail);
      const { server, room, doc } = await setup();

      // Pre-populate the Yjs doc with old content
      const ytext = doc.getText("monaco");
      ytext.insert(0, "old code that should be replaced");

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: VALID_UUID });
      await waitForEvent(alice, SocketEvents.PROBLEM_LOADED);

      expect(ytext.toString()).toBe("def twoSum(nums, target):\n    pass");
    });

    it("clears doc when problem has no boilerplate", async () => {
      const noBpDetail: ProblemDetail = {
        ...mockProblemDetail,
        boilerplate: null,
      };
      mockGetById.mockResolvedValue(noBpDetail);
      const { server, room, doc } = await setup();

      const ytext = doc.getText("monaco");
      ytext.insert(0, "old content");

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: VALID_UUID });
      await waitForEvent(alice, SocketEvents.PROBLEM_LOADED);

      expect(ytext.toString()).toBe("");
    });
  });

  // --- Room state update ---

  describe("room state update", () => {
    it("updates room problemId, hintsUsed, and customTestCases after select", async () => {
      mockGetById.mockResolvedValue(mockProblemDetail);
      const { server, room } = await setup();

      // Set some pre-existing state that switchProblem should reset
      room.hintsUsed = 5;
      room.customTestCases = [{ input: {}, expectedOutput: null }];

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: VALID_UUID });
      await waitForEvent(alice, SocketEvents.PROBLEM_LOADED);

      expect(room.problemId).toBe(VALID_UUID);
      expect(room.hintsUsed).toBe(0);
      expect(room.hintLimit).toBe(1); // easy difficulty -> 1
      expect(room.customTestCases).toEqual([]);
    });
  });

  // --- Service error ---

  describe("service error", () => {
    it("sender receives problem:error when service throws", async () => {
      mockGetById.mockRejectedValue(new Error("DB connection failed"));
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_SELECT, { problemId: VALID_UUID });

      const error = await waitForEvent<{ message: string }>(alice, SocketEvents.PROBLEM_ERROR);
      expect(error.message).toBe("Failed to load problem. Please try again.");
    });
  });

  describe("problem import", () => {
    it("rejects import when problem import is disabled", async () => {
      const { server, room } = await setupWithOptions({
        enableProblemImport: false,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      const status = await waitForEvent<{ status: string; message?: string }>(
        alice,
        SocketEvents.PROBLEM_IMPORT_STATUS,
      );

      expect(status.status).toBe("failed");
      expect(status.message).toBe("Problem import is disabled.");
      expect(mockImportFromUrl).not.toHaveBeenCalled();
    });

    it("emits import status, loads the imported problem, and updates the room", async () => {
      const importedProblem = {
        id: VALID_UUID,
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy" as const,
        category: "Algorithms",
        description: "Imported description",
        constraints: ["2 <= nums.length <= 10^4"],
        solution: null,
        timeLimitMs: 5000,
        source: "user_submitted" as const,
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockImportFromUrl.mockResolvedValue(importedProblem);
      mockGetById.mockResolvedValue({
        ...mockProblemDetail,
        ...importedProblem,
      });

      const canImportSpy = vi.spyOn(globalCounters, "canImport").mockReturnValue(true);
      const recordImportSpy = vi.spyOn(globalCounters, "recordImport").mockImplementation(() => {});
      const { server, room, doc } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      await joinUser(alice, "Alice");
      await joinUser(bob, "Bob");
      await waitForEvent(alice, SocketEvents.USER_JOINED);

      const aliceStatuses: string[] = [];
      const bobStatuses: string[] = [];
      alice.on(SocketEvents.PROBLEM_IMPORT_STATUS, (payload: { status: string }) => {
        aliceStatuses.push(payload.status);
      });
      bob.on(SocketEvents.PROBLEM_IMPORT_STATUS, (payload: { status: string }) => {
        bobStatuses.push(payload.status);
      });
      const aliceLoaded = waitForEvent<ProblemLoadedPayload>(alice, SocketEvents.PROBLEM_LOADED);
      const bobLoaded = waitForEvent<ProblemLoadedPayload>(bob, SocketEvents.PROBLEM_LOADED);

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      expect((await aliceLoaded).problem.sourceUrl).toBe("https://leetcode.com/problems/two-sum/");
      expect((await bobLoaded).problem.source).toBe("user_submitted");

      await vi.waitFor(() => {
        expect(aliceStatuses).toEqual(["scraping", "saved"]);
        expect(bobStatuses).toEqual(["scraping", "saved"]);
      });

      expect(mockImportFromUrl).toHaveBeenCalledWith("https://leetcode.com/problems/two-sum/");
      expect(canImportSpy).toHaveBeenCalledOnce();
      expect(recordImportSpy).toHaveBeenCalledOnce();
      expect(room.importsUsed).toBe(1);
      expect(room.problemId).toBe(VALID_UUID);
      expect(doc.getText("monaco").toString()).toBe("def twoSum(nums, target):\n    pass");
    });

    it("rejects import when the room import limit is exhausted", async () => {
      const { server, room } = await setup();
      room.importsUsed = ROOM_LIMITS.MAX_IMPORTS;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      const status = await waitForEvent<{ status: string; message?: string }>(
        alice,
        SocketEvents.PROBLEM_IMPORT_STATUS,
      );

      expect(status.status).toBe("failed");
      expect(status.message).toContain("Session import limit reached");
      expect(mockImportFromUrl).not.toHaveBeenCalled();
    });

    it("rejects import when the payload is invalid", async () => {
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://example.com/problems/two-sum/",
      });

      const status = await waitForEvent<{ status: string; message?: string }>(
        alice,
        SocketEvents.PROBLEM_IMPORT_STATUS,
      );

      expect(status.status).toBe("failed");
      expect(status.message).toBe("Invalid problem import payload.");
      expect(mockImportFromUrl).not.toHaveBeenCalled();
    });

    it("rejects import when the global import limit is exhausted", async () => {
      vi.spyOn(globalCounters, "canImport").mockReturnValue(false);
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      const status = await waitForEvent<{ status: string; message?: string }>(
        alice,
        SocketEvents.PROBLEM_IMPORT_STATUS,
      );

      expect(status.status).toBe("failed");
      expect(status.message).toContain("Daily import limit reached");
      expect(mockImportFromUrl).not.toHaveBeenCalled();
    });

    it("rejects import when the ip import limit is exhausted", async () => {
      vi.spyOn(globalCounters, "canImport").mockReturnValue(true);
      const importedProblem = {
        id: VALID_UUID,
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy" as const,
        category: "Algorithms",
        description: "Imported description",
        constraints: ["2 <= nums.length <= 10^4"],
        solution: null,
        timeLimitMs: 5000,
        source: "user_submitted" as const,
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockImportFromUrl.mockResolvedValue(importedProblem);
      mockGetById.mockResolvedValue({
        ...mockProblemDetail,
        ...importedProblem,
      });
      const { server, room } = await setupWithRateLimits({ importsPerHour: 1 });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");

      await joinUser(alice, "Alice");

      const importStatuses: Array<{
        status: string;
        message?: string;
        retryAfterSeconds?: number;
      }> = [];
      alice.on(
        SocketEvents.PROBLEM_IMPORT_STATUS,
        (payload: { status: string; message?: string; retryAfterSeconds?: number }) => {
          importStatuses.push(payload);
        },
      );

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });
      await waitForEvent(alice, SocketEvents.PROBLEM_LOADED);
      await vi.waitFor(() => {
        expect(importStatuses.map((payload) => payload.status)).toContain("saved");
      });

      const failedStatusPromise = waitForEvent<{
        status: string;
        message?: string;
        retryAfterSeconds?: number;
      }>(alice, SocketEvents.PROBLEM_IMPORT_STATUS);

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      const status = await failedStatusPromise;

      expect(status.status).toBe("failed");
      expect(status.message).toContain("Too many import attempts");
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
      expect(mockImportFromUrl).toHaveBeenCalledOnce();
    });

    it("broadcasts failed status to the whole room after a scraping error", async () => {
      mockImportFromUrl.mockRejectedValue(new Error("LeetCode import failed"));
      vi.spyOn(globalCounters, "canImport").mockReturnValue(true);
      const { server, room } = await setup();

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);

      await joinUser(alice, "Alice");
      await joinUser(bob, "Bob");
      await waitForEvent(alice, SocketEvents.USER_JOINED);

      const aliceStatuses: string[] = [];
      const bobStatuses: string[] = [];
      alice.on(SocketEvents.PROBLEM_IMPORT_STATUS, (payload: { status: string }) => {
        aliceStatuses.push(payload.status);
      });
      bob.on(SocketEvents.PROBLEM_IMPORT_STATUS, (payload: { status: string }) => {
        bobStatuses.push(payload.status);
      });

      alice.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
      });

      await vi.waitFor(() => {
        expect(aliceStatuses).toEqual(["scraping", "failed"]);
        expect(bobStatuses).toEqual(["scraping", "failed"]);
      });
    });
  });
});
