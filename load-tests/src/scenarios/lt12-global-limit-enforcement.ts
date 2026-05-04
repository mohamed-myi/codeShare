import { SocketEvents } from "@codeshare/shared";
import { assertEqual } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import {
  waitForExecutionAttemptOutcome,
  waitForImportTerminalStatus,
} from "../lib/event-waiters.js";
import { fetchFirstProblemId } from "../lib/problem-catalog.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
  selectProblem,
} from "../lib/room-lifecycle.js";
import { spawnServerProcesses } from "../lib/server-manager.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const LT12_SERVER_PORT = 3096;
const LT12_STUB_PORT = 4196;
const ROOM_COUNT = 3;
const EXEC_PER_ROOM = 3;
const IMPORT_PER_ROOM = 2;
const JUDGE0_DAILY_LIMIT = 8;
const IMPORTS_DAILY_LIMIT = 5;

interface RoomState {
  roomCode: string;
  userA: RoomParticipant;
  userB: RoomParticipant;
}

const scenario: Scenario = {
  id: "LT-12",
  name: "Global Limit Enforcement",
  requiresProblemData: true,

  async run(_config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const rooms: RoomState[] = [];

    const procs = await spawnServerProcesses({
      serverPort: LT12_SERVER_PORT,
      stubPort: LT12_STUB_PORT,
      rateLimitOverrides: {
        JUDGE0_DAILY_LIMIT: String(JUDGE0_DAILY_LIMIT),
        IMPORTS_DAILY_LIMIT: String(IMPORTS_DAILY_LIMIT),
        ROOM_MAX_SUBMISSIONS: "100",
        ROOM_MAX_IMPORTS: "100",
        RATE_LIMIT_IMPORT: "10000",
      },
    });

    try {
      const serverUrl = procs.serverUrl;
      const problemId = await fetchFirstProblemId(serverUrl);

      // Setup rooms
      for (let i = 0; i < ROOM_COUNT; i++) {
        const roomCode = await createLoadRoom(serverUrl);
        const userA = await joinLoadRoom(serverUrl, roomCode, `LT12-A-${i}`);
        const userB = await joinLoadRoom(serverUrl, roomCode, `LT12-B-${i}`);
        await selectProblem(userA.socket, problemId);
        rooms.push({ roomCode, userA, userB });
      }

      // Phase A: Execution daily limit
      // Total attempts = ROOM_COUNT * EXEC_PER_ROOM = 9
      // Daily limit = 8, so 8 consume a slot, 1 gets global_limit error
      // Note: executions may emit EXECUTION_ERROR with non-global errors (e.g., parse_error)
      // because no real code is written to the Yjs doc. These still consume a submission slot
      // (reserveSubmission is called before Judge0), which is what we're testing.
      let execSlotConsumed = 0;
      let execGlobalErrors = 0;

      // Run executions sequentially across rooms (round-robin) to avoid
      // concurrent reserveSubmission calls masking the limit boundary.
      for (let attempt = 0; attempt < EXEC_PER_ROOM; attempt++) {
        for (const room of rooms) {
          const outcomePromise = waitForExecutionAttemptOutcome(room.userA.socket, 30_000);

          room.userA.socket.emit(SocketEvents.CODE_RUN, {});

          const outcome = await outcomePromise;

          if (outcome.terminal.type === "result") {
            execSlotConsumed++;
          } else {
            const errorType = outcome.terminal.data.errorType;
            if (errorType === "global_limit") {
              execGlobalErrors++;
            } else {
              // Non-global errors (parse_error, api_error, etc.) still consumed a slot
              execSlotConsumed++;
            }
          }
        }
      }

      assertions.push(
        assertEqual(
          "lt12-exec-allowed",
          "NFR-4.3",
          "Executions that consumed a submission slot",
          execSlotConsumed,
          JUDGE0_DAILY_LIMIT,
        ),
      );

      assertions.push(
        assertEqual(
          "lt12-exec-capped",
          "NFR-4.3",
          "Global limit errors",
          execGlobalErrors,
          ROOM_COUNT * EXEC_PER_ROOM - JUDGE0_DAILY_LIMIT,
        ),
      );

      // Phase B: Import daily limit
      // Total attempts = ROOM_COUNT * IMPORT_PER_ROOM = 6
      // Daily limit = 5, so 5 succeed, 1 gets "Daily import limit" failure
      // Run sequentially (round-robin across rooms) to avoid race condition
      // where concurrent canImport checks all pass before any recordImport call.
      let importSuccesses = 0;
      let importGlobalFailures = 0;

      for (let attempt = 0; attempt < IMPORT_PER_ROOM; attempt++) {
        for (const room of rooms) {
          const statusPromise = waitForImportTerminalStatus(room.userA.socket, 15_000);

          room.userA.socket.emit(SocketEvents.PROBLEM_IMPORT, {
            leetcodeUrl: `https://leetcode.com/problems/two-sum-global-${room.roomCode}-${attempt}/`,
          });

          const result = await statusPromise;

          if (result.data.status === "saved") {
            importSuccesses++;
          } else if (result.data.message?.includes("Daily import limit")) {
            importGlobalFailures++;
          }
        }
      }

      assertions.push(
        assertEqual(
          "lt12-import-allowed",
          "NFR-4.3",
          "Import successes before global limit",
          importSuccesses,
          IMPORTS_DAILY_LIMIT,
        ),
      );

      assertions.push(
        assertEqual(
          "lt12-import-capped",
          "NFR-4.3",
          "Global import limit failures",
          importGlobalFailures,
          ROOM_COUNT * IMPORT_PER_ROOM - IMPORTS_DAILY_LIMIT,
        ),
      );
    } finally {
      for (const room of rooms) {
        disconnectParticipant(room.userA);
        disconnectParticipant(room.userB);
      }
      procs.kill();
    }

    return {
      id: "LT-12",
      name: "Global Limit Enforcement",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
