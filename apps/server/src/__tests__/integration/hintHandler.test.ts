import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import * as Y from "yjs";
import { SocketEvents, TIMEOUTS } from "@codeshare/shared";
import type { HintDonePayload, HintPendingPayload } from "@codeshare/shared";
import {
  createTestServer,
  createTestClient,
  waitForEvent,
} from "../helpers/socketTestHelper.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { roomManager } from "../../models/RoomManager.js";
import { createLogger } from "../../lib/logger.js";

const mockFindHintsByProblemId = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockFindProblemById = vi.hoisted(() => vi.fn().mockResolvedValue(null));

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
    findByProblemId: mockFindHintsByProblemId,
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
    buildLLMMessages: vi.fn().mockReturnValue([
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ]),
    sanitizeLLMHint: vi.fn((text: string) => text),
  },
}));

const logger = createLogger("silent");

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

describe("Hint handler guards", () => {
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

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    const joinP = waitForEvent(client, SocketEvents.USER_JOINED);
    client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    await joinP;

    return { room, client, server };
  }

  it("rejects hint request when no problem is selected", async () => {
    const { client } = await setup();

    const error = waitForEvent<{ message: string }>(
      client,
      SocketEvents.HINT_ERROR,
    );
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await error;

    expect(payload.message).toBe("Select a problem to request hints.");
  });

  it("rejects hint request when hints are exhausted", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintsUsed = 2;
    room.hintLimit = 2;

    const error = waitForEvent<{ message: string }>(
      client,
      SocketEvents.HINT_ERROR,
    );
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await error;

    expect(payload.message).toBe("No more hints available.");
  });

  it("rejects hint request when execution is in progress", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintLimit = 3;
    room.executionInProgress = true;

    const error = waitForEvent<{ message: string }>(
      client,
      SocketEvents.HINT_ERROR,
    );
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await error;

    expect(payload.message).toBe(
      "Cannot request hints while code is executing.",
    );
  });

  it("rejects hint request when a pending request exists", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintLimit = 3;
    room.pendingHintRequest = {
      requestedBy: "someone",
      requestedAt: new Date().toISOString(),
    };

    const error = waitForEvent<{ message: string }>(
      client,
      SocketEvents.HINT_ERROR,
    );
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await error;

    expect(payload.message).toBe("A hint request is already pending.");
  });

  it("rejects hint request when hint is currently streaming", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintLimit = 3;
    room.hintStreaming = true;

    const error = waitForEvent<{ message: string }>(
      client,
      SocketEvents.HINT_ERROR,
    );
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await error;

    expect(payload.message).toBe("A hint is currently being delivered.");
  });
});

describe("Hint handler - single user stored hint delivery", () => {
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
    mockFindHintsByProblemId.mockReset();
  });

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    const joinP = waitForEvent(client, SocketEvents.USER_JOINED);
    client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    await joinP;

    return { room, client, server };
  }

  it("delivers stored hint directly when single user requests", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    mockFindHintsByProblemId.mockResolvedValue([
      { id: "h1", problemId: VALID_UUID, hintText: "Use a hash map", orderIndex: 1 },
      { id: "h2", problemId: VALID_UUID, hintText: "Consider two pointers", orderIndex: 2 },
    ]);

    const chunks: unknown[] = [];
    client.on(SocketEvents.HINT_CHUNK, (data: unknown) => chunks.push(data));

    const doneP = waitForEvent<HintDonePayload>(client, SocketEvents.HINT_DONE);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await doneP;

    expect(payload.fullHint).toBe("Use a hash map");
    expect(payload.hintsRemaining).toBe(1);
    expect(room.hintsUsed).toBe(1);
    expect(chunks).toHaveLength(0);
  });

  it("calculates hintsRemaining correctly with prior usage", async () => {
    const { room, client } = await setup();
    room.problemId = VALID_UUID;
    room.hintsUsed = 1;
    room.hintLimit = 3;

    mockFindHintsByProblemId.mockResolvedValue([
      { id: "h1", problemId: VALID_UUID, hintText: "First hint", orderIndex: 1 },
      { id: "h2", problemId: VALID_UUID, hintText: "Second hint", orderIndex: 2 },
      { id: "h3", problemId: VALID_UUID, hintText: "Third hint", orderIndex: 3 },
    ]);

    const doneP = waitForEvent<HintDonePayload>(client, SocketEvents.HINT_DONE);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await doneP;

    expect(payload.fullHint).toBe("Second hint");
    expect(payload.hintsRemaining).toBe(1);
    expect(room.hintsUsed).toBe(2);
  });
});

