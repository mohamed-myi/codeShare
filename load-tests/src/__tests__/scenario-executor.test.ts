import { describe, expect, it, vi } from "vitest";
import type { LoadTestLogger } from "../lib/logger.js";
import { executeScenarioSequence } from "../lib/scenario-executor.js";
import type { Assertion, RunConfig, Scenario } from "../types.js";

const logger: LoadTestLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const baseConfig: RunConfig = {
  serverUrl: "http://127.0.0.1:3099",
  stubUrl: "http://127.0.0.1:4199",
};

function createScenario(id: string): Scenario {
  return {
    id,
    name: `Scenario ${id}`,
    run: vi.fn(async () => ({
      id,
      name: `Scenario ${id}`,
      durationMs: 10,
      assertions: [] satisfies Assertion[],
      passed: true,
    })),
  };
}

describe("executeScenarioSequence", () => {
  it("resets before the first scenario, between scenarios, and after the run", async () => {
    const resetTestStateIfAvailable = vi.fn().mockResolvedValue(true);
    const first = createScenario("LT-1");
    const second = createScenario("LT-2");

    await executeScenarioSequence([first, second], baseConfig, logger, {
      resetTestStateIfAvailable,
    });

    expect(resetTestStateIfAvailable).toHaveBeenCalledTimes(3);
    expect(resetTestStateIfAvailable).toHaveBeenNthCalledWith(1, baseConfig.serverUrl);
    expect(resetTestStateIfAvailable).toHaveBeenNthCalledWith(2, baseConfig.serverUrl);
    expect(resetTestStateIfAvailable).toHaveBeenNthCalledWith(3, baseConfig.serverUrl);
    expect(vi.mocked(first.run).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(second.run).mock.invocationCallOrder[0],
    );
  });

  it("stops retrying resets when the reset route is unavailable", async () => {
    const resetTestStateIfAvailable = vi.fn().mockResolvedValue(false);
    const first = createScenario("LT-1");
    const second = createScenario("LT-2");

    await executeScenarioSequence([first, second], baseConfig, logger, {
      resetTestStateIfAvailable,
    });

    expect(resetTestStateIfAvailable).toHaveBeenCalledTimes(1);
    expect(first.run).toHaveBeenCalledTimes(1);
    expect(second.run).toHaveBeenCalledTimes(1);
  });

  it("still attempts the final reset after a scenario throws", async () => {
    const resetTestStateIfAvailable = vi.fn().mockResolvedValue(true);
    const boom = new Error("boom");
    const failingScenario: Scenario = {
      id: "LT-1",
      name: "Scenario LT-1",
      run: vi.fn().mockRejectedValue(boom),
    };

    const results = await executeScenarioSequence([failingScenario], baseConfig, logger, {
      resetTestStateIfAvailable,
    });

    expect(resetTestStateIfAvailable).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "LT-1",
      passed: false,
    });
  });
});
