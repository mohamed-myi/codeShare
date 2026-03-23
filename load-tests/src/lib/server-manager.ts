import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { waitForHealthy } from "./health-client.js";

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
}

function buildServerEnv(opts: SpawnOptions): Record<string, string> {
  const port = String(opts.serverPort ?? 3099);
  const stubPort = String(opts.stubPort ?? 4199);
  const stubUrl = `http://127.0.0.1:${stubPort}`;

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PORT: port,
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://codeshare:codeshare@localhost:5432/codeshare_dev",
    JUDGE0_API_URL: `${stubUrl}/judge0`,
    JUDGE0_API_KEY: "load-test-stub-key",
    JUDGE0_DAILY_LIMIT: "10000",
    GROQ_API_KEY: "",
    GROQ_MODEL: "llama-3.3-70b-versatile",
    GROQ_API_URL: `${stubUrl}/openai/v1/chat/completions`,
    CORS_ORIGIN: "http://localhost:5173",
    ALLOWED_ORIGINS: "http://localhost:5173",
    LOG_LEVEL: "warn",
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

export async function spawnServerProcesses(opts: SpawnOptions = {}): Promise<ServerProcesses> {
  const serverPort = opts.serverPort ?? 3099;
  const stubPort = opts.stubPort ?? 4199;
  const serverUrl = `http://127.0.0.1:${serverPort}`;
  const stubUrl = `http://127.0.0.1:${stubPort}`;

  const repoRoot = resolve(import.meta.dirname, "../../..");

  const stubPath = resolve(repoRoot, "e2e/support/stub-server.mjs");
  const stub = spawn("node", [stubPath], {
    env: { ...process.env, E2E_STUB_PORT: String(stubPort) },
    stdio: "pipe",
    cwd: repoRoot,
  });

  await new Promise<void>((res, rej) => {
    const timeout = setTimeout(() => rej(new Error("Stub server start timed out")), 10_000);
    stub.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening")) {
        clearTimeout(timeout);
        res();
      }
    });
    stub.on("error", (err) => {
      clearTimeout(timeout);
      rej(err);
    });
  });

  const env = buildServerEnv({ ...opts, serverPort, stubPort });
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