const mockProblem = {
  id: VALID_UUID,
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy" as const,
  category: "Arrays & Hashing",
  description: "Given an array of integers...",
  constraints: ["2 <= nums.length <= 10^4"],
  solution: null,
  timeLimitMs: 5000,
  source: "curated" as const,
  sourceUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("Hint handler - single user LLM streaming fallback", () => {
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
    mockFindHintsByProblemId.mockReset();
    mockFindProblemById.mockReset();
  });

  async function* mockStream(chunks: string[]): AsyncGenerator<string> {
    for (const chunk of chunks) yield chunk;
  }

  async function setup(opts?: {
    groqClient?: { streamCompletion: ReturnType<typeof vi.fn> };
    enableLLMHintFallback?: boolean;
    enableImportedProblemHints?: boolean;
  }) {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const server = await createTestServer();
    cleanup = server.cleanup;

    // Yjs doc with some code content for LLM prompt context
    const doc = new Y.Doc();
    doc.getText("monaco").insert(0, "def twoSum(nums, target): pass");
    const getDoc = (_roomCode: string) => doc;

    setupSocketIO(server.io, logger, {
      getDoc,
      groqClient: opts?.groqClient,
      enableLLMHintFallback: opts?.enableLLMHintFallback,
      enableImportedProblemHints: opts?.enableImportedProblemHints,
    });

    const client = createTestClient(server.port, room.roomCode);
    clients.push(client);
    await waitForEvent(client, "connect");

    const joinP = waitForEvent(client, SocketEvents.USER_JOINED);
    client.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    await joinP;

    return { room, client, server, doc };
  }

  it("delivers a validated LLM hint when stored hints are exhausted", async () => {
    const mockGroqClient = {
      streamCompletion: vi.fn().mockReturnValue(mockStream(["Hello", " world"])),
    };
    const { room, client } = await setup({
      groqClient: mockGroqClient,
      enableLLMHintFallback: true,
    });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    // No stored hints -- triggers LLM fallback
    mockFindHintsByProblemId.mockResolvedValue([]);
    mockFindProblemById.mockResolvedValue(mockProblem);

    const doneP = waitForEvent<HintDonePayload>(client, SocketEvents.HINT_DONE);
    client.emit(SocketEvents.HINT_REQUEST);
    const result = await doneP;

    expect(result.fullHint).toBe("Hello world");
    expect(result.hintsRemaining).toBe(1);
    expect(room.hintsUsed).toBe(1);
    expect(room.hintStreaming).toBe(false);
  });

  it("emits HINT_ERROR when LLM streaming fails", async () => {
    async function* failingStream(): AsyncGenerator<string> {
      throw new Error("Groq API error: 500");
    }
    const mockGroqClient = {
      streamCompletion: vi.fn().mockReturnValue(failingStream()),
    };
    const { room, client } = await setup({
      groqClient: mockGroqClient,
      enableLLMHintFallback: true,
    });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    mockFindHintsByProblemId.mockResolvedValue([]);
    mockFindProblemById.mockResolvedValue(mockProblem);

    const errorP = waitForEvent<{ message: string }>(client, SocketEvents.HINT_ERROR);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await errorP;

    expect(payload.message).toBe("Failed to generate hint. Please try again.");
    expect(room.hintsUsed).toBe(0);
    expect(room.hintStreaming).toBe(false);
  });

  it("emits HINT_ERROR when groqClient is not configured and fallback is needed", async () => {
    // No groqClient passed to setup
    const { room, client } = await setup({ enableLLMHintFallback: true });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    mockFindHintsByProblemId.mockResolvedValue([]);

    const errorP = waitForEvent<{ message: string }>(client, SocketEvents.HINT_ERROR);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await errorP;

    expect(payload.message).toBe(
      "AI hint fallback is unavailable because Groq is not configured.",
    );
    expect(room.hintsUsed).toBe(0);
    expect(room.hintStreaming).toBe(false);
  });

  it("rejects fallback when llm hint fallback is disabled", async () => {
    const { room, client } = await setup({ enableLLMHintFallback: false });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    mockFindHintsByProblemId.mockResolvedValue([]);

    const errorP = waitForEvent<{ message: string }>(client, SocketEvents.HINT_ERROR);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await errorP;

    expect(payload.message).toBe("No more curated hints available for this problem.");
  });

  it("rejects LLM hint when per-room LLM call limit is reached", async () => {
    const mockGroqClient = {
      streamCompletion: vi.fn().mockReturnValue(mockStream(["Hello"])),
    };
    const { room, client } = await setup({
      groqClient: mockGroqClient,
      enableLLMHintFallback: true,
    });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;
    room.llmCallsUsed = 15; // At the default limit

    mockFindHintsByProblemId.mockResolvedValue([]);
    mockFindProblemById.mockResolvedValue(mockProblem);

    const errorP = waitForEvent<{ message: string }>(client, SocketEvents.HINT_ERROR);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await errorP;

    expect(payload.message).toBe("AI hint limit for this room has been reached.");
    expect(room.hintsUsed).toBe(0);
    expect(mockGroqClient.streamCompletion).not.toHaveBeenCalled();
  });

  it("increments llmCallsUsed on successful LLM hint delivery", async () => {
    const mockGroqClient = {
      streamCompletion: vi.fn().mockReturnValue(mockStream(["Valid hint"])),
    };
    const { room, client } = await setup({
      groqClient: mockGroqClient,
      enableLLMHintFallback: true,
    });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;
    room.llmCallsUsed = 0;

    mockFindHintsByProblemId.mockResolvedValue([]);
    mockFindProblemById.mockResolvedValue(mockProblem);

    const doneP = waitForEvent<HintDonePayload>(client, SocketEvents.HINT_DONE);
    client.emit(SocketEvents.HINT_REQUEST);
    await doneP;

    expect(room.llmCallsUsed).toBe(1);
  });

  it("rejects llm hints for imported problems when imported fallback is disabled", async () => {
    const { room, client } = await setup({
      groqClient: {
        streamCompletion: vi.fn().mockReturnValue(mockStream(["Hello"])),
      },
      enableLLMHintFallback: true,
      enableImportedProblemHints: false,
    });
    room.problemId = VALID_UUID;
    room.hintsUsed = 0;
    room.hintLimit = 2;

    mockFindHintsByProblemId.mockResolvedValue([]);
    mockFindProblemById.mockResolvedValue({
      ...mockProblem,
      source: "user_submitted",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
    });

    const errorP = waitForEvent<{ message: string }>(client, SocketEvents.HINT_ERROR);
    client.emit(SocketEvents.HINT_REQUEST);
    const payload = await errorP;

    expect(payload.message).toBe("AI hints for imported problems are disabled.");
  });
});

