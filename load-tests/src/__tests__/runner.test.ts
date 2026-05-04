import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadTestLogger } from "../lib/logger.js";
import { registerTerminationHandlers, runLoadTestCli } from "../runner.js";
import type { Assertion, Scenario, ScenarioResult } from "../types.js";

function createScenarioResult(id: string, passed = true): ScenarioResult {
  return {
    id,
    name: `Scenario ${id}`,
    durationMs: 10,
    assertions: [] satisfies Assertion[],
    passed,
  };
}

function createScenario(id: string): Scenario {
  return {
    id,
    name: `Scenario ${id}`,
    run: vi.fn(async () => createScenarioResult(id)),
  };
}

function createLogger(): LoadTestLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("runLoadTestCli", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid selections before auto-start or server validation", async () => {
    const logger = createLogger();
    const spawnServerProcesses = vi.fn();
    const validateServers = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runLoadTestCli(
      { scenarios: "LT-99" },
      {
        logger,
        availableScenarios: [createScenario("LT-2")],
        spawnServerProcesses,
        validateServers,
      },
    );

    expect(exitCode).toBe(1);
    expect(spawnServerProcesses).not.toHaveBeenCalled();
    expect(validateServers).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "load_test_selection_failed",
      expect.objectContaining({
        requested_scenarios: ["LT-99"],
        reason: "no_matching_scenarios",
      }),
    );
    expect(errorSpy).toHaveBeenCalled();
  });

  it("cleans up auto-started processes after a successful run", async () => {
    const logger = createLogger();
    const kill = vi.fn();
    const printResults = vi.fn();
    const validateServers = vi.fn().mockResolvedValue(undefined);
    const executeScenarioSequence = vi.fn().mockResolvedValue([createScenarioResult("LT-2")]);

    const exitCode = await runLoadTestCli(
      { "auto-start": true },
      {
        logger,
        availableScenarios: [createScenario("LT-2")],
        spawnServerProcesses: vi.fn().mockResolvedValue({
          serverUrl: "http://127.0.0.1:3099",
          stubUrl: "http://127.0.0.1:4199",
          kill,
        }),
        validateServers,
        executeScenarioSequence,
        printResults,
      },
    );

    expect(exitCode).toBe(0);
    expect(validateServers).toHaveBeenCalledTimes(1);
    expect(executeScenarioSequence).toHaveBeenCalledTimes(1);
    expect(printResults).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it("cleans up auto-started processes when validation fails", async () => {
    const logger = createLogger();
    const kill = vi.fn();
    const validateError = new Error("server unavailable");

    await expect(
      runLoadTestCli(
        { "auto-start": true },
        {
          logger,
          availableScenarios: [createScenario("LT-2")],
          spawnServerProcesses: vi.fn().mockResolvedValue({
            serverUrl: "http://127.0.0.1:3099",
            stubUrl: "http://127.0.0.1:4199",
            kill,
          }),
          validateServers: vi.fn().mockRejectedValue(validateError),
        },
      ),
    ).rejects.toThrow("server unavailable");

    expect(kill).toHaveBeenCalledTimes(1);
  });
});

describe("registerTerminationHandlers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs cleanup before exiting on SIGINT and removes listeners on unregister", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const listeners = new Map<string, () => Promise<void> | void>();
    const on = vi.fn((signal: string, handler: () => Promise<void> | void) => {
      listeners.set(signal, handler);
    });
    const off = vi.fn((signal: string, handler: () => Promise<void> | void) => {
      if (listeners.get(signal) === handler) {
        listeners.delete(signal);
      }
    });

    const unregister = registerTerminationHandlers({
      cleanup,
      exit,
      on,
      off,
    });

    await listeners.get("SIGINT")?.();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(130);
    expect(cleanup.mock.invocationCallOrder[0]).toBeLessThan(exit.mock.invocationCallOrder[0]);

    unregister();

    expect(off).toHaveBeenCalledTimes(2);
    expect(listeners.size).toBe(0);
  });
});
