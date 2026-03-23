import type { RunConfig, Scenario, ScenarioResult, Assertion } from "../types.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import { assertBelow, assertNoFailures, assertEqual } from "../lib/assertions.js";
import { createLoadSocket, disconnectSocket } from "../lib/socket-client.js";
import { NFR } from "../nfr-thresholds.js";

const RATE_PER_SECOND = 5;
const DURATION_SECONDS = 10;
const TOTAL_REQUESTS = RATE_PER_SECOND * DURATION_SECONDS;
const INTERVAL_MS = 1_000 / RATE_PER_SECOND;

interface CreateRoomResult {
  roomCode: string;
  latencyMs: number;
  status: number;
}

async function createRoomTimed(serverUrl: string, index: number): Promise<CreateRoomResult> {
  const start = hrtimeMs();
  const res = await fetch(`${serverUrl}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "collaboration", displayName: `LT3-User-${index}` }),
  });

  const latencyMs = hrtimeMs() - start;
  const body = res.ok ? ((await res.json()) as { roomCode: string }) : null;

  return {
    roomCode: body?.roomCode ?? "",
    latencyMs,
    status: res.status,
  };
}

const scenario: Scenario = {
  id: "LT-3",
  name: "Room Creation Throughput",

  async run(config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];
    const latencyTracker = new PercentileTracker();
    const roomCodes = new Set<string>();
    let non201Count = 0;

    const roomCreateThreshold = NFR["NFR-1.3"].thresholds.roomCreateP95Ms;
    const combinedThreshold = NFR["NFR-1.3"].thresholds.combinedE2eMs;

    // Fire requests at 5/sec for 10 seconds
    const pendingRequests: Array<Promise<CreateRoomResult>> = [];

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      pendingRequests.push(createRoomTimed(config.serverUrl, i));

      // Wait between requests to maintain target rate, except after the last one
      if (i < TOTAL_REQUESTS - 1) {
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
      }
    }

    // Wait for all in-flight requests to complete
    const results = await Promise.allSettled(pendingRequests);

    let networkFailures = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { roomCode, latencyMs, status } = result.value;
        latencyTracker.record(latencyMs);

        if (status !== 201) {
          non201Count++;
        } else if (roomCode) {
          roomCodes.add(roomCode);
        }
      } else {
        networkFailures++;
      }
    }

    const totalFailures = non201Count + networkFailures;
    const duplicateCount = TOTAL_REQUESTS - totalFailures - roomCodes.size;

    assertions.push(
      assertBelow("lt3-p50", "NFR-1.3", "Response latency p50", latencyTracker.p50(), roomCreateThreshold),
    );

    assertions.push(
      assertBelow("lt3-p95", "NFR-1.3", "Response latency p95", latencyTracker.p95(), roomCreateThreshold),
    );

    assertions.push(
      assertNoFailures(
        "lt3-non-201",
        "NFR-1.3",
        "All responses returned 201",
        totalFailures,
        TOTAL_REQUESTS,
      ),
    );

    assertions.push(
      assertEqual("lt3-unique-codes", "NFR-1.3", "Zero duplicate room codes", duplicateCount, 0),
    );

    // Combined e2e assertion: create one room via HTTP then join via WebSocket
    const e2eStart = hrtimeMs();
    const e2eRes = await fetch(`${config.serverUrl}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "collaboration", displayName: "LT3-E2E" }),
    });

    if (e2eRes.ok) {
      const e2eBody = (await e2eRes.json()) as { roomCode: string };
      const timedSocket = await createLoadSocket(config.serverUrl, e2eBody.roomCode);
      const e2eLatency = hrtimeMs() - e2eStart;
      disconnectSocket(timedSocket);

      assertions.push(
        assertBelow("lt3-e2e-create-join", "NFR-1.3", "Create + join e2e latency", e2eLatency, combinedThreshold),
      );
    } else {
      assertions.push({
        id: "lt3-e2e-create-join",
        nfrId: "NFR-1.3",
        description: "Create + join e2e latency",
        target: `< ${combinedThreshold}`,
        actual: `room creation failed (${e2eRes.status})`,
        passed: false,
      });
    }

    return {
      id: "LT-3",
      name: "Room Creation Throughput",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
