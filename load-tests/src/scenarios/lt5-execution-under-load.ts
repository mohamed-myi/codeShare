import type { RunConfig, Scenario, ScenarioResult, Assertion } from "../types.js";
import { hrtimeMs } from "../lib/clock.js";
import { assertBelow, assertNoFailures, assertEqual } from "../lib/assertions.js";
import { waitForEvent } from "../lib/socket-client.js";
import {
  createLoadRoom,
  joinLoadRoom,
  disconnectParticipant,
  selectProblem,
  type RoomParticipant,
} from "../lib/room-lifecycle.js";
import { SocketEvents } from "@codeshare/shared";
import { NFR } from "../nfr-thresholds.js";

const ROOM_COUNT = 5;

interface RoomPair {
  userA: RoomParticipant;
  userB: RoomParticipant;
}

async function fetchFirstProblemId(serverUrl: string): Promise<string> {
  const res = await fetch(`${serverUrl}/api/problems`);
  if (!res.ok) throw new Error(`Failed to fetch problems: ${res.status}`);
  const body = (await res.json()) as { problems: { id: string }[] };
  if (body.problems.length === 0) throw new Error("No problems found in database");
  return body.problems[0].id;
}

async function setupRoom(serverUrl: string, problemId: string): Promise<RoomPair> {
  const roomCode = await createLoadRoom(serverUrl);
  const userA = await joinLoadRoom(serverUrl, roomCode, "UserA");
  const userB = await joinLoadRoom(serverUrl, roomCode, "UserB");
  await selectProblem(userA.socket, problemId);
  return { userA, userB };
}

async function configureStub(stubUrl: string, delayMs: number): Promise<void> {
  const res = await fetch(`${stubUrl}/__scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ judge0: { delayMs } }),
  });
  if (!res.ok) throw new Error(`Stub config failed: ${res.status}`);
}

async function resetStub(stubUrl: string): Promise<void> {
  try {
    await fetch(`${stubUrl}/__scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judge0: { delayMs: 0 } }),
    });
  } catch {
    // Best-effort cleanup
  }
}

const scenario: Scenario = {
  id: "LT-5",
  name: "Execution Under Load",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const rooms: RoomPair[] = [];
    const useRealJudge0 = config.realJudge0 === true;
    const resultTimeoutMs = useRealJudge0 ? 35_000 : 30_000;

    try {
      const problemId = await fetchFirstProblemId(config.serverUrl);

      if (!useRealJudge0) {
        await configureStub(config.stubUrl, 1000);
      }

      const setupResults = await Promise.allSettled(
        Array.from({ length: ROOM_COUNT }, () => setupRoom(config.serverUrl, problemId)),
      );

      for (const result of setupResults) {
        if (result.status === "fulfilled") rooms.push(result.value);
      }

      if (rooms.length === 0) throw new Error("All room setups failed");

      // Track emit timestamps for e2e measurement
      const emitTimestamps: number[] = [];

      // Register listeners BEFORE emitting to avoid race conditions
      const executionPromises = rooms.map((room) => {
        const aStarted = waitForEvent(room.userA.socket, SocketEvents.EXECUTION_STARTED, 15_000);
        const bStarted = waitForEvent(room.userB.socket, SocketEvents.EXECUTION_STARTED, 15_000);
        const aResult = waitForEvent(room.userA.socket, SocketEvents.EXECUTION_RESULT, resultTimeoutMs);
        const bResult = waitForEvent(room.userB.socket, SocketEvents.EXECUTION_RESULT, resultTimeoutMs);
        return { aStarted, bStarted, aResult, bResult };
      });

      // Fire CODE_RUN from all rooms within 500ms
      for (const room of rooms) {
        emitTimestamps.push(hrtimeMs());
        room.userA.socket.emit(SocketEvents.CODE_RUN, {});
      }

      // Collect results
      let roomsCompleted = 0;
      const broadcastDeltas: number[] = [];
      const e2eLatencies: number[] = [];

      const outcomeResults = await Promise.allSettled(
        executionPromises.map(async (promises, idx) => {
          await Promise.all([
            promises.aStarted,
            promises.bStarted,
          ]);

          const [aResult, bResult] = await Promise.all([
            promises.aResult,
            promises.bResult,
          ]);

          roomsCompleted++;

          // Track broadcast delta between users
          const delta = Math.abs(aResult.latencyMs - bResult.latencyMs);
          broadcastDeltas.push(delta);

          // Track e2e latency from emit to result receipt
          const maxResultLatency = Math.max(aResult.latencyMs, bResult.latencyMs);
          const e2e = hrtimeMs() - emitTimestamps[idx] - maxResultLatency + maxResultLatency;
          // Simpler: time from emit to when the later result arrived
          e2eLatencies.push(hrtimeMs() - emitTimestamps[idx]);
        }),
      );

      const failures = outcomeResults.filter((r) => r.status === "rejected").length;
      const maxBroadcastDelta = broadcastDeltas.length > 0
        ? Math.max(...broadcastDeltas)
        : Infinity;
      const maxE2eLatency = e2eLatencies.length > 0
        ? Math.max(...e2eLatencies)
        : Infinity;

      const durationMs = hrtimeMs() - start;

      const assertions: Assertion[] = [
        assertEqual(
          "lt5-all-rooms",
          "NFR-5.1",
          "All rooms received execution results",
          roomsCompleted,
          rooms.length,
        ),
        assertNoFailures(
          "lt5-no-failures",
          "NFR-5.1",
          "No execution failures",
          failures,
          rooms.length,
        ),
        assertBelow(
          "lt5-broadcast-delta",
          "NFR-1.2",
          "Broadcast delta between users",
          maxBroadcastDelta,
          NFR["NFR-1.2"].thresholds.broadcastDeltaMs,
        ),
        assertBelow(
          "lt5-e2e-time",
          "NFR-1.2",
          "Execution e2e latency",
          maxE2eLatency,
          NFR["NFR-1.2"].thresholds.executionE2eMs,
        ),
      ];

      return {
        id: "LT-5",
        name: "Execution Under Load",
        durationMs,
        assertions,
        passed: assertions.every((a) => a.passed),
      };
    } finally {
      if (!useRealJudge0) {
        await resetStub(config.stubUrl);
      }
      for (const room of rooms) {
        disconnectParticipant(room.userA);
        disconnectParticipant(room.userB);
      }
    }
  },
};

export default scenario;
