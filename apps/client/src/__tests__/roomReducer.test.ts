import { HINT_LIMIT_BY_DIFFICULTY } from "@codeshare/shared";
import { describe, expect, it } from "vitest";
import { initialRoomState, roomReducer } from "../reducers/roomReducer.ts";

describe("roomReducer", () => {
  it("handles EXECUTION_STARTED", () => {
    const next = roomReducer(
      { ...initialRoomState, lastError: "Old error" },
      {
        type: "EXECUTION_STARTED",
        payload: { executionType: "run" },
      },
    );
    expect(next.executionInProgress).toBe(true);
    expect(next.executionResult).toBeNull();
    expect(next.lastError).toBeNull();
  });

  it("handles PROBLEM_LOADED", () => {
    const stateWithPriorProblem = {
      ...initialRoomState,
      hintsUsed: 2,
      hintText: "some old hint",
      customTestCases: [{ input: { x: 1 }, expectedOutput: 1 }],
      pendingHintRequest: { requestedBy: "user1", requestedAt: "2024-01-01" },
      executionResult: { type: "run" as const, passed: 1, total: 1, cases: [], userStdout: "" },
      lastError: "old error",
      solution: "revealed solution from the previous problem",
    };

    const payload = {
      problem: {
        id: "p1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy" as const,
        category: "Arrays & Hashing",
        description: "Given an array...",
        constraints: ["2 <= nums.length <= 10^4"],
        solution: "Use a hash map",
        timeLimitMs: 5000,
        source: "curated" as const,
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      visibleTestCases: [
        {
          id: "tc-1",
          problemId: "p1",
          input: { nums: [2, 7], target: 9 },
          expectedOutput: [0, 1],
          isVisible: true,
          orderIndex: 0,
        },
      ],
      boilerplate: "class Solution:\n    def twoSum(self, nums, target):\n        pass",
      parameterNames: ["nums", "target"],
    };

    const next = roomReducer(stateWithPriorProblem, { type: "PROBLEM_LOADED", payload });

    expect(next.problemId).toBe("p1");
    expect(next.currentProblem).toEqual(payload.problem);
    expect(next.visibleTestCases).toEqual(payload.visibleTestCases);
    expect(next.parameterNames).toEqual(["nums", "target"]);
    expect(next.hintLimit).toBe(HINT_LIMIT_BY_DIFFICULTY.easy);
    expect(next.hintsUsed).toBe(0);
    expect(next.customTestCases).toEqual([]);
    expect(next.pendingHintRequest).toBeNull();
    expect(next.hintText).toBe("");
    expect(next.lastError).toBeNull();
    expect(next.executionResult).toBeNull();
    expect(next.solution).toBeNull();
  });

  it("handles PROBLEM_LOADED for hard problem", () => {
    const payload = {
      problem: {
        id: "p2",
        slug: "merge-k-sorted",
        title: "Merge K Sorted Lists",
        difficulty: "hard" as const,
        category: "Linked List",
        description: "...",
        constraints: [],
        solution: "Use a min heap",
        timeLimitMs: 5000,
        source: "curated" as const,
        sourceUrl: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      visibleTestCases: [],
      boilerplate: "class Solution: ...",
      parameterNames: [],
    };

    const next = roomReducer(initialRoomState, { type: "PROBLEM_LOADED", payload });
    expect(next.hintLimit).toBe(HINT_LIMIT_BY_DIFFICULTY.hard);
  });

  it("handles PROBLEM_ERROR", () => {
    const next = roomReducer(initialRoomState, {
      type: "PROBLEM_ERROR",
      payload: { message: "Problem not found." },
    });
    expect(next.lastError).toBe("Problem not found.");
  });

  it("handles HINT_PENDING", () => {
    const next = roomReducer(initialRoomState, {
      type: "HINT_PENDING",
      payload: { requestedBy: "user1", displayName: "Alice", hintsUsed: 0, hintLimit: 2 },
    });
    expect(next.pendingHintRequest).toBeDefined();
    expect(next.pendingHintRequest?.requestedBy).toBe("user1");
  });

  it("handles HINT_ERROR", () => {
    const next = roomReducer(initialRoomState, {
      type: "HINT_ERROR",
      payload: { message: "Hint generation failed." },
    });
    expect(next.lastError).toBe("Hint generation failed.");
  });

  it("handles USER_LEFT by marking user disconnected", () => {
    const withUser = {
      ...initialRoomState,
      users: [{ id: "u1", displayName: "Alice", role: "peer" as const, connected: true }],
    };
    const next = roomReducer(withUser, {
      type: "USER_LEFT",
      payload: { userId: "u1" },
    });
    expect(next.users[0].connected).toBe(false);
  });

  it("USER_JOINED upserts reconnecting user instead of duplicating", () => {
    const withDisconnected = {
      ...initialRoomState,
      users: [{ id: "u1", displayName: "Alice", role: "peer" as const, connected: false }],
    };

    const next = roomReducer(withDisconnected, {
      type: "USER_JOINED",
      payload: {
        userId: "u1",
        displayName: "Alice",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "",
        yjsToken: "",
      },
    });

    expect(next.users).toHaveLength(1);
    expect(next.users[0].id).toBe("u1");
    expect(next.users[0].connected).toBe(true);
  });

  it("USER_JOINED appends new user when not already in list", () => {
    const next = roomReducer(initialRoomState, {
      type: "USER_JOINED",
      payload: {
        userId: "u1",
        displayName: "Alice",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "tok",
        yjsToken: "yjs-tok",
      },
    });

    expect(next.users).toHaveLength(1);
    expect(next.users[0].id).toBe("u1");
    expect(next.users[0].connected).toBe(true);
    expect(next.currentUserId).toBe("u1");
  });

  it("USER_JOINED does not change currentUserId for another user broadcast", () => {
    const currentUserState = {
      ...initialRoomState,
      currentUserId: "u1",
      users: [{ id: "u1", displayName: "Alice", role: "peer" as const, connected: true }],
    };

    const next = roomReducer(currentUserState, {
      type: "USER_JOINED",
      payload: {
        userId: "u2",
        displayName: "Bob",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "",
        yjsToken: "",
      },
    });

    expect(next.currentUserId).toBe("u1");
    expect(next.users).toHaveLength(2);
  });

  it("handles EXECUTION_RESULT", () => {
    const running = {
      ...initialRoomState,
      executionInProgress: true,
      lastError: "Old error",
    };
    const result = {
      type: "run" as const,
      passed: 2,
      total: 3,
      cases: [],
      userStdout: "hello",
    };
    const next = roomReducer(running, { type: "EXECUTION_RESULT", payload: result });

    expect(next.executionInProgress).toBe(false);
    expect(next.executionResult).toEqual(result);
    expect(next.lastError).toBeNull();
  });

  it("handles EXECUTION_ERROR", () => {
    const running = { ...initialRoomState, executionInProgress: true };
    const next = roomReducer(running, {
      type: "EXECUTION_ERROR",
      payload: { errorType: "timeout" as const, message: "Timeout" },
    });

    expect(next.executionInProgress).toBe(false);
    expect(next.lastError).toBe("Timeout");
  });

  it("handles HINT_CHUNK by appending text", () => {
    const withHint = { ...initialRoomState, hintText: "Use a " };
    const next = roomReducer(withHint, {
      type: "HINT_CHUNK",
      payload: { text: "hash map" },
    });
    expect(next.hintText).toBe("Use a hash map");
    expect(next.isHintStreaming).toBe(true);
  });

  it("handles HINT_DONE", () => {
    const withHint = { ...initialRoomState, hintText: "partial", hintsUsed: 1 };
    const next = roomReducer(withHint, {
      type: "HINT_DONE",
      payload: { fullHint: "Complete hint text", hintsRemaining: 0 },
    });

    expect(next.hintText).toBe("Complete hint text");
    expect(next.hintsUsed).toBe(2);
    expect(next.isHintStreaming).toBe(false);
  });

  it("handles HINT_DENIED", () => {
    const withPending = {
      ...initialRoomState,
      pendingHintRequest: { requestedBy: "u1", requestedAt: "2024-01-01" },
    };
    const next = roomReducer(withPending, { type: "HINT_DENIED" });
    expect(next.pendingHintRequest).toBeNull();
  });

  it("handles TESTCASE_ADDED", () => {
    const tc = { input: { n: 5 }, expectedOutput: 10 };
    const next = roomReducer(initialRoomState, {
      type: "TESTCASE_ADDED",
      payload: { testCase: tc },
    });
    expect(next.customTestCases).toHaveLength(1);
    expect(next.customTestCases[0]).toEqual(tc);
  });

  it("handles SOLUTION_REVEALED", () => {
    const next = roomReducer(initialRoomState, {
      type: "SOLUTION_REVEALED",
      payload: { solution: "def solve(): return 42" },
    });
    expect(next.solution).toBe("def solve(): return 42");
  });

  it("handles EVENT_REJECTED", () => {
    const next = roomReducer(initialRoomState, {
      type: "EVENT_REJECTED",
      payload: { event: "code:run", reason: "No problem selected." },
    });
    expect(next.lastError).toBe("No problem selected.");
  });

  it("handles IMPORT_STATUS", () => {
    const next = roomReducer(initialRoomState, {
      type: "IMPORT_STATUS",
      payload: { status: "scraping" as const },
    });
    expect(next.importStatus).toEqual({ status: "scraping" });
  });

  it("PROBLEM_LOADED clears importStatus", () => {
    const importing = {
      ...initialRoomState,
      importStatus: { status: "scraping" as const },
    };
    const payload = {
      problem: {
        id: "p1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy" as const,
        category: "Arrays & Hashing",
        description: "...",
        constraints: [],
        solution: "...",
        timeLimitMs: 5000,
        source: "curated" as const,
        sourceUrl: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      visibleTestCases: [],
      boilerplate: "class Solution: ...",
      parameterNames: [],
    };
    const next = roomReducer(importing, { type: "PROBLEM_LOADED", payload });
    expect(next.importStatus).toBeNull();
  });

  it("HINT_CHUNK sets isHintStreaming to true", () => {
    const next = roomReducer(initialRoomState, {
      type: "HINT_CHUNK",
      payload: { text: "Consider" },
    });
    expect(next.isHintStreaming).toBe(true);
    expect(next.hintText).toBe("Consider");
  });

  it("HINT_DONE sets isHintStreaming to false and clears pendingHintRequest", () => {
    const streaming = {
      ...initialRoomState,
      isHintStreaming: true,
      hintText: "partial",
      pendingHintRequest: { requestedBy: "u1", requestedAt: "2024-01-01" },
    };
    const next = roomReducer(streaming, {
      type: "HINT_DONE",
      payload: { fullHint: "Complete hint", hintsRemaining: 1 },
    });
    expect(next.isHintStreaming).toBe(false);
    expect(next.pendingHintRequest).toBeNull();
  });

  it("HINT_ERROR sets isHintStreaming to false and clears pendingHintRequest", () => {
    const streaming = {
      ...initialRoomState,
      isHintStreaming: true,
      pendingHintRequest: { requestedBy: "u1", requestedAt: "2024-01-01" },
    };
    const next = roomReducer(streaming, {
      type: "HINT_ERROR",
      payload: { message: "Failed" },
    });
    expect(next.isHintStreaming).toBe(false);
    expect(next.pendingHintRequest).toBeNull();
  });

  it("HINT_DENIED sets isHintStreaming to false", () => {
    const streaming = { ...initialRoomState, isHintStreaming: true };
    const next = roomReducer(streaming, { type: "HINT_DENIED" });
    expect(next.isHintStreaming).toBe(false);
  });

  it("PROBLEM_LOADED sets isHintStreaming to false", () => {
    const streaming = { ...initialRoomState, isHintStreaming: true };
    const payload = {
      problem: {
        id: "p1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy" as const,
        category: "Arrays",
        description: "...",
        constraints: [],
        solution: null,
        timeLimitMs: 5000,
        source: "curated" as const,
        sourceUrl: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      visibleTestCases: [],
      boilerplate: "",
      parameterNames: [],
    };
    const next = roomReducer(streaming, { type: "PROBLEM_LOADED", payload });
    expect(next.isHintStreaming).toBe(false);
  });
});
