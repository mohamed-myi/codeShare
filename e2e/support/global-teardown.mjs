import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "../..");
const pgStatePath = path.join(os.tmpdir(), "codeshare-e2e-postgres.json");

function loadDotEnv() {
  const envPath = path.join(cwd, ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  const entries = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    entries[key] = value;
  }
  return entries;
}

const fileEnv = loadDotEnv();
const baseEnv = {
  ...fileEnv,
  ...process.env,
};

export default async function globalTeardown() {
  execFileSync("pnpm", ["--filter", "@codeshare/db", "clean-e2e-imports"], {
    cwd,
    stdio: "inherit",
    env: baseEnv,
  });

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
