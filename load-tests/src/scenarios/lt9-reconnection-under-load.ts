import type { RunConfig, Scenario, ScenarioResult, Assertion } from "../types.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import { assertBelow, assertNoFailures, assertEqual } from "../lib/assertions.js";
import {
  createLoadRoom,
  joinLoadRoom,
  disconnectParticipant,
  type RoomParticipant,
} from "../lib/room-lifecycle.js";
import { NFR } from "../nfr-thresholds.js";

const ROOM_COUNT = 5;
const DISCONNECT_WAIT_MS = 3_000;

interface RoomState {
  roomCode: string;
  userA: RoomParticipant;
  userB: RoomParticipant;
}

const scenario: Scenario = {
  id: "LT-9",
  name: "Reconnection Under Load",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const reconnectTracker = new PercentileTracker();
    const rooms: RoomState[] = [];
    const allParticipants: RoomParticipant[] = [];

    const reconnectThreshold = NFR["NFR-5.2"].thresholds.reconnectLatencyP95Ms;

    try {
      // Phase 1: Create rooms and join 2 users each
      const roomCodes = await Promise.allSettled(
        Array.from({ length: ROOM_COUNT }, (_, i) =>
          createLoadRoom(config.serverUrl, "collaboration", `LT9-Host-${i}`),
        ),
      );

      const validCodes = roomCodes
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);

      for (const roomCode of validCodes) {
        const [userA, userB] = await Promise.all([
          joinLoadRoom(config.serverUrl, roomCode, "LT9-A"),
          joinLoadRoom(config.serverUrl, roomCode, "LT9-B"),
        ]);
        rooms.push({ roomCode, userA, userB });
        allParticipants.push(userA, userB);
      }

      assertions.push(
        assertEqual("lt9-rooms-created", "NFR-5.2", "All rooms created and joined", rooms.length, ROOM_COUNT),
      );

      // Phase 2: Disconnect one user per room simultaneously
      const tokensToReconnect = rooms.map((r) => ({
        roomCode: r.roomCode,
        reconnectToken: r.userA.reconnectToken,
        originalUserId: r.userA.userId,
      }));

      for (const room of rooms) {
        room.userA.socket.disconnect();
      }

      await new Promise((r) => setTimeout(r, DISCONNECT_WAIT_MS));

      // Phase 3: Reconnect all 5 using stored tokens
      let reconnectFailures = 0;
      let userIdMismatches = 0;

      const reconnectResults = await Promise.allSettled(
        tokensToReconnect.map(async ({ roomCode, reconnectToken, originalUserId }) => {
          const reqStart = hrtimeMs();
          const participant = await joinLoadRoom(
            config.serverUrl,
            roomCode,
            "LT9-A-Reconnected",
            { reconnectToken },
          );
          const latency = hrtimeMs() - reqStart;
          reconnectTracker.record(latency);
          allParticipants.push(participant);

          // Verify the server recognized the reconnection by returning the same userId
          if (participant.userId !== originalUserId) {
            userIdMismatches++;
          }

          return participant;
        }),
      );

      for (const result of reconnectResults) {
        if (result.status === "rejected") reconnectFailures++;
      }

      assertions.push(
        assertNoFailures(
          "lt9-reconnect-success",
          "NFR-5.2",
          "All reconnections succeeded",
          reconnectFailures,
          tokensToReconnect.length,
        ),
      );

      assertions.push(
        assertBelow(
          "lt9-reconnect-latency",
          "NFR-5.2",
          "Reconnection latency p95 (ms)",
          reconnectTracker.p95(),
          reconnectThreshold,
        ),
      );

      assertions.push(
        assertEqual(
          "lt9-userid-preserved",
          "NFR-3.3",
          "UserId preserved across reconnections",
          userIdMismatches,
          0,
        ),
      );

      // Phase 4: Fabricated token should not hijack an existing session
      let fabricatedHandled = false;
      try {
        const fabricatedParticipant = await joinLoadRoom(
          config.serverUrl,
          validCodes[0],
          "LT9-Fabricated",
          { reconnectToken: "00".repeat(16) },
        );
        // If join succeeds, the user got a fresh slot (not a hijacked session)
        fabricatedHandled = fabricatedParticipant.userId !== tokensToReconnect[0].originalUserId;
        allParticipants.push(fabricatedParticipant);
      } catch {
        // Rejection is also acceptable behavior for a fabricated token
        fabricatedHandled = true;
      }

      assertions.push({
        id: "lt9-fabricated-token",
        nfrId: "NFR-3.3",
        description: "Fabricated token does not hijack existing session",
        target: "rejected or assigned fresh slot",
        actual: fabricatedHandled ? "handled correctly" : "session hijacked",
        passed: fabricatedHandled,
      });
    } finally {
      for (const p of allParticipants) {
        try {
          disconnectParticipant(p);
        } catch {
          // Best-effort cleanup
        }
      }
    }

    return {
      id: "LT-9",
      name: "Reconnection Under Load",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
