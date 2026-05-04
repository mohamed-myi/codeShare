import { assertBelow, assertWithin } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { fetchHealth, triggerGC } from "../lib/health-client.js";
import { MemoryRecorder } from "../lib/metrics.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
} from "../lib/room-lifecycle.js";
import { NFR } from "../nfr-thresholds.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const SOAK_DURATION_S = 300;
const ROOM_INTERVAL_MS = 1_000;
const HEAP_SAMPLE_INTERVAL_S = 30;
const CLEANUP_POLL_INTERVAL_MS = 1_000;
const CLEANUP_TIMEOUT_MS = 30_000;

const scenario: Scenario = {
  id: "LT-7",
  name: "Memory Soak",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const memory = new MemoryRecorder(config.serverUrl);
    const activeParticipants: RoomParticipant[] = [];
    let iterations = 0;

    const heapGrowthThreshold = NFR["NFR-2.1"].thresholds.soakHeapGrowthMb;
    const heapDriftThreshold = NFR["NFR-2.1"].thresholds.soakHeapDriftMb;

    try {
      // Record baseline heap
      await memory.sample();
      const baselineHealth = await fetchHealth(config.serverUrl);
      const baselineHeap = baselineHealth.heapUsedMB ?? memory.baseline();

      const soakStart = Date.now();
      let lastSampleTime = Date.now();

      while (Date.now() - soakStart < SOAK_DURATION_S * 1_000) {
        // Create a room, join 2 users, then disconnect both
        try {
          const roomCode = await createLoadRoom(
            config.serverUrl,
            "collaboration",
            `LT7-Host-${iterations}`,
          );

          const [p1, p2] = await Promise.all([
            joinLoadRoom(config.serverUrl, roomCode, `LT7-A-${iterations}`),
            joinLoadRoom(config.serverUrl, roomCode, `LT7-B-${iterations}`),
          ]);

          // Disconnect both immediately -- room will queue for destruction
          disconnectParticipant(p1);
          disconnectParticipant(p2);
          iterations++;
        } catch {
          // Non-fatal: individual room cycle failure does not abort soak
        }

        // Sample heap every HEAP_SAMPLE_INTERVAL_S
        if (Date.now() - lastSampleTime >= HEAP_SAMPLE_INTERVAL_S * 1_000) {
          await memory.sample().catch(() => {});
          lastSampleTime = Date.now();
        }

        await new Promise((r) => setTimeout(r, ROOM_INTERVAL_MS));
      }

      const cleanupDeadline = Date.now() + CLEANUP_TIMEOUT_MS;
      let finalHealth = await fetchHealth(config.serverUrl);

      while (Date.now() < cleanupDeadline) {
        await triggerGC(config.serverUrl).catch(() => false);
        await memory.sample().catch(() => {});

        finalHealth = await fetchHealth(config.serverUrl);
        if (finalHealth.roomCount < 5) {
          break;
        }

        await new Promise((r) => setTimeout(r, CLEANUP_POLL_INTERVAL_MS));
      }

      const finalHeap = finalHealth.heapUsedMB ?? memory.latest();
      const finalRoomCount = finalHealth.roomCount;

      // Heap growth should stay under threshold
      const peakGrowth = memory.peak() - baselineHeap;
      assertions.push(
        assertBelow(
          "lt7-heap-growth",
          "NFR-2.1",
          `Heap growth stays under ${heapGrowthThreshold}MB during soak`,
          peakGrowth,
          heapGrowthThreshold,
        ),
      );

      // Final heap should return near baseline
      assertions.push(
        assertWithin(
          "lt7-final-heap",
          "NFR-2.1",
          `Final heap within ${heapDriftThreshold}MB of baseline`,
          finalHeap,
          baselineHeap,
          heapDriftThreshold,
        ),
      );

      // Room count should return to near 0
      assertions.push(
        assertBelow(
          "lt7-room-cleanup",
          "NFR-2.1",
          "Room count returns to near zero after soak",
          finalRoomCount,
          5,
        ),
      );
    } finally {
      for (const p of activeParticipants) {
        disconnectParticipant(p);
      }
    }

    return {
      id: "LT-7",
      name: "Memory Soak",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
