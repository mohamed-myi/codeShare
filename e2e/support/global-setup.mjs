import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emitLog } from "./log.mjs";

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
  DATABASE_URL:
    process.env.DATABASE_URL ??
    fileEnv.DATABASE_URL ??
    "postgresql://codeshare:codeshare@127.0.0.1:5432/codeshare_dev",
  ...fileEnv,
  ...process.env,
};

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: baseEnv,
    ...options,
  });
}

function runQuiet(command, args, options = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    env: baseEnv,
    ...options,
  });
}

function runWithRetry(command, args, attempts = 10, delayMs = 2_000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      run(command, args);
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

function cleanE2eImports() {
  run("pnpm", ["--filter", "@codeshare/db", "clean-e2e-imports"]);
}

function resolvePgBinary(binaryName) {
  const candidates = [
    `/opt/homebrew/opt/postgresql@17/bin/${binaryName}`,
    `/opt/homebrew/opt/postgresql/bin/${binaryName}`,
    `/opt/homebrew/opt/libpq/bin/${binaryName}`,
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function parseDatabaseUrl() {
  const url = new URL(baseEnv.DATABASE_URL);
  return {
    host: url.hostname,
    port: Number(url.port || "5432"),
    database: url.pathname.replace(/^\//, ""),
    username: decodeURIComponent(url.username || "postgres"),
  };
}

function canConnectToDatabase({ host, port, username, database }) {
  const pgIsReady = resolvePgBinary("pg_isready");
  if (!pgIsReady) {
    return false;
  }

  try {
    runQuiet(pgIsReady, ["-h", host, "-p", String(port), "-U", username, "-d", database]);
    return true;
  } catch {
    return false;
  }
}

function ensureDatabaseExists({ host, port, username, database }) {
  const createdb = resolvePgBinary("createdb");
  const psql = resolvePgBinary("psql");
  if (!createdb || !psql) {
    throw new Error("PostgreSQL client binaries are unavailable for E2E setup");
  }

  try {
    runQuiet(psql, [
      "-h",
      host,
      "-p",
      String(port),
      "-U",
      username,
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${database.replace(/'/g, "''")}';`,
    ]);
  } catch {
    // Ignore probe errors and let createdb surface a real failure below.
  }

  try {
    runQuiet(createdb, ["-h", host, "-p", String(port), "-U", username, database]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists")) {
      throw error;
    }
  }
}

function startLocalPostgres({ host, port, username, database }) {
  if (!(host === "127.0.0.1" || host === "localhost")) {
    throw new Error(`Cannot auto-start local Postgres for non-local host ${host}`);
  }

  const initdb = resolvePgBinary("initdb");
  const pgCtl = resolvePgBinary("pg_ctl");
  if (!initdb || !pgCtl) {
    throw new Error("PostgreSQL server binaries are unavailable for local E2E setup");
  }

  const clusterDir = path.join(os.tmpdir(), `codeshare-e2e-pg-${port}`);
  const socketDir = path.join(clusterDir, "socket");
  const logPath = path.join(clusterDir, "postgres.log");

  rmSync(clusterDir, { force: true, recursive: true });
  mkdirSync(socketDir, { recursive: true });
  run(initdb, ["-D", clusterDir, "-U", username, "-A", "trust", "--encoding=UTF8"]);
  run(pgCtl, ["-D", clusterDir, "-l", logPath, "-w", "start", "-o", `-p ${port} -k ${socketDir}`]);

  writeFileSync(
    pgStatePath,
    JSON.stringify({
      clusterDir,
      pgCtl,
    }),
    "utf8",
  );

  ensureDatabaseExists({ host, port, username, database });
}

export default async function globalSetup() {
  const connection = parseDatabaseUrl();

  try {
    run("docker", ["compose", "up", "-d"]);
  } catch (error) {
    emitLog("warn", "e2e_docker_compose_up_skipped", {
      error_message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!canConnectToDatabase(connection)) {
    emitLog("warn", "e2e_database_unavailable", {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      action: "start_temporary_postgres_cluster",
    });
    startLocalPostgres(connection);
  }

  run("pnpm", ["--filter", "@codeshare/shared", "build"]);
  run("pnpm", ["--filter", "@codeshare/db", "build"]);
  runWithRetry("pnpm", ["db:migrate"]);
  cleanE2eImports();
  run("pnpm", ["db:seed"]);
}
