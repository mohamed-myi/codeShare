import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { validateProblemData, waitForHealthy } from "./lib/health-client.js";
import { createLoadTestLogger, type LoadTestLogger } from "./lib/logger.js";
import { selectedScenariosRequireProblemData } from "./lib/preflight.js";
import { printResults, writeJsonReport } from "./lib/reporter.js";
import { executeScenarioSequence } from "./lib/scenario-executor.js";
import { spawnServerProcesses } from "./lib/server-manager.js";
import { scenarios, selectScenarios } from "./scenarios/index.js";
import type { RunConfig, Scenario, ScenarioResult } from "./types.js";

type CleanupFn = () => void | Promise<void>;

export interface RunnerOptionValues {
  "server-url"?: string;
  "stub-url"?: string;
  scenarios?: string;
  json?: string;
  "real-judge0"?: boolean;
  "auto-start"?: boolean;
  "skip-db-setup"?: boolean;
  help?: boolean;
}

export interface RunnerCleanupManager {
  register(cleanup: CleanupFn): void;
  run(): Promise<void>;
}

interface SpawnedProcesses {
  serverUrl: string;
  stubUrl: string;
  kill: () => void;
}

interface TerminationHandlerOptions {
  cleanup: CleanupFn;
  exit?: (code: number) => void;
  on?: (signal: NodeJS.Signals, handler: () => void | Promise<void>) => void;
  off?: (signal: NodeJS.Signals, handler: () => void | Promise<void>) => void;
}

interface RunnerDeps {
  availableScenarios?: Scenario[];
  cleanupManager?: RunnerCleanupManager;
  logger?: LoadTestLogger;
  spawnServerProcesses?: (opts?: { skipDbSetup?: boolean }) => Promise<SpawnedProcesses>;
  validateServers?: (config: RunConfig, selected: Scenario[]) => Promise<void>;
  executeScenarioSequence?: (
    selected: Scenario[],
    config: RunConfig,
    logger: LoadTestLogger,
    deps?: Parameters<typeof executeScenarioSequence>[3],
    hooks?: Parameters<typeof executeScenarioSequence>[4],
  ) => Promise<ScenarioResult[]>;
  printResults?: typeof printResults;
  writeJsonReport?: typeof writeJsonReport;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

const DEFAULT_SERVER_URL = "http://127.0.0.1:3099";
const DEFAULT_STUB_URL = "http://127.0.0.1:4199";

export async function validateServers(config: RunConfig, selected: Scenario[]): Promise<void> {
  await Promise.all([
    waitForHealthy(config.serverUrl, 5_000, 500).catch(() => {
      throw new Error(
        `Server not reachable at ${config.serverUrl}.\n` +
          "Start it manually or use --auto-start to launch automatically.",
      );
    }),
    fetch(`${config.stubUrl}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Stub returned ${response.status}`);
        }
      })
      .catch(() => {
        throw new Error(
          `Stub not reachable at ${config.stubUrl}.\n` +
            "Start it manually or use --auto-start to launch automatically.",
        );
      }),
  ]);

  if (selectedScenariosRequireProblemData(selected)) {
    await validateProblemData(config.serverUrl);
  }
}

export function createRunnerCleanupManager(): RunnerCleanupManager {
  let cleanup: CleanupFn = () => undefined;
  let cleanupPromise: Promise<void> | null = null;

  return {
    register(nextCleanup) {
      const previousCleanup = cleanup;
      cleanup = async () => {
        await previousCleanup();
        await nextCleanup();
      };
    },
    async run() {
      if (!cleanupPromise) {
        cleanupPromise = Promise.resolve().then(async () => {
          await cleanup();
        });
      }

      await cleanupPromise;
    },
  };
}

export function registerTerminationHandlers({
  cleanup,
  exit = (code) => {
    process.exit(code);
  },
  on = (signal, handler) => {
    process.on(signal, handler);
  },
  off = (signal, handler) => {
    process.off(signal, handler);
  },
}: TerminationHandlerOptions): () => void {
  let terminated = false;

  const createHandler = (code: number) => async () => {
    if (terminated) {
      return;
    }

    terminated = true;
    try {
      await cleanup();
    } finally {
      exit(code);
    }
  };

  const sigintHandler = createHandler(130);
  const sigtermHandler = createHandler(143);
  on("SIGINT", sigintHandler);
  on("SIGTERM", sigtermHandler);

  return () => {
    off("SIGINT", sigintHandler);
    off("SIGTERM", sigtermHandler);
  };
}

function printUsage(): void {
  console.log(`
CodeShare Load Test Runner

Usage: pnpm load-test [options]

Options:
  --server-url <url>    Server base URL (default: ${DEFAULT_SERVER_URL})
  --stub-url <url>      Stub server URL (default: ${DEFAULT_STUB_URL})
  --scenarios <ids>     Comma-separated scenario IDs (e.g., LT-2,LT-3)
  --json <path>         Write JSON report to file
  --real-judge0         Use real Judge0 API instead of stub (LT-5 only)
  --auto-start          Auto-start server and stub processes
  --skip-db-setup       Skip migrate/seed during auto-start (only safe for scenarios without problem data)
  --help                Show this help message

Examples:
  pnpm load-test                                  # Run all scenarios
  pnpm load-test --scenarios LT-2,LT-3           # Run specific scenarios
  pnpm load-test --json results.json              # Save JSON report
  pnpm load-test --scenarios LT-5 --real-judge0   # LT-5 with real Judge0
  pnpm load-test --auto-start                     # Auto-start servers
  pnpm load-test --auto-start --skip-db-setup --scenarios LT-2,LT-3
`);
}

