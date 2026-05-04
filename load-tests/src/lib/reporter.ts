import { writeFileSync } from "node:fs";
import { NFR, type NfrId, SCENARIO_NFR_MAP, UNCOVERED_NFRS } from "../nfr-thresholds.js";
import type { ScenarioResult } from "../types.js";
import type { LoadTestLogger } from "./logger.js";

interface NfrCoverageEntry {
  nfrId: NfrId;
  title: string;
  status: "PASS" | "FAIL" | "SKIP" | "UNCOVERED";
  testedBy: string[];
  assertions: Array<{ id: string; passed: boolean }>;
}

function buildNfrCoverage(results: ScenarioResult[]): NfrCoverageEntry[] {
  const coverage = new Map<NfrId, NfrCoverageEntry>();

  // Initialize all NFR entries
  for (const nfrId of Object.keys(NFR) as NfrId[]) {
    coverage.set(nfrId, {
      nfrId,
      title: NFR[nfrId].title,
      status: "SKIP",
      testedBy: [],
      assertions: [],
    });
  }

  // Collect assertions per NFR from results
  for (const result of results) {
    const nfrIds = SCENARIO_NFR_MAP[result.id] ?? [];
    for (const nfrId of nfrIds) {
      const entry = coverage.get(nfrId);
      if (!entry) continue;

      if (!entry.testedBy.includes(result.id)) {
        entry.testedBy.push(result.id);
      }
    }

    for (const assertion of result.assertions) {
      const nfrId = assertion.nfrId as NfrId;
      const entry = coverage.get(nfrId);
      if (!entry) continue;

      entry.assertions.push({ id: assertion.id, passed: assertion.passed });
    }
  }

  // Determine status
  for (const entry of coverage.values()) {
    if (UNCOVERED_NFRS.includes(entry.nfrId)) {
      entry.status = "UNCOVERED";
    } else if (entry.assertions.length === 0) {
      entry.status = "SKIP";
    } else if (entry.assertions.every((a) => a.passed)) {
      entry.status = "PASS";
    } else {
      entry.status = "FAIL";
    }
  }

  return [...coverage.values()];
}

export function printResults(results: ScenarioResult[], logger?: LoadTestLogger): void {
  console.log("\n=== Load Test Results ===\n");

  const rows = results.map((r) => ({
    ID: r.id,
    Name: r.name,
    Status: r.passed ? "PASS" : "FAIL",
    "Duration (ms)": Math.round(r.durationMs),
    Assertions: `${r.assertions.filter((a) => a.passed).length}/${r.assertions.length}`,
  }));
  console.table(rows);

  for (const result of results) {
    const failed = result.assertions.filter((a) => !a.passed);
    if (failed.length > 0) {
      console.log(`\n  [${result.id}] Failed assertions:`);
      for (const a of failed) {
        console.log(`    - ${a.description}: expected ${a.target}, got ${a.actual}`);
      }
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const overall = passed === total ? "PASS" : "FAIL";
  console.log(`\n${overall}: ${passed} of ${total} scenarios passed.`);

  // NFR Coverage Matrix
  const nfrCoverage = buildNfrCoverage(results);
  console.log("\n=== NFR Coverage Matrix ===\n");

  const nfrRows = nfrCoverage.map((entry) => ({
    NFR: entry.nfrId,
    Title: entry.title,
    Status: entry.status,
    "Tested By": entry.testedBy.join(", ") || "-",
    Assertions:
      entry.assertions.length > 0
        ? `${entry.assertions.filter((a) => a.passed).length}/${entry.assertions.length}`
        : "-",
  }));
  console.table(nfrRows);

  const nfrPassed = nfrCoverage.filter((e) => e.status === "PASS").length;
  const nfrFailed = nfrCoverage.filter((e) => e.status === "FAIL").length;
  const nfrSkipped = nfrCoverage.filter((e) => e.status === "SKIP").length;
  const nfrUncovered = nfrCoverage.filter((e) => e.status === "UNCOVERED").length;
  console.log(
    `NFR Summary: ${nfrPassed} passed, ${nfrFailed} failed, ${nfrSkipped} skipped, ${nfrUncovered} uncovered (integration-tested)\n`,
  );

  logger?.info("load_test_results_reported", {
    scenario_count: total,
    passed_count: passed,
    failed_count: total - passed,
    nfr_passed_count: nfrPassed,
    nfr_failed_count: nfrFailed,
    nfr_skipped_count: nfrSkipped,
    nfr_uncovered_count: nfrUncovered,
  });
}

export function writeJsonReport(
  results: ScenarioResult[],
  filePath: string,
  logger?: LoadTestLogger,
): void {
  const nfrCoverage = buildNfrCoverage(results);

  const report = {
    scenarios: results,
    nfrCoverage: nfrCoverage.map((entry) => ({
      nfrId: entry.nfrId,
      title: entry.title,
      status: entry.status,
      testedBy: entry.testedBy,
      assertions: entry.assertions,
    })),
  };

  const json = JSON.stringify(report, null, 2);
  writeFileSync(filePath, json, "utf-8");
  console.log(`Report written to ${filePath}`);
  logger?.info("load_test_report_written", {
    report_path: filePath,
    scenario_count: results.length,
  });
}
