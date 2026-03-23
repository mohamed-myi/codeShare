import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const pgStatePath = path.join(os.tmpdir(), "codeshare-e2e-postgres.json");

export default async function globalTeardown() {
  if (!existsSync(pgStatePath)) {
    return;
  }

  const state = JSON.parse(readFileSync(pgStatePath, "utf8"));
  try {
    execFileSync(state.pgCtl, ["-D", state.clusterDir, "-w", "stop"], {
      stdio: "inherit",
    });
  } finally {
    rmSync(state.clusterDir, { force: true, recursive: true });
    unlinkSync(pgStatePath);
  }
}
