import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLoadTestLogEntry, createLoadTestLogger } from "../lib/logger.js";

describe("createLoadTestLogEntry", () => {
  it("creates structured scenario lifecycle entries", () => {
    const entry = createLoadTestLogEntry("info", "load_test_scenario_started", {
      scenario_id: "LT-2",
      scenario_name: "Connection establishment",
    });

    expect(entry.service).toBe("codeshare-load-tests");
    expect(entry.event).toBe("load_test_scenario_started");
    expect(entry.scenario_id).toBe("LT-2");
  });

  it("persists JSONL entries for load test runs", () => {
    const logDir = mkdtempSync(join(tmpdir(), "codeshare-load-test-logs-"));
    const logger = createLoadTestLogger({
      logDir,
      now: () => new Date("2026-03-27T05:12:04.000Z"),
    });

    logger.error("load_test_scenario_failed", {
      scenario_id: "LT-5",
      err: new Error("Judge0 timeout"),
    });

    const contents = readFileSync(join(logDir, "2026-03-27.jsonl"), "utf-8").trim();
    expect(JSON.parse(contents)).toMatchObject({
      event: "load_test_scenario_failed",
      service: "codeshare-load-tests",
      scenario_id: "LT-5",
      err: {
        message: "Judge0 timeout",
        name: "Error",
      },
    });
  });
});
