import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../lib/server-env.js";

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL from the current environment", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "codeshare-load-tests-env-"));
    writeFileSync(`${repoRoot}/.env`, "DATABASE_URL=postgresql://from-env-file\n", "utf8");

    expect(resolveDatabaseUrl(repoRoot, { DATABASE_URL: "postgresql://from-process-env" })).toBe(
      "postgresql://from-process-env",
    );
  });

  it("falls back to DATABASE_URL from .env when process env is unset", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "codeshare-load-tests-env-"));
    writeFileSync(
      `${repoRoot}/.env`,
      ["JUDGE0_API_KEY=test-key", "DATABASE_URL=postgresql://from-env-file"].join("\n"),
      "utf8",
    );

    expect(resolveDatabaseUrl(repoRoot, {})).toBe("postgresql://from-env-file");
  });

  it("uses the hardcoded default when neither process env nor .env defines DATABASE_URL", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "codeshare-load-tests-env-"));
    writeFileSync(`${repoRoot}/.env`, "JUDGE0_API_KEY=test-key\n", "utf8");

    expect(resolveDatabaseUrl(repoRoot, {})).toBe(
      "postgresql://codeshare:codeshare@localhost:5432/codeshare_dev",
    );
  });
});
