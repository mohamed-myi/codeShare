import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { waitForHealthy } from "./health-client.js";
import { resolveDatabaseUrl } from "./server-env.js";

interface ServerProcesses {
  server: ChildProcess;
  stub: ChildProcess;
  serverUrl: string;
  stubUrl: string;
  kill(): void;
}

interface SpawnOptions {
  serverPort?: number;
  stubPort?: number;
  rateLimitOverrides?: Record<string, string>;
  exposeGC?: boolean;
  skipDbSetup?: boolean;
}

function buildServerEnv(opts: SpawnOptions, repoRoot: string): Record<string, string> {
  const port = String(opts.serverPort ?? 3099);
  const stubPort = String(opts.stubPort ?? 4199);
  const stubUrl = `http://127.0.0.1:${stubPort}`;

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: port,
    NODE_ENV: "test",
    DATABASE_URL: resolveDatabaseUrl(repoRoot),
    JUDGE0_API_URL: `${stubUrl}/judge0`,
    JUDGE0_API_KEY: "load-test-stub-key",
    JUDGE0_DAILY_LIMIT: "10000",
    GROQ_API_KEY: "",
    GROQ_MODEL: "llama-3.3-70b-versatile",
    GROQ_API_URL: `${stubUrl}/openai/v1/chat/completions`,
    CORS_ORIGIN: "http://localhost:5173",
    ALLOWED_ORIGINS: "http://localhost:5173",
    LOG_LEVEL: "warn",
    ROOM_GRACE_PERIOD_MS: "5000",
    ENABLE_PROBLEM_IMPORT: "true",
    LEETCODE_GRAPHQL_URL: `${stubUrl}/graphql`,
    RATE_LIMIT_ROOM_CREATE: "10000",
    RATE_LIMIT_WS_CONNECT: "10000",
    RATE_LIMIT_JOIN: "10000",
    RATE_LIMIT_IMPORT: "10000",
    E2E_STUB_PORT: stubPort,
  };

  if (opts.rateLimitOverrides) {
    Object.assign(env, opts.rateLimitOverrides);
  }

  return env;
}

function buildProcessEnv(opts: SpawnOptions, repoRoot: string): Record<string, string> {
  return buildServerEnv(opts, repoRoot);
}

function ensureDatabase(repoRoot: string, opts: SpawnOptions): void {
  const env = buildProcessEnv(opts, repoRoot);
  const commands = [
    ["pnpm", "--filter", "@codeshare/shared", "build"],
    ["pnpm", "--filter", "@codeshare/db", "build"],
    ["pnpm", "db:migrate"],
    ["pnpm", "--filter", "@codeshare/db", "clean-e2e-imports"],
    ["pnpm", "db:seed"],
  ] as const;

  for (const [command, ...args] of commands) {
    try {
      execFileSync(command, args, {
        cwd: repoRoot,
        env,
        stdio: "pipe",
      });
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      const stdout =
        "stdout" in error && Buffer.isBuffer(error.stdout) ? error.stdout.toString().trim() : "";
      const stderr =
        "stderr" in error && Buffer.isBuffer(error.stderr) ? error.stderr.toString().trim() : "";
      const output = stderr || stdout;
      throw new Error(
        output.length > 0
          ? `Failed to run '${[command, ...args].join(" ")}': ${output}`
          : `Failed to run '${[command, ...args].join(" ")}'.`,
      );
    }
  }
}

export async function spawnServerProcesses(opts: SpawnOptions = {}): Promise<ServerProcesses> {
  const serverPort = opts.serverPort ?? 3099;
  const stubPort = opts.stubPort ?? 4199;
  const serverUrl = `http://127.0.0.1:${serverPort}`;
  const stubUrl = `http://127.0.0.1:${stubPort}`;

  const repoRoot = resolve(import.meta.dirname, "../../..");

  if (!opts.skipDbSetup) {
    ensureDatabase(repoRoot, { ...opts, serverPort, stubPort });
  }

  const stubPath = resolve(repoRoot, "e2e/support/stub-server.mjs");
  const stub = spawn("node", [stubPath], {
    env: { ...process.env, E2E_STUB_PORT: String(stubPort) },
    stdio: "pipe",
    cwd: repoRoot,
  });

  await new Promise<void>((res, rej) => {
    const timeout = setTimeout(() => rej(new Error("Stub server start timed out")), 10_000);
    stub.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("e2e_stub_server_ready")) {
        clearTimeout(timeout);
        res();
      }
    });
    stub.on("error", (err) => {
      clearTimeout(timeout);
      rej(err);
    });
  });

  const env = buildServerEnv({ ...opts, serverPort, stubPort }, repoRoot);
  const serverEntry = resolve(repoRoot, "apps/server/dist/index.js");

  const nodeArgs = opts.exposeGC ? ["--expose-gc", serverEntry] : [serverEntry];
  const server = spawn("node", nodeArgs, {
    env,
    stdio: "pipe",
    cwd: repoRoot,
  });

  try {
    await waitForHealthy(serverUrl, 30_000);
  } catch (err) {
    server.kill("SIGTERM");
    stub.kill("SIGTERM");
    throw new Error(`Server failed to start: ${String(err)}`);
  }

  return {
    server,
    stub,
    serverUrl,
    stubUrl,
    kill() {
      server.kill("SIGTERM");
      stub.kill("SIGTERM");
    },
  };
}
