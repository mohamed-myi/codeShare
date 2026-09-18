// @ts-check
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { cleanEnvironment, createTestEnvironment } from "./benchmark-env.mjs";
import { runCommand } from "./benchmark-process.mjs";

const postgresImage =
  "postgres:17-alpine@sha256:f02121de6f74d30d8a94cd1d9584125e2178d7e6c377d8130112d4e52d867995";

async function allocatePorts() {
  const servers = [createServer(), createServer(), createServer()];
  try {
    return await Promise.all(
      servers.map(
        (server) =>
          new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", () => {
              const address = server.address();
              if (!address || typeof address === "string")
                return reject(new Error("No TCP port assigned"));
              resolve(address.port);
            });
          }),
      ),
    );
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  }
}

/** @param {{name: string, env: NodeJS.ProcessEnv, signal: AbortSignal, startupTimeoutMs: number}} options */
async function startDatabase({ name, env, signal, startupTimeoutMs }) {
  const started = await runCommand({
    command: "docker",
    args: [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--label",
      "codeshare.benchmark=true",
      "--publish",
      "127.0.0.1::5432",
      "--tmpfs",
      "/var/lib/postgresql/data",
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "--env",
      "POSTGRES_USER=codeshare",
      "--env",
      "POSTGRES_DB=codeshare_e2e",
      postgresImage,
    ],
    env,
    signal,
    capture: true,
  });
  if (started.code !== 0)
    throw new Error("Could not start disposable PostgreSQL; check Docker and image availability");
  const deadline = Date.now() + startupTimeoutMs;
  while (!signal.aborted && Date.now() < deadline) {
    const ready = await runCommand({
      command: "docker",
      args: [
        "exec",
        name,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "codeshare",
        "-d",
        "codeshare_e2e",
      ],
      env,
      signal,
      capture: true,
      timeoutMs: 5_000,
    });
    if (ready.code === 0) {
      const port = await runCommand({
        command: "docker",
        args: ["port", name, "5432/tcp"],
        env,
        signal,
        capture: true,
      });
      const match = /^127\.0\.0\.1:(\d+)$/.exec(port.stdout);
      if (port.code !== 0 || !match)
        throw new Error("Docker did not publish an isolated loopback database port");
      return Number(match[1]);
    }
    await delay(100, undefined, { signal });
  }
  throw new Error("Disposable PostgreSQL did not become ready before the deadline");
}

/** @param {{env: NodeJS.ProcessEnv, signal: AbortSignal, args: string[], playwrightCli: string}} options */
async function runTests({ env, signal, args, playwrightCli }) {
  const commands = [
    ["--filter", "@codeshare/shared", "build"],
    ["--filter", "@codeshare/db", "build"],
    ["--filter", "@codeshare/db", "migrate"],
    ["--filter", "@codeshare/db", "seed"],
  ];
  for (const command of commands) {
    const result = await runCommand({
      command: "pnpm",
      args: command,
      env,
      signal,
      timeoutMs: 15 * 60_000,
    });
    if (result.code !== 0) return result.code;
  }
  // pnpm forwards SIGTERM on exit, which interrupts Playwright's SIGINT teardown.
  const result = await runCommand({
    command: process.execPath,
    args: [
      playwrightCli,
      "test",
      "--config",
      "e2e/playwright.config.ts",
      ...(env.PLAYWRIGHT_LIVE === "1" ? ["--grep", "@live"] : ["--grep-invert", "@live"]),
      ...args,
    ],
    env,
    signal,
    timeoutMs: 15 * 60_000,
    stopSignal: "SIGINT",
    gracePeriodMs: 70_000,
  });
  return result.code;
}

/** @param {{startupTimeoutMs?: number, args?: string[], playwrightCli?: string}} options */
export async function runE2e({
  startupTimeoutMs = 60_000,
  args = [],
  playwrightCli = fileURLToPath(import.meta.resolve("@playwright/test/cli")),
} = {}) {
  const name = `codeshare-e2e-${randomUUID()}`;
  const envDir = await mkdtemp(path.join(os.tmpdir(), "codeshare-e2e-"));
  const env = cleanEnvironment(process.env);
  const controller = new AbortController();
  let interrupted = 0;
  const interrupt = () => {
    interrupted = 130;
    controller.abort();
  };
  const terminate = () => {
    interrupted = 143;
    controller.abort();
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  let code = 1;
  try {
    const databasePort = await startDatabase({
      name,
      env,
      signal: controller.signal,
      startupTimeoutMs,
    });
    const ports = await allocatePorts();
    const testEnv = {
      ...env,
      ...createTestEnvironment({ ports, databasePort, envDir }),
      E2E_OUTPUT_DIR: path.resolve("test-results", name),
      NODE_ENV: "test",
      PLAYWRIGHT_LIVE: args.includes("--live") ? "1" : "",
    };
    console.log(`Isolated browser run: ${name}`);
    code = await runTests({
      env: testEnv,
      signal: controller.signal,
      args: args.filter((arg) => arg !== "--live"),
      playwrightCli,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  } finally {
    const cleanup = await runCommand({
      command: "docker",
      args: ["rm", "-f", "--volumes", name],
      env,
      capture: true,
      timeoutMs: 30_000,
    });
    if (cleanup.code !== 0) {
      console.error(`Container cleanup failed: docker rm -f --volumes ${name}`);
      if (code === 0) code = 1;
    }
    await rm(envDir, { recursive: true, force: true });
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
  return interrupted || code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await runE2e({ args: process.argv.slice(2) });
}
