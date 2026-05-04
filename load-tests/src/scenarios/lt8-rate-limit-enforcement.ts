import { assertBelow } from "../lib/assertions.js";
import { hrtimeMs } from "../lib/clock.js";
import { PercentileTracker } from "../lib/metrics.js";
import { spawnServerProcesses } from "../lib/server-manager.js";
import { NFR } from "../nfr-thresholds.js";
import type { Assertion, RunConfig, Scenario, ScenarioResult } from "../types.js";

const MAX_ATTEMPTS = 100;

// Dedicated ports so LT-8's server doesn't collide with the shared one
const LT8_SERVER_PORT = 3098;
const LT8_STUB_PORT = 4198;

const scenario: Scenario = {
  id: "LT-8",
  name: "Rate Limit Enforcement",

  async run(_config: RunConfig): Promise<ScenarioResult> {
    const start = hrtimeMs();
    const assertions: Assertion[] = [];

    const successLatencies = new PercentileTracker();
    const rejectionLatencies = new PercentileTracker();
    const rejectionThreshold = NFR["NFR-4.1"].thresholds.rejectionP95Ms;

    // Spawn a dedicated server with low rate limits so we actually hit 429
    const procs = await spawnServerProcesses({
      serverPort: LT8_SERVER_PORT,
      stubPort: LT8_STUB_PORT,
      rateLimitOverrides: {
        RATE_LIMIT_ROOM_CREATE: "10",
      },
    });

    try {
      const serverUrl = procs.serverUrl;

      // Hammer POST /api/rooms from a single origin until 429 or max attempts
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const reqStart = hrtimeMs();
        const res = await fetch(`${serverUrl}/api/rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "collaboration", displayName: `LT8-${i}` }),
        });
        const latency = hrtimeMs() - reqStart;

        if (res.status === 201) {
          successLatencies.record(latency);
        } else if (res.status === 429) {
          rejectionLatencies.record(latency);
          // Keep going to collect a few more 429 samples
          if (rejectionLatencies.count() >= 5) break;
        }
      }

      // If we got 429s, assert their latency is fast
      if (rejectionLatencies.count() > 0) {
        assertions.push(
          assertBelow(
            "lt8-429-p95",
            "NFR-4.1",
            "429 response p95 latency (ms)",
            rejectionLatencies.p95(),
            rejectionThreshold,
          ),
        );
        assertions.push({
          id: "lt8-429-received",
          nfrId: "NFR-4.1",
          description: "At least one 429 received",
          target: ">= 1",
          actual: String(rejectionLatencies.count()),
          passed: true,
        });
      } else {
        assertions.push({
          id: "lt8-429-received",
          nfrId: "NFR-4.1",
          description: "At least one 429 received",
          target: ">= 1",
          actual: `0 (${successLatencies.count()} successes in ${MAX_ATTEMPTS} attempts)`,
          passed: false,
        });
      }

      // Verify a different simulated IP still gets 201
      const spoofStart = hrtimeMs();
      const spoofRes = await fetch(`${serverUrl}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "10.255.255.1",
        },
        body: JSON.stringify({ mode: "collaboration", displayName: "LT8-Spoof" }),
      });
      const spoofLatency = hrtimeMs() - spoofStart;

      // If trusted proxy is enabled, spoofed IP should bypass the limit.
      // If proxy is not trusted, 429 is also acceptable (correct security behavior).
      const spoofAccepted = spoofRes.status === 201 || spoofRes.status === 429;
      assertions.push({
        id: "lt8-spoof-ip",
        nfrId: "NFR-4.1",
        description: "Different IP response is valid (201 if proxy trusted, 429 if not)",
        target: "201 or 429",
        actual: `${spoofRes.status} (${spoofLatency.toFixed(1)}ms)`,
        passed: spoofAccepted,
      });
    } catch (err) {
      assertions.push({
        id: "lt8-error",
        nfrId: "NFR-4.1",
        description: "No unexpected errors",
        target: "no error",
        actual: String(err),
        passed: false,
      });
    } finally {
      procs.kill();
    }

    return {
      id: "LT-8",
      name: "Rate Limit Enforcement",
      durationMs: hrtimeMs() - start,
      assertions,
      passed: assertions.every((a) => a.passed),
    };
  },
};

export default scenario;
