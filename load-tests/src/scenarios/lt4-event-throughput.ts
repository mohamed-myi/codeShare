import type { RunConfig, Scenario, ScenarioResult, Assertion } from "../types.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import { assertBelow, assertNoFailures } from "../lib/assertions.js";
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
const EMIT_INTERVAL_MS = 500; // 2 events/sec
const DURATION_MS = 30_000;
const MAX_TESTCASES = 10;

interface RoomPair {
  sender: RoomParticipant;
  receiver: RoomParticipant;
}

interface ProblemInfo {
  id: string;
  parameterNames: string[];
}

async function fetchFirstProblem(serverUrl: string): Promise<ProblemInfo> {
  const listRes = await fetch(`${serverUrl}/api/problems`);
  if (!listRes.ok) throw new Error(`Failed to fetch problems: ${listRes.status}`);
  const listBody = (await listRes.json()) as { problems: { id: string }[] };
  if (listBody.problems.length === 0) throw new Error("No problems found in database");

  const id = listBody.problems[0].id;
  const detailRes = await fetch(`${serverUrl}/api/problems/${id}`);
  if (!detailRes.ok) throw new Error(`Failed to fetch problem detail: ${detailRes.status}`);
  const detail = (await detailRes.json()) as {
    boilerplate: { parameterNames: string[] };
  };

  return { id, parameterNames: detail.boilerplate.parameterNames };
}

async function setupRoom(serverUrl: string, problemId: string): Promise<RoomPair> {
  const roomCode = await createLoadRoom(serverUrl);
  const sender = await joinLoadRoom(serverUrl, roomCode, "Sender");
  const receiver = await joinLoadRoom(serverUrl, roomCode, "Receiver");
  await selectProblem(sender.socket, problemId);
  return { sender, receiver };
}

const scenario: Scenario = {
  id: "LT-4",
  name: "Socket.io Event Throughput",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const latencyTracker = new PercentileTracker();
    let emitted = 0;
    let received = 0;

    const rooms: RoomPair[] = [];
    const p50Threshold = NFR["NFR-1.1"].thresholds.socketEventP50Ms;
    const p95Threshold = NFR["NFR-1.1"].thresholds.socketEventP95Ms;

    try {
      const problem = await fetchFirstProblem(config.serverUrl);

      const setupResults = await Promise.allSettled(
        Array.from({ length: ROOM_COUNT }, () => setupRoom(config.serverUrl, problem.id)),
      );

      for (const result of setupResults) {
        if (result.status === "fulfilled") rooms.push(result.value);
      }

      if (rooms.length === 0) throw new Error("All room setups failed");

      // Run the throughput test for DURATION_MS
      const endTime = hrtimeMs() + DURATION_MS;
      const caseCounts = new Array<number>(rooms.length).fill(0);

      while (hrtimeMs() < endTime) {
        const batchStart = hrtimeMs();

        const batchPromises = rooms.map(async (room, idx) => {
          // Skip if at case limit
          if (caseCounts[idx] >= MAX_TESTCASES) return;

          const receivePromise = waitForEvent(
            room.receiver.socket,
            SocketEvents.TESTCASE_ADDED,
            5_000,
          );

          // Build input with correct parameter names
          const input: Record<string, unknown> = {};
          for (const param of problem.parameterNames) {
            input[param] = idx + emitted;
          }

          const emitTime = hrtimeMs();
          room.sender.socket.emit(SocketEvents.TESTCASE_ADD, {
            input,
            expectedOutput: idx + emitted,
          });
          emitted++;

          try {
            await receivePromise;
            const latency = hrtimeMs() - emitTime;
            latencyTracker.record(latency);
            received++;
            caseCounts[idx]++;
          } catch {
            // Timed out waiting for event -- counted as a drop
          }
        });

        await Promise.allSettled(batchPromises);

        // Wait for the remainder of the interval
        const elapsed = hrtimeMs() - batchStart;
        const remaining = EMIT_INTERVAL_MS - elapsed;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
      }

      const durationMs = hrtimeMs() - start;
      const drops = emitted - received;

      const assertions: Assertion[] = [
        assertBelow("lt4-p50", "NFR-1.1", "p50 latency", latencyTracker.p50(), p50Threshold),
        assertBelow("lt4-p95", "NFR-1.1", "p95 latency", latencyTracker.p95(), p95Threshold),
        assertNoFailures("lt4-drops", "NFR-1.1", "Zero event drops", drops, emitted),
      ];

      return {
        id: "LT-4",
        name: "Socket.io Event Throughput",
        durationMs,
        assertions,
        passed: assertions.every((a) => a.passed),
      };
    } finally {
      for (const room of rooms) {
        disconnectParticipant(room.sender);
        disconnectParticipant(room.receiver);
      }
    }
  },
};

export default scenario;