describe("Hint handler - two-user mutual consent flow", () => {
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
    mockFindHintsByProblemId.mockReset();
  });

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);
    room.problemId = VALID_UUID;
    room.hintLimit = 2;

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    // User A (Alice)
    const clientA = createTestClient(server.port, room.roomCode);
    clients.push(clientA);
    await waitForEvent(clientA, "connect");
    const joinPA = waitForEvent<{ userId: string }>(clientA, SocketEvents.USER_JOINED);
    clientA.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    const aliceJoined = await joinPA;

    // User B (Bob)
    const clientB = createTestClient(server.port, room.roomCode);
    clients.push(clientB);
    await waitForEvent(clientB, "connect");
    const joinPB = waitForEvent<{ userId: string }>(clientB, SocketEvents.USER_JOINED);
    clientB.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
    const bobJoined = await joinPB;

    return { room, clientA, clientB, aliceId: aliceJoined.userId, bobId: bobJoined.userId };
  }

  it("emits HINT_PENDING to other user when requester sends HINT_REQUEST", async () => {
    const { room, clientA, clientB, aliceId } = await setup();

    // Listen for HINT_PENDING on Bob's socket
    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);

    // Alice should NOT receive HINT_PENDING
    let aliceReceivedPending = false;
    clientA.on(SocketEvents.HINT_PENDING, () => {
      aliceReceivedPending = true;
    });

    clientA.emit(SocketEvents.HINT_REQUEST);
    const payload = await pendingP;

    expect(payload.requestedBy).toBe(aliceId);
    expect(payload.displayName).toBe("Alice");
    expect(payload.hintsUsed).toBe(0);
    expect(payload.hintLimit).toBe(2);

    expect(room.pendingHintRequest).not.toBeNull();
    expect(room.pendingHintRequest!.requestedBy).toBe(aliceId);

    // Give a small window for any stray events
    await new Promise((r) => setTimeout(r, 100));
    expect(aliceReceivedPending).toBe(false);
  });

  it("syncs the requester with pending hint state via ROOM_SYNC", async () => {
    const { clientA, clientB, aliceId } = await setup();

    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    const roomSyncP = waitForEvent<{ pendingHintRequest: { requestedBy: string } | null }>(
      clientA,
      SocketEvents.ROOM_SYNC,
    );

    clientA.emit(SocketEvents.HINT_REQUEST);

    await pendingP;
    const syncPayload = await roomSyncP;

    expect(syncPayload.pendingHintRequest?.requestedBy).toBe(aliceId);
  });

  it("delivers hint when other user approves", async () => {
    const { room, clientA, clientB } = await setup();

    mockFindHintsByProblemId.mockResolvedValue([
      { id: "h1", problemId: VALID_UUID, hintText: "Use a hash map", orderIndex: 1 },
      { id: "h2", problemId: VALID_UUID, hintText: "Consider two pointers", orderIndex: 2 },
    ]);

    // Alice requests -> Bob receives HINT_PENDING
    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    // Both users listen for HINT_DONE
    const donePA = waitForEvent<HintDonePayload>(clientA, SocketEvents.HINT_DONE);
    const donePB = waitForEvent<HintDonePayload>(clientB, SocketEvents.HINT_DONE);

    // Bob approves
    clientB.emit(SocketEvents.HINT_APPROVE);

    const [resultA, resultB] = await Promise.all([donePA, donePB]);

    expect(resultA.fullHint).toBe("Use a hash map");
    expect(resultA.hintsRemaining).toBe(1);
    expect(resultB.fullHint).toBe("Use a hash map");
    expect(resultB.hintsRemaining).toBe(1);

    expect(room.pendingHintRequest).toBeNull();
    expect(room.hintsUsed).toBe(1);
  });

  it("denies hint when other user denies", async () => {
    const { room, clientA, clientB } = await setup();

    // Alice requests -> Bob receives HINT_PENDING
    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    // Alice listens for HINT_DENIED
    const deniedP = waitForEvent(clientA, SocketEvents.HINT_DENIED);

    // Bob should NOT receive HINT_DENIED
    let bobReceivedDenied = false;
    clientB.on(SocketEvents.HINT_DENIED, () => {
      bobReceivedDenied = true;
    });

    // Bob denies
    clientB.emit(SocketEvents.HINT_DENY);

    await deniedP;

    expect(room.pendingHintRequest).toBeNull();
    expect(room.hintsUsed).toBe(0);

    // Give a small window for any stray events
    await new Promise((r) => setTimeout(r, 100));
    expect(bobReceivedDenied).toBe(false);
  });

  it("syncs the responder back to idle when a request is denied", async () => {
    const { clientA, clientB } = await setup();

    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    const responderSync = waitForEvent<{ pendingHintRequest: null }>(
      clientB,
      SocketEvents.ROOM_SYNC,
    );
    clientB.emit(SocketEvents.HINT_DENY);

    const syncPayload = await responderSync;
    expect(syncPayload.pendingHintRequest).toBeNull();
  });
});

