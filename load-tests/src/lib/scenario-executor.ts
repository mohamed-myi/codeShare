import type { RunConfig, Scenario, ScenarioResult } from "../types.js";
import { resetTestStateIfAvailable } from "./health-client.js";
import type { LoadTestLogger } from "./logger.js";

interface ScenarioExecutorDeps {
  resetTestStateIfAvailable?: (serverUrl: string) => Promise<boolean>;
}

interface ScenarioExecutorHooks {
  onScenarioStarted?: (scenario: Scenario) => void;
  onScenarioCompleted?: (result: ScenarioResult) => void;
  onScenarioErrored?: (scenario: Scenario, error: unknown) => void;
}

export async function executeScenarioSequence(
  selected: Scenario[],
  config: RunConfig,
  logger: LoadTestLogger,
  deps: ScenarioExecutorDeps = {},
  hooks: ScenarioExecutorHooks = {},
): Promise<ScenarioResult[]> {
  const resetServerState = deps.resetTestStateIfAvailable ?? resetTestStateIfAvailable;
  const results: ScenarioResult[] = [];
  let shouldAttemptReset = true;

  const maybeReset = async () => {
    if (!shouldAttemptReset) {
      return;
    }

    shouldAttemptReset = await resetServerState(config.serverUrl);
  };

  await maybeReset();

  try {
    for (const [index, scenario] of selected.entries()) {
      if (index > 0) {
        await maybeReset();
      }

      hooks.onScenarioStarted?.(scenario);
      logger.info("load_test_scenario_started", {
        scenario_id: scenario.id,
        scenario_name: scenario.name,
      });

      try {
        const result = await scenario.run(config);
        results.push(result);
        logger.info("load_test_scenario_completed", {
          scenario_id: result.id,
          scenario_name: result.name,
          duration_ms: Math.round(result.durationMs),
          passed: result.passed,
          failed_assertion_count: result.assertions.filter((assertion) => !assertion.passed).length,
        });
        hooks.onScenarioCompleted?.(result);
      } catch (error) {
        logger.error("load_test_scenario_failed", {
          error,
          scenario_id: scenario.id,
          scenario_name: scenario.name,
        });
        hooks.onScenarioErrored?.(scenario, error);
        results.push({
          id: scenario.id,
          name: scenario.name,
          durationMs: 0,
          assertions: [
            {
              id: `${scenario.id}-error`,
              nfrId: "",
              description: "Scenario completed without throwing",
              target: "no error",
              actual: String(error),
              passed: false,
            },
          ],
          passed: false,
        });
      }
    }
  } finally {
    await maybeReset();
  }

  return results;
}
