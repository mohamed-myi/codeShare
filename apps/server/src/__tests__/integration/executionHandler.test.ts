import type {
  BoilerplateTemplate,
  ExecutionError,
  Problem,
  RunResult,
  SubmitResult,
  TestCase,
} from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import type { Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { createLogger } from "../../lib/logger.js";
import { globalCounters } from "../../lib/rateLimitCounters.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { createTestClient, createTestServer, waitForEvent } from "../helpers/socketTestHelper.js";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

const mockProblem: Problem = {
  id: VALID_UUID,
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays & Hashing",
  description: "Given an array of integers...",
  constraints: [],
  solution: null,
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockBoilerplate: BoilerplateTemplate = {
  id: "bp-1",
  problemId: VALID_UUID,
  language: "python",
  template: "class Solution:\n    def twoSum(self, nums, target):\n        pass",
  methodName: "twoSum",
  parameterNames: ["nums", "target"],
};

const visibleTestCases: TestCase[] = [
  {
    id: "tc-1",
    problemId: VALID_UUID,
    input: { nums: [2, 7, 11, 15], target: 9 },
    expectedOutput: [0, 1],
    isVisible: true,
    orderIndex: 0,
  },
];

const allTestCases: TestCase[] = [
  ...visibleTestCases,
  {
    id: "tc-2",
    problemId: VALID_UUID,
    input: { nums: [3, 2, 4], target: 6 },
    expectedOutput: [1, 2],
    isVisible: false,
    orderIndex: 1,
  },
];

// Mocks
const mockSubmit = vi.hoisted(() => vi.fn());
const mockFindVisible = vi.hoisted(() => vi.fn());
const mockFindByProblemId = vi.hoisted(() => vi.fn());
const mockFindByProblemAndLanguage = vi.hoisted(() => vi.fn());
const mockFindProblemById = vi.hoisted(() => vi.fn());

vi.mock("@codeshare/db", () => ({
  testCaseRepository: {
    findVisible: mockFindVisible,
    findByProblemId: mockFindByProblemId,
  },
  boilerplateRepository: {
    findByProblemAndLanguage: mockFindByProblemAndLanguage,
  },
  problemRepository: {
    findById: mockFindProblemById,
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../services/ProblemService.js", () => ({
  problemService: {
    getById: vi.fn(),
  },
}));

const logger = createLogger("silent");

function extractNonceFromHarness(harnessSource: string): string {
  const match = harnessSource.match(/===HARNESS_RESULT_([a-f0-9]+)===/);
  return match?.[1] ?? "unknown";
}

function makeSuccessStdout(results: unknown[], nonce: string): string {
  const payload = JSON.stringify({ results, userStdout: "" });
  return `===HARNESS_RESULT_${nonce}===\n${payload}\n===END_HARNESS_RESULT_${nonce}===\n`;
}

function mockJudge0Success(
  results: unknown[],
  overrides?: Partial<{ stderr: string | null; time: string | null; memory: number | null }>,
) {
  return (harnessSource: string) => {
    const nonce = extractNonceFromHarness(harnessSource);
    return Promise.resolve({
      stdout: makeSuccessStdout(results, nonce),
      stderr: overrides?.stderr ?? null,
      status: { id: 3, description: "Accepted" },
      time: overrides?.time ?? "0.01",
      memory: overrides?.memory ?? 9000,
    });
  };
}

describe("Execution handler", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];
  const yjsDocs = new Map<string, Y.Doc>();

  function getDoc(roomCode: string): Y.Doc | undefined {
    return yjsDocs.get(roomCode);
  }

  beforeEach(() => {
    mockSubmit.mockReset();
    mockFindVisible.mockReset();
    mockFindByProblemId.mockReset();
    mockFindByProblemAndLanguage.mockReset();
    mockFindProblemById.mockReset();

    mockFindVisible.mockResolvedValue(visibleTestCases);
    mockFindByProblemId.mockResolvedValue(allTestCases);
    mockFindByProblemAndLanguage.mockResolvedValue(mockBoilerplate);
    mockFindProblemById.mockResolvedValue(mockProblem);
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
    doc
      .getText("monaco")
      .insert(0, "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]");

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger, {
      getDoc,
      judge0Client: { submit: mockSubmit },
      dailyLimit: 100,
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

  // --- CODE_RUN tests ---

  describe("CODE_RUN", () => {
    it("happy path: both clients receive EXECUTION_STARTED then EXECUTION_RESULT (RunResult)", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockImplementation(
        mockJudge0Success([{ index: 0, passed: true, elapsed_ms: 10, got: null, expected: null }]),
      );

      const alice = connectClient(server.port, room.roomCode);
      const bob = connectClient(server.port, room.roomCode);
      await Promise.all([waitForEvent(alice, "connect"), waitForEvent(bob, "connect")]);
      await joinUser(alice, "Alice");
      await joinUser(bob, "Bob");
      await waitForEvent(alice, SocketEvents.USER_JOINED);

      const aliceStarted = waitForEvent(alice, SocketEvents.EXECUTION_STARTED);
      const bobStarted = waitForEvent(bob, SocketEvents.EXECUTION_STARTED);
      const aliceResult = waitForEvent<RunResult>(alice, SocketEvents.EXECUTION_RESULT);
      const bobResult = waitForEvent<RunResult>(bob, SocketEvents.EXECUTION_RESULT);

      alice.emit(SocketEvents.CODE_RUN);

      await Promise.all([aliceStarted, bobStarted]);
      const [result] = await Promise.all([aliceResult, bobResult]);

      expect(result.type).toBe("run");
      expect(result.passed).toBe(1);
      expect(result.total).toBe(1);
      expect(result.cases[0].passed).toBe(true);
    });

    it("run includes visible + custom test cases", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;
      room.customTestCases = [{ input: { nums: [1, 3], target: 4 }, expectedOutput: [0, 1] }];

      mockSubmit.mockImplementation(
        mockJudge0Success([
          { index: 0, passed: true, elapsed_ms: 10, got: null, expected: null },
          { index: 1, passed: true, elapsed_ms: 5, got: null, expected: null },
        ]),
      );

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const result = waitForEvent<RunResult>(alice, SocketEvents.EXECUTION_RESULT);
      alice.emit(SocketEvents.CODE_RUN);
      const runResult = await result;

      expect(runResult.total).toBe(2);
    });

    it("execution locking: executionInProgress true during, false after", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      let resolveSubmit!: (value: unknown) => void;
      let capturedNonce = "unknown";
      mockSubmit.mockImplementation((harnessSource: string) => {
        capturedNonce = extractNonceFromHarness(harnessSource);
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      alice.emit(SocketEvents.CODE_RUN);
      await waitForEvent(alice, SocketEvents.EXECUTION_STARTED);
      expect(room.executionInProgress).toBe(true);

      resolveSubmit({
        stdout: makeSuccessStdout(
          [{ index: 0, passed: true, elapsed_ms: 10, got: null, expected: null }],
          capturedNonce,
        ),
        stderr: null,
        status: { id: 3, description: "Accepted" },
        time: "0.01",
        memory: 9000,
      });

      await waitForEvent(alice, SocketEvents.EXECUTION_RESULT);
      expect(room.executionInProgress).toBe(false);
    });
  });

  describe("CODE_SUBMIT", () => {
    it("does not leak hidden testcase input in the first failure payload", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockImplementation(
        mockJudge0Success([
          { index: 0, passed: true, elapsed_ms: 10, got: null, expected: null },
          { index: 1, passed: false, elapsed_ms: 9, got: "[0, 2]", expected: "[1, 2]" },
        ]),
      );

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const resultPromise = waitForEvent<SubmitResult>(alice, SocketEvents.EXECUTION_RESULT);
      alice.emit(SocketEvents.CODE_SUBMIT);
      const result = await resultPromise;

      expect(result.type).toBe("submit");
      expect(result.firstFailure).not.toBeNull();
      expect(result.firstFailure?.input).toBe("");
      expect(result.firstFailure?.expected).toMatch(/hidden/i);
      expect(result.firstFailure?.got).toMatch(/hidden/i);
    });
  });

  // --- CODE_SUBMIT tests ---

  describe("CODE_SUBMIT", () => {
    it("happy path: all DB test cases used, SubmitResult returned", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockImplementation(
        mockJudge0Success([
          { index: 0, passed: true, elapsed_ms: 10, got: null, expected: null },
          { index: 1, passed: true, elapsed_ms: 8, got: null, expected: null },
        ]),
      );

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const result = waitForEvent<SubmitResult>(alice, SocketEvents.EXECUTION_RESULT);
      alice.emit(SocketEvents.CODE_SUBMIT);
      const submitResult = await result;

      expect(submitResult.type).toBe("submit");
      expect(submitResult.passed).toBe(2);
      expect(submitResult.total).toBe(2);
      expect(submitResult.firstFailure).toBeNull();
    });

    it("custom test cases NOT included in submit", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;
      room.customTestCases = [{ input: { nums: [99], target: 99 }, expectedOutput: 99 }];

      mockSubmit.mockImplementation(
        mockJudge0Success([
          { index: 0, passed: true, elapsed_ms: 10, got: null, expected: null },
          { index: 1, passed: true, elapsed_ms: 8, got: null, expected: null },
        ]),
      );

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const result = waitForEvent<SubmitResult>(alice, SocketEvents.EXECUTION_RESULT);
      alice.emit(SocketEvents.CODE_SUBMIT);
      const submitResult = await result;

      // Should only have 2 (all DB test cases), not 3 (with custom)
      expect(submitResult.total).toBe(2);
    });
  });

  // --- Error handling tests ---

  describe("error handling", () => {
    it("rejects execution when the code exceeds the configured size limit", async () => {
      const room = roomManager.createRoom("collaboration");
      roomCodes.push(room.roomCode);
      room.problemId = VALID_UUID;

      const doc = new Y.Doc();
      yjsDocs.set(room.roomCode, doc);
      doc.getText("monaco").insert(0, "x".repeat(64));

      const server = await createTestServer();
      cleanup = server.cleanup;

      setupSocketIO(server.io, logger, {
        getDoc,
        judge0Client: { submit: mockSubmit },
        dailyLimit: 100,
        maxCodeBytes: 32,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;

      expect(errPayload.errorType).toBe("api_error");
      expect(errPayload.message).toContain("Code size limit exceeded");
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("Judge0 API error (non-200 throw) -> EXECUTION_ERROR api_error", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockRejectedValue(new Error("Judge0 API error: 429"));

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const started = waitForEvent(alice, SocketEvents.EXECUTION_STARTED);
      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);

      await started;
      const errPayload = await error;
      expect(errPayload.errorType).toBe("api_error");
    });

    it("Judge0 timeout (AbortError) -> api_timeout", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      const abortError = new DOMException("The operation was aborted", "AbortError");
      mockSubmit.mockRejectedValue(abortError);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("api_timeout");
    });

    it("Judge0 compilation error (status.id === 6) -> compilation_error with stderr", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockResolvedValue({
        stdout: null,
        stderr: "SyntaxError: invalid syntax",
        status: { id: 6, description: "Compilation Error" },
        time: null,
        memory: null,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("compilation_error");
      expect(errPayload.message).toContain("SyntaxError");
    });

    it("Judge0 TLE (status.id === 5) -> timeout", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockResolvedValue({
        stdout: null,
        stderr: null,
        status: { id: 5, description: "Time Limit Exceeded" },
        time: "5.0",
        memory: 256000,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("timeout");
    });

    it("Judge0 runtime error (status.id === 11) -> runtime_error with stderr", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockResolvedValue({
        stdout: null,
        stderr: "ZeroDivisionError: division by zero",
        status: { id: 11, description: "Runtime Error (NZEC)" },
        time: "0.01",
        memory: 9000,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("runtime_error");
      expect(errPayload.message).toContain("ZeroDivisionError");
    });

    it("harness parse failure (no markers) -> parse_error", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      mockSubmit.mockResolvedValue({
        stdout: "some unexpected output without markers",
        stderr: null,
        status: { id: 3, description: "Accepted" },
        time: "0.01",
        memory: 9000,
      });

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("parse_error");
    });

    it("does not count a failed pre-submit configuration check as a submission", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;
      room.submissionsUsed = 0;
      mockFindByProblemAndLanguage.mockResolvedValueOnce(null);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;

      expect(errPayload.errorType).toBe("api_error");
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(room.submissionsUsed).toBe(0);
    });

    it("global daily limit -> EXECUTION_ERROR global_limit (no STARTED)", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;

      // Exhaust global limit
      vi.spyOn(globalCounters, "reserveSubmission").mockReturnValue(false);

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const error = waitForEvent<ExecutionError>(alice, SocketEvents.EXECUTION_ERROR);
      alice.emit(SocketEvents.CODE_RUN);
      const errPayload = await error;
      expect(errPayload.errorType).toBe("global_limit");

      vi.restoreAllMocks();
    });

    it("room limit -> EVENT_REJECTED by auth middleware (no STARTED)", async () => {
      const { server, room } = await setup();
      room.problemId = VALID_UUID;
      room.submissionsUsed = room.submissionLimit;

      const alice = connectClient(server.port, room.roomCode);
      await waitForEvent(alice, "connect");
      await joinUser(alice, "Alice");

      const rejected = waitForEvent<{ event: string; reason: string }>(
        alice,
        SocketEvents.EVENT_REJECTED,
      );
      alice.emit(SocketEvents.CODE_RUN);
      const payload = await rejected;
      expect(payload.event).toBe(SocketEvents.CODE_RUN);
      expect(payload.reason).toMatch(/limit/i);
    });
  });
});