describe("Hint handler - 30s consent timeout and disconnect", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(async () => {
    vi.useRealTimers();
    for (const c of clients) c.disconnect();
    clients.length = 0;
    for (const code of roomCodes) roomManager.destroyRoom(code);
    roomCodes.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
    mockFindHintsByProblemId.mockReset();
  });

  async function setup() {
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);
    room.problemId = VALID_UUID;
    room.hintLimit = 2;

    const server = await createTestServer();
    cleanup = server.cleanup;

    setupSocketIO(server.io, logger);

    const clientA = createTestClient(server.port, room.roomCode);
    clients.push(clientA);
    await waitForEvent(clientA, "connect");
    const joinPA = waitForEvent(clientA, SocketEvents.USER_JOINED);
    clientA.emit(SocketEvents.USER_JOIN, { displayName: "Alice" });
    await joinPA;

    const clientB = createTestClient(server.port, room.roomCode);
    clients.push(clientB);
    await waitForEvent(clientB, "connect");
    const joinPB = waitForEvent(clientB, SocketEvents.USER_JOINED);
    clientB.emit(SocketEvents.USER_JOIN, { displayName: "Bob" });
    await joinPB;

    return { room, clientA, clientB };
  }

  it("auto-denies after 30s timeout", async () => {
    const { room, clientA, clientB } = await setup();

    // Alice requests -> Bob receives HINT_PENDING
    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    expect(room.pendingHintRequest).not.toBeNull();

    // Register denied listener with timeout longer than HINT_CONSENT_MS,
    // since fake timers control both waitForEvent's timeout and the consent timer.
    const deniedP = waitForEvent(clientA, SocketEvents.HINT_DENIED, TIMEOUTS.HINT_CONSENT_MS + 5000);

    // Advance past the 30s consent timeout
    await vi.advanceTimersByTimeAsync(TIMEOUTS.HINT_CONSENT_MS);

    await deniedP;

    expect(room.pendingHintRequest).toBeNull();
    expect(room.hintsUsed).toBe(0);
  });

  it("syncs the responder back to idle when the consent request times out", async () => {
    const { clientA, clientB } = await setup();

    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    const responderSync = waitForEvent<{ pendingHintRequest: null }>(
      clientB,
      SocketEvents.ROOM_SYNC,
      TIMEOUTS.HINT_CONSENT_MS + 5000,
    );

    await vi.advanceTimersByTimeAsync(TIMEOUTS.HINT_CONSENT_MS);

    const syncPayload = await responderSync;
    expect(syncPayload.pendingHintRequest).toBeNull();
  });

  it("clears pending state when requester disconnects", async () => {
    const { room, clientA, clientB } = await setup();

    // Alice requests -> Bob receives HINT_PENDING
    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    expect(room.pendingHintRequest).not.toBeNull();

    // Listen for USER_LEFT on Bob to confirm server processed Alice's disconnect
    const leftP = waitForEvent(clientB, SocketEvents.USER_LEFT, TIMEOUTS.HINT_CONSENT_MS + 5000);

    // Alice disconnects
    clientA.disconnect();

    // Wait for server to process disconnect (USER_LEFT emitted by roomHandler)
    await leftP;

    expect(room.pendingHintRequest).toBeNull();

    // Advance past 30s to verify no stale timeout fires (timer was cleared)
    await vi.advanceTimersByTimeAsync(TIMEOUTS.HINT_CONSENT_MS);

    // No error thrown -- timer was cleared
  });

  it("syncs the responder back to idle when the requester disconnects", async () => {
    const { clientA, clientB } = await setup();

    const pendingP = waitForEvent<HintPendingPayload>(clientB, SocketEvents.HINT_PENDING);
    clientA.emit(SocketEvents.HINT_REQUEST);
    await pendingP;

    const responderSync = waitForEvent<{ pendingHintRequest: null }>(
      clientB,
      SocketEvents.ROOM_SYNC,
      TIMEOUTS.HINT_CONSENT_MS + 5000,
    );

    clientA.disconnect();

    const syncPayload = await responderSync;
    expect(syncPayload.pendingHintRequest).toBeNull();
  });
});