function parseScenarioIds(value?: string): string[] | undefined {
  return value?.split(",").map((scenarioId) => scenarioId.trim().toUpperCase());
}

export async function runLoadTestCli(
  values: RunnerOptionValues,
  deps: RunnerDeps = {},
): Promise<number> {
  const logger = deps.logger ?? createLoadTestLogger();
  const cleanupManager = deps.cleanupManager ?? createRunnerCleanupManager();
  const log = deps.log ?? console.log;
  const error = deps.error ?? console.error;
  const availableScenarios = deps.availableScenarios ?? scenarios;
  const runScenarioSequence = deps.executeScenarioSequence ?? executeScenarioSequence;
  const runValidateServers = deps.validateServers ?? validateServers;
  const reportResults = deps.printResults ?? printResults;
  const writeReport = deps.writeJsonReport ?? writeJsonReport;
  const startProcesses = deps.spawnServerProcesses ?? spawnServerProcesses;

  const config: RunConfig = {
    serverUrl: values["server-url"] ?? DEFAULT_SERVER_URL,
    stubUrl: values["stub-url"] ?? DEFAULT_STUB_URL,
    scenarios: parseScenarioIds(values.scenarios),
    jsonOutput: values.json,
    realJudge0: values["real-judge0"],
  };
  const selected = selectScenarios(availableScenarios, config.scenarios);

  if (selected.length === 0) {
    logger.error("load_test_selection_failed", {
      requested_scenarios: config.scenarios ?? [],
      available_scenarios: availableScenarios.map((scenario) => scenario.id),
      reason: "no_matching_scenarios",
    });
    error("No matching scenarios found.");
    error(`Available: ${availableScenarios.map((scenario) => scenario.id).join(", ")}`);
    return 1;
  }

  try {
    if (values["auto-start"]) {
      log("Auto-starting server and stub processes...");
      const spawned = await startProcesses({
        skipDbSetup: values["skip-db-setup"],
      });
      config.serverUrl = spawned.serverUrl;
      config.stubUrl = spawned.stubUrl;
      cleanupManager.register(() => spawned.kill());
    }

    await runValidateServers(config, selected);

    logger.info("load_test_run_started", {
      scenario_count: selected.length,
      scenario_ids: selected.map((scenario) => scenario.id),
      server_url: config.serverUrl,
      stub_url: config.stubUrl,
      real_judge0: config.realJudge0,
      report_path: config.jsonOutput ?? null,
    });
    log(
      `Running ${selected.length} scenario(s): ${selected.map((scenario) => scenario.id).join(", ")}\n`,
    );

    const results = await runScenarioSequence(selected, config, logger, undefined, {
      onScenarioStarted: (scenario) => {
        log(`[${scenario.id}] ${scenario.name} ...`);
      },
      onScenarioCompleted: (result) => {
        const status = result.passed ? "PASS" : "FAIL";
        log(`[${result.id}] ${status} (${Math.round(result.durationMs)}ms)\n`);
      },
      onScenarioErrored: (scenario, err) => {
        error(`[${scenario.id}] ERROR: ${String(err)}\n`);
      },
    });

    reportResults(results, logger);

    if (config.jsonOutput) {
      writeReport(results, config.jsonOutput, logger);
    }

    logger.info("load_test_run_completed", {
      scenario_count: results.length,
      passed_count: results.filter((result) => result.passed).length,
      failed_count: results.filter((result) => !result.passed).length,
    });

    return results.every((result) => result.passed) ? 0 : 1;
  } finally {
    await cleanupManager.run();
  }
}

function parseRunnerArgs(): RunnerOptionValues {
  const { values } = parseArgs({
    options: {
      "server-url": { type: "string" },
      "stub-url": { type: "string" },
      scenarios: { type: "string" },
      json: { type: "string" },
      "real-judge0": { type: "boolean", default: false },
      "auto-start": { type: "boolean", default: false },
      "skip-db-setup": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  return values as RunnerOptionValues;
}

export async function runCliEntrypoint(): Promise<number> {
  const values = parseRunnerArgs();
  if (values.help) {
    printUsage();
    return 0;
  }

  const logger = createLoadTestLogger();
  const cleanupManager = createRunnerCleanupManager();
  const unregisterTerminationHandlers = registerTerminationHandlers({
    cleanup: () => cleanupManager.run(),
  });

  try {
    return await runLoadTestCli(values, { cleanupManager, logger });
  } catch (err) {
    logger.error("load_test_run_failed", {
      error: err,
    });
    console.error("Fatal error:", err);
    return 1;
  } finally {
    unregisterTerminationHandlers();
    await cleanupManager.run();
  }
}

function isDirectExecution(metaUrl: string): boolean {
  const currentFile = fileURLToPath(metaUrl);
  return process.argv[1] === currentFile;
}

if (isDirectExecution(import.meta.url)) {
  void runCliEntrypoint().then((exitCode) => {
    process.exit(exitCode);
  });
}
