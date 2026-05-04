import { SocketEvents } from "@codeshare/shared";
import { assertEqual, assertNoFailures } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { fetchFirstProblemId } from "../lib/problem-catalog.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
  selectProblem,
} from "../lib/room-lifecycle.js";
import { spawnServerProcesses } from "../lib/server-manager.js";
import { createLoadSocket, waitForEvent } from "../lib/socket-client.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const LT10_SERVER_PORT = 3095;
const LT10_STUB_PORT = 4195;
const ROOM_COUNT = 5;
const ROGUE_TIMEOUT_MS = 300;

const GUARDED_EVENTS = [
  SocketEvents.CODE_RUN,
  SocketEvents.PROBLEM_SELECT,
  SocketEvents.HINT_REQUEST,
] as const;

interface RoomState {
  roomCode: string;
  userA: RoomParticipant;
  userB: RoomParticipant;
  problemId: string;
}

function sleep(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));
}

const scenario: Scenario = {
  id: "LT-10",
  name: "Non-Member Rejection",
  requiresProblemData: true,

  async run(_config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const rooms: RoomState[] = [];
    const rogueTimedSockets: Awaited<ReturnType<typeof createLoadSocket>>[] = [];

    const procs = await spawnServerProcesses({
      serverPort: LT10_SERVER_PORT,
      stubPort: LT10_STUB_PORT,
    });

    try {
      const serverUrl = procs.serverUrl;
      const problemId = await fetchFirstProblemId(serverUrl);

      // Phase 1: Create rooms with 2 legitimate users each, select a problem
      for (let i = 0; i < ROOM_COUNT; i++) {
        const roomCode = await createLoadRoom(serverUrl);
        const userA = await joinLoadRoom(serverUrl, roomCode, `LT10-A-${i}`);
        const userB = await joinLoadRoom(serverUrl, roomCode, `LT10-B-${i}`);
        await selectProblem(userA.socket, problemId);
        rooms.push({ roomCode, userA, userB, problemId });
      }

      // Phase 2: Create rogue sockets (connected but never USER_JOIN'd)
      for (let i = 0; i < ROOM_COUNT; i++) {
        const ts = await createLoadSocket(serverUrl, rooms[i].roomCode);
        rogueTimedSockets.push(ts);
      }

      // Phase 3: Rogue sockets emit guarded events -- all should be silently dropped
      let rogueEventsDropped = 0;
      let rogueEventsLeaked = 0;
      const totalRogueEvents = ROOM_COUNT * GUARDED_EVENTS.length;

      const roguePromises = rogueTimedSockets.flatMap((ts) =>
        GUARDED_EVENTS.map(async (event) => {
          ts.socket.emit(event, {});

          // Auth middleware calls next(new Error("silent")) for non-members.
          // Socket.io v4 silently drops the event -- no response reaches the client.
          // We use a timeout-based negative assertion: if no response arrives, event was dropped.
          const result = await Promise.race([
            waitForEvent(ts.socket, SocketEvents.EXECUTION_STARTED, ROGUE_TIMEOUT_MS)
              .then(() => "leaked" as const)
              .catch(() => "dropped" as const),
            waitForEvent(ts.socket, SocketEvents.EXECUTION_RESULT, ROGUE_TIMEOUT_MS)
              .then(() => "leaked" as const)
              .catch(() => "dropped" as const),
            waitForEvent(ts.socket, SocketEvents.PROBLEM_LOADED, ROGUE_TIMEOUT_MS)
              .then(() => "leaked" as const)
              .catch(() => "dropped" as const),
            waitForEvent(ts.socket, SocketEvents.HINT_CHUNK, ROGUE_TIMEOUT_MS)
              .then(() => "leaked" as const)
              .catch(() => "dropped" as const),
            sleep(ROGUE_TIMEOUT_MS),
          ]);

          if (result === "timeout" || result === "dropped") {
            rogueEventsDropped++;
          } else {
            rogueEventsLeaked++;
          }
        }),
      );

      // Phase 4: Concurrently, legitimate users execute code
      // Listen for both EXECUTION_RESULT and EXECUTION_ERROR -- either means
      // the server processed the event (i.e. it wasn't silently dropped).
      const legitimatePromises = rooms.map(async (room) => {
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

        return Promise.race([resultPromise, errorPromise]);
      });

      const [, legitimateResults] = await Promise.all([
        Promise.allSettled(roguePromises),
        Promise.allSettled(legitimatePromises),
      ]);

      const legitimateSuccesses = legitimateResults.filter((r) => r.status === "fulfilled").length;

      // Assertions
      assertions.push(
        assertNoFailures(
          "lt10-rogue-dropped",
          "NFR-3.6",
          "All rogue events silently dropped",
          rogueEventsLeaked,
          totalRogueEvents,
        ),
      );

      assertions.push(
        assertEqual(
          "lt10-rogue-total",
          "NFR-3.6",
          "Total rogue events verified",
          rogueEventsDropped,
          totalRogueEvents,
        ),
      );

      assertions.push(
        assertEqual(
          "lt10-legitimate-success",
          "NFR-3.6",
          "Legitimate executions succeeded",
          legitimateSuccesses,
          ROOM_COUNT,
        ),
      );
    } finally {
      for (const ts of rogueTimedSockets) {
        ts.socket.disconnect();
      }
      for (const room of rooms) {
        disconnectParticipant(room.userA);
        disconnectParticipant(room.userB);
      }
      procs.kill();
    }

    return {
      id: "LT-10",
      name: "Non-Member Rejection",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
