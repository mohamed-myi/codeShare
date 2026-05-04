import { assertBelow, assertEqual } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import {
  createLoadRoom,
  disconnectParticipant,
  joinLoadRoom,
  type RoomParticipant,
} from "../lib/room-lifecycle.js";
import type { LoadYjsClient } from "../lib/yjs-client.js";
import { NFR } from "../nfr-thresholds.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const ROOM_COUNT = 5;
const TYPING_DURATION_MS = 20_000;
const CHAR_INTERVAL_MS = 200; // 5 chars/sec
const BULK_TEXT_SIZE = 2048;
const BULK_SYNC_TIMEOUT_MS = 5_000;
const BULK_POLL_INTERVAL_MS = 50;

interface RoomPair {
  userA: RoomParticipant & { yjsClient: LoadYjsClient };
  userB: RoomParticipant & { yjsClient: LoadYjsClient };
}

function generateBulkText(size: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += chars[i % chars.length];
  }
  return result;
}

async function setupRoom(serverUrl: string): Promise<RoomPair> {
  const roomCode = await createLoadRoom(serverUrl);
  const userA = await joinLoadRoom(serverUrl, roomCode, "UserA", { withYjs: true });
  const userB = await joinLoadRoom(serverUrl, roomCode, "UserB", { withYjs: true });
  return { userA, userB };
}

const scenario: Scenario = {
  id: "LT-6",
  name: "Yjs Document Sync",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const charSyncTracker = new PercentileTracker();
    const rooms: RoomPair[] = [];
    let divergenceCount = 0;

    const charP50Threshold = NFR["NFR-1.1"].thresholds.charSyncP50Ms;
    const charP95Threshold = NFR["NFR-1.1"].thresholds.charSyncP95Ms;
    const bulkThreshold = NFR["NFR-1.1"].thresholds.bulkSyncMs;

    try {
      const setupResults = await Promise.allSettled(
        Array.from({ length: ROOM_COUNT }, () => setupRoom(config.serverUrl)),
      );

      for (const result of setupResults) {
        if (result.status === "fulfilled") rooms.push(result.value);
      }

      if (rooms.length === 0) throw new Error("All room setups failed");

      // Register remote update callbacks on both sides for latency tracking
      for (const room of rooms) {
        room.userB.yjsClient.onRemoteUpdate((latencyMs) => {
          charSyncTracker.record(latencyMs);
        });
        room.userA.yjsClient.onRemoteUpdate((latencyMs) => {
          charSyncTracker.record(latencyMs);
        });
      }

      // Simultaneous typing phase: A types 'a', B types 'b' at 5 chars/sec
      const typingEndTime = hrtimeMs() + TYPING_DURATION_MS;
      const charCounters = rooms.map(() => ({ a: 0, b: 0 }));

      while (hrtimeMs() < typingEndTime) {
        for (let i = 0; i < rooms.length; i++) {
          const room = rooms[i];
          const counters = charCounters[i];
          const docLen = room.userA.yjsClient.getText().length;

          room.userA.yjsClient.insertChar(docLen, "a");
          counters.a++;

          const docLenB = room.userB.yjsClient.getText().length;
          room.userB.yjsClient.insertChar(docLenB, "b");
          counters.b++;
        }

        await new Promise((r) => setTimeout(r, CHAR_INTERVAL_MS));
      }

      // Brief settle period for outstanding syncs
      await new Promise((r) => setTimeout(r, 1_000));

      // Verify documents converged after typing phase
      for (const room of rooms) {
        const textA = room.userA.yjsClient.getText();
        const textB = room.userB.yjsClient.getText();
        if (textA !== textB) divergenceCount++;
      }

      // Bulk paste test: user A pastes 2KB, measure until user B matches
      const bulkText = generateBulkText(BULK_TEXT_SIZE);
      const bulkSyncTimes: number[] = [];

      await Promise.allSettled(
        rooms.map(async (room) => {
          const bulkStart = hrtimeMs();
          const existingLen = room.userA.yjsClient.getText().length;
          room.userA.yjsClient.insertText(existingLen, bulkText);

          const expectedText = room.userA.yjsClient.getText();

          // Poll user B until doc matches
          const deadline = hrtimeMs() + BULK_SYNC_TIMEOUT_MS;
          while (hrtimeMs() < deadline) {
            const bText = room.userB.yjsClient.getText();
            if (bText === expectedText) {
              bulkSyncTimes.push(hrtimeMs() - bulkStart);
              return;
            }
            await new Promise((r) => setTimeout(r, BULK_POLL_INTERVAL_MS));
          }

          // Check one final time
          const finalText = room.userB.yjsClient.getText();
          if (finalText === expectedText) {
            bulkSyncTimes.push(hrtimeMs() - bulkStart);
          } else {
            divergenceCount++;
            bulkSyncTimes.push(BULK_SYNC_TIMEOUT_MS);
          }
        }),
      );

      const maxBulkSync = bulkSyncTimes.length > 0 ? Math.max(...bulkSyncTimes) : Infinity;

      const durationMs = hrtimeMs() - start;

      const assertions: Assertion[] = [
        assertBelow(
          "lt6-char-p50",
          "NFR-1.1",
          "Char sync p50",
          charSyncTracker.p50(),
          charP50Threshold,
        ),
        assertBelow(
          "lt6-char-p95",
          "NFR-1.1",
          "Char sync p95",
          charSyncTracker.p95(),
          charP95Threshold,
        ),
        assertBelow("lt6-bulk-sync", "NFR-1.1", "Bulk paste sync", maxBulkSync, bulkThreshold),
        assertEqual("lt6-no-divergence", "NFR-1.1", "Zero document divergence", divergenceCount, 0),
      ];

      return {
        id: "LT-6",
        name: "Yjs Document Sync",
        durationMs,
        assertions,
        passed: assertions.every((a) => a.passed),
      };
    } finally {
      for (const room of rooms) {
        disconnectParticipant(room.userA);
        disconnectParticipant(room.userB);
      }
    }
  },
};

export default scenario;
