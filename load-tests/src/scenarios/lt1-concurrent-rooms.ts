import { assertBelow, assertEqual, assertNoFailures } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { MemoryRecorder, PercentileTracker } from "../lib/metrics.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
} from "../lib/room-lifecycle.js";
import { NFR } from "../nfr-thresholds.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const ROOM_COUNT = 20;
const USERS_PER_ROOM = 2;
const TYPING_DURATION_S = 30;
const TYPING_INTERVAL_MS = 1_000;
const HEAP_SAMPLE_INTERVAL_MS = 10_000;

const scenario: Scenario = {
  id: "LT-1",
  name: "Concurrent Room Capacity",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const participants: RoomParticipant[] = [];
    const syncTracker = new PercentileTracker();
    const memory = new MemoryRecorder(config.serverUrl);

    try {
      // Create all rooms in parallel
      const roomCodes = await Promise.allSettled(
        Array.from({ length: ROOM_COUNT }, () =>
          createLoadRoom(config.serverUrl, "collaboration", "LT1-Host"),
        ),
      );

      const validRoomCodes: string[] = [];
      for (const result of roomCodes) {
        if (result.status === "fulfilled") {
          validRoomCodes.push(result.value);
        }
      }

      const roomCreationFailures = ROOM_COUNT - validRoomCodes.length;
      assertions.push(
        assertNoFailures(
          "lt1-room-creation",
          "NFR-2.1",
          "All rooms created",
          roomCreationFailures,
          ROOM_COUNT,
        ),
      );

      // Join 2 users per room with Yjs clients
      const joinResults = await Promise.allSettled(
        validRoomCodes.flatMap((roomCode, roomIdx) =>
          Array.from({ length: USERS_PER_ROOM }, (_, userIdx) =>
            joinLoadRoom(config.serverUrl, roomCode, `LT1-User-${roomIdx}-${userIdx}`, {
              withYjs: true,
            }),
          ),
        ),
      );

      for (const result of joinResults) {
        if (result.status === "fulfilled") {
          participants.push(result.value);
        }
      }

      const expectedClients = validRoomCodes.length * USERS_PER_ROOM;
      const joinFailures = expectedClients - participants.length;
      assertions.push(
        assertEqual(
          "lt1-clients-connected",
          "NFR-2.1",
          "All clients connected",
          participants.length,
          expectedClients,
        ),
      );
      assertions.push(
        assertNoFailures(
          "lt1-join-failures",
          "NFR-2.1",
          "All joins succeeded",
          joinFailures,
          expectedClients,
        ),
      );

      // Register remote update observers on every Yjs client
      for (const p of participants) {
        p.yjsClient?.onRemoteUpdate((latencyMs) => {
          syncTracker.record(latencyMs);
        });
      }

      // Take baseline memory sample
      await memory.sample();

      // Type 1 char/sec for TYPING_DURATION_S seconds, sampling heap every 10s
      const typingTicks = TYPING_DURATION_S;
      let heapSampleCountdown = HEAP_SAMPLE_INTERVAL_MS;

      for (let tick = 0; tick < typingTicks; tick++) {
        // Each participant inserts one character at the end of the doc
        for (const p of participants) {
          if (p.yjsClient) {
            const currentLen = p.yjsClient.getText().length;
            p.yjsClient.insertChar(currentLen, "x");
          }
        }

        await new Promise((r) => setTimeout(r, TYPING_INTERVAL_MS));

        heapSampleCountdown -= TYPING_INTERVAL_MS;
        if (heapSampleCountdown <= 0) {
          await memory.sample().catch(() => {
            // Non-fatal: health endpoint may be slow under load
          });
          heapSampleCountdown = HEAP_SAMPLE_INTERVAL_MS;
        }
      }

      // Final memory sample
      await memory.sample().catch(() => {});

      // Assertions
      assertions.push(
        assertBelow(
          "lt1-sync-p95",
          "NFR-1.1",
          "Yjs sync p95 latency",
          syncTracker.p95(),
          NFR["NFR-1.1"].thresholds.yjsSyncP95Ms,
        ),
      );
      assertions.push(
        assertBelow(
          "lt1-heap-peak",
          "NFR-2.1",
          "Peak heap usage (MB)",
          memory.peak(),
          NFR["NFR-2.1"].thresholds.maxHeapMb,
        ),
      );
    } finally {
      // Clean up all connections
      for (const p of participants) {
        disconnectParticipant(p);
      }
    }

    return {
      id: "LT-1",
      name: "Concurrent Room Capacity",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
