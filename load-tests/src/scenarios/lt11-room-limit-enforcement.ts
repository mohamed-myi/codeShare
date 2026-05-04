import { SocketEvents } from "@codeshare/shared";
import { assertBelow, assertEqual } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { waitForImportTerminalStatus } from "../lib/event-waiters.js";
import { PercentileTracker } from "../lib/metrics.js";
import { fetchFirstProblemId } from "../lib/problem-catalog.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
  selectProblem,
} from "../lib/room-lifecycle.js";
import { spawnServerProcesses } from "../lib/server-manager.js";
import { waitForEvent } from "../lib/socket-client.js";
import { NFR } from "../nfr-thresholds.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const LT11_SERVER_PORT = 3097;
const LT11_STUB_PORT = 4197;
const ROOM_COUNT = 3;
const SUBMISSION_LIMIT = 3;
const IMPORT_LIMIT = 2;
const TESTCASE_LIMIT = 3;

interface RoomState {
  roomCode: string;
  userA: RoomParticipant;
  userB: RoomParticipant;
}

const scenario: Scenario = {
  id: "LT-11",
  name: "Per-Room Limit Enforcement",
  requiresProblemData: true,

  async run(_config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const rejectionTracker = new PercentileTracker();
    const rooms: RoomState[] = [];
    const rejectionThreshold = NFR["NFR-4.2"].thresholds.roomLimitRejectionP95Ms;

    const procs = await spawnServerProcesses({
      serverPort: LT11_SERVER_PORT,
      stubPort: LT11_STUB_PORT,
      rateLimitOverrides: {
        ROOM_MAX_SUBMISSIONS: String(SUBMISSION_LIMIT),
        ROOM_MAX_IMPORTS: String(IMPORT_LIMIT),
        ROOM_MAX_CUSTOM_TEST_CASES: String(TESTCASE_LIMIT),
        RATE_LIMIT_IMPORT: "10000",
      },
    });

    try {
      const serverUrl = procs.serverUrl;
      const problemId = await fetchFirstProblemId(serverUrl);

      // Setup rooms
      for (let i = 0; i < ROOM_COUNT; i++) {
        const roomCode = await createLoadRoom(serverUrl);
        const userA = await joinLoadRoom(serverUrl, roomCode, `LT11-A-${i}`);
        const userB = await joinLoadRoom(serverUrl, roomCode, `LT11-B-${i}`);
        await selectProblem(userA.socket, problemId);
        rooms.push({ roomCode, userA, userB });
      }

      // Phase A: Submission limits
      let submissionSuccesses = 0;
      let submissionRejections = 0;

      await Promise.all(
        rooms.map(async (room) => {
          for (let attempt = 0; attempt < SUBMISSION_LIMIT + 1; attempt++) {
            const reqStart = hrtimeMs();

            if (attempt < SUBMISSION_LIMIT) {
              // Expect success (EXECUTION_RESULT or EXECUTION_ERROR both count as "processed")
              const resultPromise = waitForEvent(
                room.userA.socket,
                SocketEvents.EXECUTION_RESULT,
                30_000,
              ).then(() => "result" as const);

              const errorPromise = waitForEvent(
                room.userA.socket,
                SocketEvents.EXECUTION_ERROR,
                30_000,
              ).then(() => "error" as const);

              room.userA.socket.emit(SocketEvents.CODE_RUN, {});
              await Promise.race([resultPromise, errorPromise]);
              submissionSuccesses++;
            } else {
              // Expect EVENT_REJECTED from auth middleware
              const rejectedPromise = waitForEvent<{ event: string; reason: string }>(
                room.userA.socket,
                SocketEvents.EVENT_REJECTED,
                5_000,
              );
              room.userA.socket.emit(SocketEvents.CODE_RUN, {});
              await rejectedPromise;
              rejectionTracker.record(hrtimeMs() - reqStart);
              submissionRejections++;
            }
          }
        }),
      );

      assertions.push(
        assertEqual(
          "lt11-submission-allowed",
          "NFR-4.2",
          "Successful submissions across all rooms",
          submissionSuccesses,
          ROOM_COUNT * SUBMISSION_LIMIT,
        ),
      );

      assertions.push(
        assertEqual(
          "lt11-submission-capped",
          "NFR-4.2",
          "Submission rejections (one per room)",
          submissionRejections,
          ROOM_COUNT,
        ),
      );

      // Phase B: Import limits
      let importSuccesses = 0;
      let importFailures = 0;

      await Promise.all(
        rooms.map(async (room) => {
          for (let attempt = 0; attempt < IMPORT_LIMIT + 1; attempt++) {
            const reqStart = hrtimeMs();
            const statusPromise = waitForImportTerminalStatus(room.userA.socket, 15_000);

            room.userA.socket.emit(SocketEvents.PROBLEM_IMPORT, {
              leetcodeUrl: `https://leetcode.com/problems/two-sum-${room.roomCode}-${attempt}/`,
            });

            const result = await statusPromise;

            if (result.data.status === "saved") {
              importSuccesses++;
            } else {
              importFailures++;
              rejectionTracker.record(hrtimeMs() - reqStart);
            }
          }
        }),
      );

      assertions.push(
        assertEqual(
          "lt11-import-allowed",
          "NFR-4.2",
          "Successful imports across all rooms",
          importSuccesses,
          ROOM_COUNT * IMPORT_LIMIT,
        ),
      );

      assertions.push(
        assertEqual(
          "lt11-import-capped",
          "NFR-4.2",
          "Import failures (one per room)",
          importFailures,
          ROOM_COUNT,
        ),
      );

      // Phase C: Test case limits
      let testcaseSuccesses = 0;
      let testcaseErrors = 0;

      await Promise.all(
        rooms.map(async (room) => {
          for (let attempt = 0; attempt < TESTCASE_LIMIT + 1; attempt++) {
            const reqStart = hrtimeMs();
            const payload = {
              input: { nums: [1, 2], target: 3 },
              expectedOutput: [0, 1],
            };

            if (attempt < TESTCASE_LIMIT) {
              const addedPromise = waitForEvent(
                room.userA.socket,
                SocketEvents.TESTCASE_ADDED,
                5_000,
              );
              room.userA.socket.emit(SocketEvents.TESTCASE_ADD, payload);
              await addedPromise;
              testcaseSuccesses++;
            } else {
              const errorPromise = waitForEvent<{ message: string }>(
                room.userA.socket,
                SocketEvents.TESTCASE_ERROR,
                5_000,
              );
              room.userA.socket.emit(SocketEvents.TESTCASE_ADD, payload);
              await errorPromise;
              rejectionTracker.record(hrtimeMs() - reqStart);
              testcaseErrors++;
            }
          }
        }),
      );

      assertions.push(
        assertEqual(
          "lt11-testcase-allowed",
          "NFR-4.2",
          "Successful test cases across all rooms",
          testcaseSuccesses,
          ROOM_COUNT * TESTCASE_LIMIT,
        ),
      );

      assertions.push(
        assertEqual(
          "lt11-testcase-capped",
          "NFR-4.2",
          "Test case errors (one per room)",
          testcaseErrors,
          ROOM_COUNT,
        ),
      );

      // Rejection latency
      if (rejectionTracker.count() > 0) {
        assertions.push(
          assertBelow(
            "lt11-rejection-latency",
            "NFR-4.2",
            "Rejection/error p95 latency (ms)",
            rejectionTracker.p95(),
            rejectionThreshold,
          ),
        );
      }
    } finally {
      for (const room of rooms) {
        disconnectParticipant(room.userA);
        disconnectParticipant(room.userB);
      }
      procs.kill();
    }

    return {
      id: "LT-11",
      name: "Per-Room Limit Enforcement",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
