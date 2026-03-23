import { parseArgs } from "node:util";
import { printResults, writeJsonReport } from "./lib/reporter.js";
import type { RunConfig, Scenario, ScenarioResult } from "./types.js";

async function loadScenarios(): Promise<Scenario[]> {
  const modules = await Promise.all([
    import("./scenarios/lt1-concurrent-rooms.js"),
    import("./scenarios/lt2-connection-establishment.js"),
    import("./scenarios/lt3-room-creation-throughput.js"),
    import("./scenarios/lt4-event-throughput.js"),
    import("./scenarios/lt5-execution-under-load.js"),
    import("./scenarios/lt6-yjs-doc-sync.js"),
    import("./scenarios/lt7-memory-soak.js"),
    import("./scenarios/lt8-rate-limit-enforcement.js"),
    import("./scenarios/lt9-reconnection-under-load.js"),
  ]);
  return modules.map((m) => m.default as Scenario);
}

function printUsage(): void {
  console.log(`
Usage: pnpm load-test [options]

Options:
  --server-url <url>    Server URL (default: http://127.0.0.1:3099)
  --stub-url <url>      Stub server URL (default: http://127.0.0.1:4199)
  --scenarios <ids>     Comma-separated scenario IDs (e.g., LT-2,LT-3)
  --json <path>         Write JSON report to file
  --real-judge0         Use real Judge0 API instead of stub (LT-5 only)
  --help                Show this help message

Examples:
  pnpm load-test                                 # Run all scenarios
  pnpm load-test --scenarios LT-2,LT-3           # Run specific scenarios
  pnpm load-test --json results.json              # Save JSON report
  pnpm load-test --scenarios LT-5 --real-judge0   # LT-5 with real Judge0
`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "server-url": { type: "string", default: "http://127.0.0.1:3099" },
      "stub-url": { type: "string", default: "http://127.0.0.1:4199" },
      scenarios: { type: "string" },
      json: { type: "string" },
      "real-judge0": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const config: RunConfig = {
    serverUrl: values["server-url"]!,
    stubUrl: values["stub-url"]!,
    scenarios: values.scenarios?.split(",").map((s) => s.trim().toUpperCase()),
    jsonOutput: values.json,
    realJudge0: values["real-judge0"],
  };

  const allScenarios = await loadScenarios();

  const selected = config.scenarios
    ? allScenarios.filter((s) => config.scenarios!.includes(s.id.toUpperCase()))
    : allScenarios;

  if (selected.length === 0) {
    console.error("No matching scenarios found.");
    console.error(`Available: ${allScenarios.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`Running ${selected.length} scenario(s): ${selected.map((s) => s.id).join(", ")}\n`);

  const results: ScenarioResult[] = [];

  for (const scenario of selected) {
    console.log(`[${scenario.id}] ${scenario.name} ...`);
    try {
      const result = await scenario.run(config);
      results.push(result);
      const status = result.passed ? "PASS" : "FAIL";
      console.log(`[${scenario.id}] ${status} (${Math.round(result.durationMs)}ms)\n`);
    } catch (err) {
      console.error(`[${scenario.id}] ERROR: ${String(err)}\n`);
      results.push({
        id: scenario.id,
        name: scenario.name,
        durationMs: 0,
        assertions: [{
          id: `${scenario.id}-error`,
          nfrId: "",
          description: "Scenario completed without throwing",
          target: "no error",
          actual: String(err),
          passed: false,
        }],
        passed: false,
      });
    }
  }

  printResults(results);

  if (config.jsonOutput) {
    writeJsonReport(results, config.jsonOutput);
  }

  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
