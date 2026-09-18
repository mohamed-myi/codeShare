import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { runCommand } from "./benchmark-process.mjs";

test("captured commands drain stderr instead of blocking on a full pipe", async () => {
  const result = await runCommand({
    command: process.execPath,
    args: ["-e", "process.stderr.write('x'.repeat(4 * 1024 * 1024)); console.log('ready')"],
    capture: true,
    timeoutMs: 1_000,
  });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, "ready");
});

test("timeout kills a descendant even when its wrapper exits first", {
  timeout: 10_000,
}, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codeshare-process-test-"));
  const pidFile = path.join(directory, "descendant.pid");
  const descendant = `process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);`;
  const wrapper = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio: 'ignore'}); setInterval(() => {}, 1000);`;
  t.after(async () => {
    const pid = Number(await readFile(pidFile, "utf8").catch(() => ""));
    if (pid > 0) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    await rm(directory, { recursive: true, force: true });
  });
  const result = await runCommand({
    command: process.execPath,
    args: ["-e", wrapper],
    capture: true,
    timeoutMs: 1_500,
  });
  assert.equal(result.code, 124);
  const pid = Number(await readFile(pidFile, "utf8"));
  const isAlive = () => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const deadline = Date.now() + 2_500;
  while (isAlive() && Date.now() < deadline) await delay(20);
  assert.equal(isAlive(), false, "the entire owned process group must stop");
});

test("descendants can finish signal cleanup after their wrapper exits", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codeshare-graceful-test-"));
  const marker = path.join(directory, "cleaned");
  t.after(() => rm(directory, { recursive: true, force: true }));
  const descendant = `process.on('SIGTERM', () => setTimeout(() => { require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'cleaned'); process.exit(0); }, 100)); setInterval(() => {}, 1000);`;
  const wrapper = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio: 'ignore'}); setInterval(() => {}, 1000);`;
  const result = await runCommand({
    command: process.execPath,
    args: ["-e", wrapper],
    capture: true,
    timeoutMs: 1_500,
  });
  assert.equal(result.code, 124);
  assert.equal(await readFile(marker, "utf8"), "cleaned");
});
