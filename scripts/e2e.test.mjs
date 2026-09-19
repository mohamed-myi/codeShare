import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

async function launch(t, settings = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "codeshare-runner-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const log = path.join(dir, "calls.jsonl");
  const executable = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import path from 'node:path';
const settings = ${JSON.stringify(settings)};
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(log)}, JSON.stringify({command, args, env: process.env, pid: process.pid}) + '\\n');
if (command === 'docker') {
  if (args[0] === 'run' && settings.startFailure) process.exit(1);
  if (args[0] === 'exec' && settings.unhealthy) process.exit(1);
  if (args[0] === 'port') console.log('127.0.0.1:54329');
  if (args[0] === 'rm' && settings.cleanupFailure) process.exit(1);
} else if (command === 'playwright.mjs') {
  if (settings.hang) setInterval(() => {}, 1000);
  else process.exit(settings.testCode ?? 0);
} else if (args.includes('migrate') && settings.migrationFailure) process.exit(4);
`;
  for (const command of ["docker", "pnpm", "playwright.mjs"]) {
    await writeFile(path.join(dir, command), executable, { mode: 0o755 });
  }
  const entry = path.join(dir, "entry.mjs");
  await writeFile(
    entry,
    `import { runE2e } from ${JSON.stringify(new URL("./e2e.mjs", import.meta.url).href)}; process.exitCode = await runE2e({ startupTimeoutMs: 300, playwrightCli: ${JSON.stringify(path.join(dir, "playwright.mjs"))} });`,
  );
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PATH: `${dir}:${path.dirname(process.execPath)}:${process.env.PATH}`,
      DATABASE_URL: "must-not-use-developer-db",
      GROQ_API_KEY: "must-not-inherit",
      NODE_OPTIONS: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  t.after(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  });
  const completed = new Promise((resolve) =>
    child.on("close", (code) => resolve({ code, output })),
  );
  const calls = async () =>
    (await readFile(log, "utf8").catch(() => ""))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  return { child, completed, calls };
}

test("runner provisions isolated state, runs migrations and tests, then cleans up", {
  timeout: 10_000,
}, async (t) => {
  const run = await launch(t);
  const result = await run.completed;
  assert.equal(result.code, 0, result.output);
  const calls = await run.calls();
  const testCall = calls.find((call) => call.command === "playwright.mjs");
  assert.ok(testCall);
  assert.equal(testCall.env.DATABASE_URL, "postgresql://codeshare@127.0.0.1:54329/codeshare_e2e");
  assert.equal(testCall.env.GROQ_API_KEY, undefined);
  assert.ok(calls.some((call) => call.args.includes("migrate")));
  assert.ok(calls.some((call) => call.args.includes("seed")));
  const container = calls.find((call) => call.args[0] === "run");
  assert.ok(container.args.includes("127.0.0.1::5432"));
  assert.ok(container.args.includes("--rm"));
  assert.deepEqual(calls.at(-1).args, [
    "rm",
    "-f",
    "--volumes",
    container.args[container.args.indexOf("--name") + 1],
  ]);
  await assert.rejects(access(testCall.env.E2E_ENV_DIR), { code: "ENOENT" });
});

for (const [name, settings, expected] of [
  ["test failure", { testCode: 7 }, 7],
  ["migration failure", { migrationFailure: true }, 4],
  ["database startup failure", { startFailure: true }, 1],
  ["database readiness timeout", { unhealthy: true }, 1],
  ["cleanup failure", { cleanupFailure: true }, 1],
  ["test and cleanup failure", { testCode: 7, cleanupFailure: true }, 7],
]) {
  test(`runner preserves failure and cleans up after ${name}`, { timeout: 10_000 }, async (t) => {
    const run = await launch(t, settings);
    const result = await run.completed;
    assert.equal(result.code, expected, result.output);
    const calls = await run.calls();
    assert.equal(calls.at(-1).args[0], "rm");
    if (settings.migrationFailure || settings.startFailure || settings.unhealthy) {
      assert.equal(
        calls.some((call) => call.command === "playwright.mjs"),
        false,
      );
    }
  });
}

for (const [signal, expected] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  test(`runner cleans up after ${signal}`, { timeout: 10_000 }, async (t) => {
    const run = await launch(t, { hang: true });
    let testCall;
    const deadline = Date.now() + 5_000;
    while (!testCall && Date.now() < deadline) {
      testCall = (await run.calls()).find((call) => call.command === "playwright.mjs");
      if (!testCall) await delay(20);
    }
    assert.ok(testCall, "test subprocess must be running before interruption");
    run.child.kill(signal);
    const result = await run.completed;
    assert.equal(result.code, expected, result.output);
    assert.equal((await run.calls()).at(-1).args[0], "rm");
    assert.throws(() => process.kill(testCall.pid, 0), { code: "ESRCH" });
    await assert.rejects(access(testCall.env.E2E_ENV_DIR), { code: "ENOENT" });
  });
}

test("concurrent runs have different containers, ports and state directories", {
  timeout: 10_000,
}, async (t) => {
  const runs = await Promise.all([launch(t), launch(t)]);
  for (const result of await Promise.all(runs.map((run) => run.completed)))
    assert.equal(result.code, 0, result.output);
  const calls = await Promise.all(runs.map((run) => run.calls()));
  const containers = calls.map((items) => items.find((call) => call.args[0] === "run").args);
  assert.notEqual(
    containers[0][containers[0].indexOf("--name") + 1],
    containers[1][containers[1].indexOf("--name") + 1],
  );
  const environments = calls.map(
    (items) => items.find((call) => call.command === "playwright.mjs").env,
  );
  assert.notEqual(environments[0].E2E_ENV_DIR, environments[1].E2E_ENV_DIR);
  assert.notEqual(environments[0].E2E_OUTPUT_DIR, environments[1].E2E_OUTPUT_DIR);
  assert.notEqual(environments[0].E2E_SERVER_PORT, environments[1].E2E_SERVER_PORT);
});
