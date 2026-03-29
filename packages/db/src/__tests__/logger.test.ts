import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDbLogEntry, createDbLogger } from "../logger.js";

describe("createDbLogEntry", () => {
  it("creates structured DB log entries with stable metadata", () => {
    const entry = createDbLogEntry("info", "migration_applied", {
      migration_name: "001_init.sql",
    });

    expect(entry.service).toBe("codeshare-db");
    expect(entry.level).toBe("info");
    expect(entry.event).toBe("migration_applied");
    expect(entry.migration_name).toBe("001_init.sql");
  });

  it("redacts secret-looking values from DB log context", () => {
    const entry = createDbLogEntry("error", "db_pool_error", {
      authorization: "Bearer top-secret",
      reconnectToken: "deadbeefdeadbeefdeadbeefdeadbeef",
    });

    expect(entry.authorization).toBe("[REDACTED]");
    expect(entry.reconnectToken).toBe("[REDACTED]");
  });

  it("persists JSONL entries for DB runtime logs", () => {
    const logDir = mkdtempSync(join(tmpdir(), "codeshare-db-logs-"));
    const logger = createDbLogger({
      logDir,
      now: () => new Date("2026-03-27T05:10:33.000Z"),
      writeToConsole: false,
    });

    logger.info("db_migration_completed", {
      applied_count: 2,
      skipped_count: 1,
    });

    const contents = readFileSync(join(logDir, "2026-03-27.jsonl"), "utf-8").trim();
    expect(JSON.parse(contents)).toMatchObject({
      event: "db_migration_completed",
      service: "codeshare-db",
      applied_count: 2,
      skipped_count: 1,
    });
  });
});
