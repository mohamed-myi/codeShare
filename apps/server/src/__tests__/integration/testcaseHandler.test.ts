import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { SocketEvents } from "@codeshare/shared";
import type { CustomTestCase, BoilerplateTemplate } from "@codeshare/shared";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "../helpers/socketTestHelper.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { roomManager } from "../../models/RoomManager.js";
import { createLogger } from "../../lib/logger.js";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

const mockBoilerplate: BoilerplateTemplate = {
  id: "bp-1",
  problemId: VALID_UUID,
  language: "python",
  template: "def twoSum(nums, target):\n    pass",
  methodName: "twoSum",
  parameterNames: ["nums", "target"],
};

const mockGetById = vi.hoisted(() => vi.fn());
const mockFindByProblemAndLanguage = vi.hoisted(() => vi.fn());

vi.mock("../../services/ProblemService.js", () => ({
  problemService: { getById: mockGetById },
}));

vi.mock("@codeshare/db", () => ({
  boilerplateRepository: { findByProblemAndLanguage: mockFindByProblemAndLanguage },
  testCaseRepository: { findVisible: vi.fn().mockResolvedValue([]), findByProblemId: vi.fn().mockResolvedValue([]) },
  problemRepository: { findAll: vi.fn().mockResolvedValue([]) },
}));

const logger = createLogger("silent");

describe("Testcase handler", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  beforeEach(() => {
    mockGetById.mockReset();
    mockFindByProblemAndLanguage.mockReset();
    mockFindByProblemAndLanguage.mockResolvedValue(mockBoilerplate);
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
  });

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, { getDoc: () => undefined });

    return { server, room };
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

  describe("valid test case", () => {
    it("both clients receive TESTCASE_ADDED and room.customTestCases grows", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([
        waitForEvent(alice, "connect"),
        waitForEvent(bob, "connect"),
      ]);
      await joinUser(alice, "Alice");
      await joinUser(bob, "Bob");
      await waitForEvent(alice, SocketEvents.USER_JOINED);

      const aliceAdded = waitForEvent<{ testCase: CustomTestCase }>(
        alice,
        SocketEvents.TESTCASE_ADDED,
      );
      const bobAdded = waitForEvent<{ testCase: CustomTestCase }>(
        bob,
        SocketEvents.TESTCASE_ADDED,
      );

      alice.emit(SocketEvents.TESTCASE_ADD, {
        input: { nums: [1, 2], target: 3 },
        expectedOutput: [0, 1],
      });

      const [alicePayload, bobPayload] = await Promise.all([aliceAdded, bobAdded]);

      expect(alicePayload.testCase.input).toEqual({ nums: [1, 2], target: 3 });
      expect(alicePayload.testCase.expectedOutput).toEqual([0, 1]);
      expect(bobPayload.testCase).toEqual(alicePayload.testCase);
      expect(room.customTestCases).toHaveLength(1);
    });
  });

  describe("invalid input keys", () => {
    it("sender gets TESTCASE_ERROR for wrong keys vs parameterNames", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.TESTCASE_ADD, {
        input: { wrongKey: [1, 2] },
        expectedOutput: [0, 1],
      });

      const error = await waitForEvent<{ message: string }>(
        alice,
        SocketEvents.TESTCASE_ERROR,
      );
      expect(error.message).toMatch(/input keys/i);
    });
  });

  describe("10-case limit", () => {
    it("11th case rejected", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;
      // Pre-fill 10 custom test cases
      for (let i = 0; i < 10; i++) {
        room.customTestCases.push({ input: { nums: [i], target: i }, expectedOutput: i });
      }

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.TESTCASE_ADD, {
        input: { nums: [99], target: 99 },
        expectedOutput: 99,
      });

      const error = await waitForEvent<{ message: string }>(
        alice,
        SocketEvents.TESTCASE_ERROR,
      );
      expect(error.message).toMatch(/limit/i);
    });
  });

  describe("10KB size limit", () => {
    it("oversized payload rejected", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const largeValue = "x".repeat(11_000);
      alice.emit(SocketEvents.TESTCASE_ADD, {
        input: { nums: largeValue, target: 1 },
        expectedOutput: 1,
      });

      const error = await waitForEvent<{ message: string }>(
        alice,
        SocketEvents.TESTCASE_ERROR,
      );
      expect(error.message).toMatch(/size/i);
    });
  });

  describe("no problem selected", () => {
    it("rejected when no problem selected", async () => {
      const { server, room } = await setup();
      // room.problemId is null by default

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.TESTCASE_ADD, {
        input: { nums: [1], target: 1 },
        expectedOutput: 1,
      });

      const error = await waitForEvent<{ message: string }>(
        alice,
        SocketEvents.TESTCASE_ERROR,
      );
      expect(error.message).toMatch(/problem/i);
    });
  });

  describe("invalid payload", () => {
    it("missing fields rejected", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.TESTCASE_ADD, { badField: true });

      const error = await waitForEvent<{ message: string }>(
        alice,
        SocketEvents.TESTCASE_ERROR,
      );
      expect(error.message).toMatch(/invalid/i);
    });
  });
});
