import type { RunConfig, Scenario, ScenarioResult, Assertion } from "../types.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import { assertBelow, assertNoFailures } from "../lib/assertions.js";
import { createLoadRoom } from "../lib/room-lifecycle.js";
import { createLoadSocket, disconnectSocket, type TimedSocket } from "../lib/socket-client.js";
import { NFR } from "../nfr-thresholds.js";

const ROOM_COUNT = 10;
const CONNECTIONS_PER_ROOM = 2;
const TOTAL_CONNECTIONS = ROOM_COUNT * CONNECTIONS_PER_ROOM;
const BURST_DURATION_MS = 2_000;

const scenario: Scenario = {
  id: "LT-2",
  name: "Connection Establishment",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const sockets: TimedSocket[] = [];
    const latencyTracker = new PercentileTracker();

    try {
      // Pre-create rooms sequentially to avoid overwhelming the server
      const roomCodes: string[] = [];
      for (let i = 0; i < ROOM_COUNT; i++) {
        const code = await createLoadRoom(config.serverUrl, "collaboration", `LT2-Host-${i}`);
        roomCodes.push(code);
      }

      // Build connection tasks: 2 per room, 20 total
      const connectionTasks: Array<{ roomCode: string; delay: number }> = [];
      const delayStep = BURST_DURATION_MS / TOTAL_CONNECTIONS;

      for (let i = 0; i < roomCodes.length; i++) {
        for (let j = 0; j < CONNECTIONS_PER_ROOM; j++) {
          const taskIndex = i * CONNECTIONS_PER_ROOM + j;
          connectionTasks.push({
            roomCode: roomCodes[i],
            delay: taskIndex * delayStep,
          });
        }
      }

      // Launch all connections with staggered delays across the 2-second burst window
      const results = await Promise.allSettled(
        connectionTasks.map(async (task) => {
          await new Promise((r) => setTimeout(r, task.delay));
          return createLoadSocket(config.serverUrl, task.roomCode);
        }),
      );

      let failures = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          sockets.push(result.value);
          latencyTracker.record(result.value.connectLatencyMs);
        } else {
          failures++;
        }
      }

      const connectThreshold = NFR["NFR-1.3"].thresholds.connectP95Ms;

      assertions.push(
        assertNoFailures(
          "lt2-zero-failures",
          "NFR-1.3",
          "All connections succeeded",
          failures,
          TOTAL_CONNECTIONS,
        ),
      );

      assertions.push(
        assertBelow("lt2-p50", "NFR-1.3", "Connect latency p50", latencyTracker.p50(), connectThreshold),
      );

      assertions.push(
        assertBelow("lt2-p95", "NFR-1.3", "Connect latency p95", latencyTracker.p95(), connectThreshold),
      );
    } finally {
      for (const ts of sockets) {
        disconnectSocket(ts);
      }
    }

    return {
      id: "LT-2",
      name: "Connection Establishment",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
