import { describe, it, expect, vi, afterEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { SocketEvents } from "@codeshare/shared";
import type { Problem, UserJoinedPayload } from "@codeshare/shared";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "../helpers/socketTestHelper.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { roomManager } from "../../models/RoomManager.js";
import { createLogger } from "../../lib/logger.js";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

const mockProblem: Problem = {
  id: VALID_UUID,
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays & Hashing",
  description: "Given an array of integers...",
  constraints: [],
  solution: "Use a hash map to store complements",
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockFindProblemById = vi.hoisted(() => vi.fn());

vi.mock("@codeshare/db", () => ({
  testCaseRepository: {
    findVisible: vi.fn().mockResolvedValue([]),
    findByProblemId: vi.fn().mockResolvedValue([]),
  },
  boilerplateRepository: {
    findByProblemAndLanguage: vi.fn().mockResolvedValue(null),
  },
  problemRepository: {
    findById: mockFindProblemById,
    findAll: vi.fn().mockResolvedValue([]),
  },
  hintRepository: {
    findByProblemId: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../services/ProblemService.js", () => ({
  problemService: {
    getById: vi.fn(),
  },
}));

vi.mock("../../services/HintService.js", () => ({
  hintService: {
    getStoredHint: vi.fn(),
    buildLLMPrompt: vi.fn().mockReturnValue("mock prompt"),
  },
}));

const logger = createLogger("silent");

describe("Solution handler", () => {
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
    mockFindProblemById.mockReset();
  });

  async function setup() {
    const room = roomManager.createRoom("interview");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;
    setupSocketIO(server.io, logger);

    // Interviewer joins first (gets role=interviewer)
    const interviewer = createTestClient(server.port, room.roomCode);
    clients.push(interviewer);
    await waitForEvent(interviewer, "connect");
    const joinP = waitForEvent<UserJoinedPayload>(
      interviewer,
      SocketEvents.USER_JOINED,
    );
    interviewer.emit(SocketEvents.USER_JOIN, { displayName: "Interviewer" });
    const interviewerPayload = await joinP;
    expect(interviewerPayload.role).toBe("interviewer");

    // Candidate joins second (gets role=candidate)
    const candidate = createTestClient(server.port, room.roomCode);
    clients.push(candidate);
    await waitForEvent(candidate, "connect");
    const joinPC = waitForEvent<UserJoinedPayload>(
      candidate,
      SocketEvents.USER_JOINED,
    );
    candidate.emit(SocketEvents.USER_JOIN, { displayName: "Candidate" });
    await joinPC;
    // Consume the broadcast that interviewer receives about candidate joining
    await waitForEvent(interviewer, SocketEvents.USER_JOINED);

    return { room, interviewer, candidate, server };
  }

  async function setupSingleUser() {
    const room = roomManager.createRoom("interview");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;
    setupSocketIO(server.io, logger);

    const interviewer = createTestClient(server.port, room.roomCode);
    clients.push(interviewer);
    await waitForEvent(interviewer, "connect");
    const joinP = waitForEvent<UserJoinedPayload>(
      interviewer,
      SocketEvents.USER_JOINED,
    );
    interviewer.emit(SocketEvents.USER_JOIN, { displayName: "Interviewer" });
    await joinP;

    return { room, interviewer, server };
  }

  it("reveals solution when interviewer requests", async () => {
    const { room, interviewer, candidate } = await setup();
    room.problemId = VALID_UUID;
    mockFindProblemById.mockResolvedValue(mockProblem);

    const interviewerResult = waitForEvent<{ solution: string }>(
      interviewer,
      SocketEvents.SOLUTION_REVEALED,
    );
    const candidateResult = waitForEvent<{ solution: string }>(
      candidate,
      SocketEvents.SOLUTION_REVEALED,
    );

    interviewer.emit(SocketEvents.SOLUTION_REVEAL);

    const [iPayload, cPayload] = await Promise.all([
      interviewerResult,
      candidateResult,
    ]);

    expect(iPayload.solution).toBe("Use a hash map to store complements");
    expect(cPayload.solution).toBe("Use a hash map to store complements");
  });

  it("rejects solution reveal when no problem selected", async () => {
    const { interviewer } = await setupSingleUser();
    // room.problemId is null by default

    const error = waitForEvent<{ message: string }>(
      interviewer,
      SocketEvents.HINT_ERROR,
    );
    interviewer.emit(SocketEvents.SOLUTION_REVEAL);
    const payload = await error;

    expect(payload.message).toBe("Select a problem first.");
  });

  it("rejects solution reveal when problem has no solution", async () => {
    const { room, interviewer } = await setupSingleUser();
    room.problemId = VALID_UUID;

    const problemWithoutSolution: Problem = {
      ...mockProblem,
      solution: null,
    };
    mockFindProblemById.mockResolvedValue(problemWithoutSolution);

    const error = waitForEvent<{ message: string }>(
      interviewer,
      SocketEvents.HINT_ERROR,
    );
    interviewer.emit(SocketEvents.SOLUTION_REVEAL);
    const payload = await error;

    expect(payload.message).toBe("No solution available for this problem.");
  });

  it("rejects solution reveal in collaboration rooms", async () => {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);
    room.problemId = VALID_UUID;

    const server = await createTestServer();
    cleanup = server.cleanup;
    setupSocketIO(server.io, logger);

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    const joinP = waitForEvent<UserJoinedPayload>(client, SocketEvents.USER_JOINED);
    client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    await joinP;

    const rejected = waitForEvent<{ event: string; reason: string }>(
      client,
      SocketEvents.EVENT_REJECTED,
    );
    client.emit(SocketEvents.SOLUTION_REVEAL);

    await expect(rejected).resolves.toMatchObject({
      event: SocketEvents.SOLUTION_REVEAL,
    });
  });
});
