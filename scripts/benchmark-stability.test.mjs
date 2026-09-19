import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

for (const [signal, exitCode] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  test(`stability runs stop the active seed after ${signal}`, { timeout: 10_000 }, async (t) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "codeshare-stability-test-"));
    const pidFile = path.join(directory, "worker.pid");
    await writeFile(
      path.join(directory, "pnpm"),
      `#!/usr/bin/env node
require('node:fs').appendFileSync(${JSON.stringify(pidFile)}, String(process.pid) + '\\n');
setInterval(() => {}, 1000);
`,
      { mode: 0o755 },
    );
    const child = spawn(
      process.execPath,
      [new URL("./test-stability.mjs", import.meta.url).pathname],
      {
        env: {
          ...process.env,
          PATH: `${directory}:${path.dirname(process.execPath)}:${process.env.PATH}`,
        },
        stdio: "ignore",
      },
    );
    const completion = new Promise((resolve) => child.on("close", (code) => resolve(code)));
    let pid;
    t.after(async () => {
      child.kill("SIGKILL");
      if (pid) {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {}
      }
      await rm(directory, { recursive: true, force: true });
    });
    const deadline = Date.now() + 5_000;
    while (!pid && Date.now() < deadline) {
      pid = Number((await readFile(pidFile, "utf8").catch(() => "")).trim());
      if (!pid) await delay(20);
    }
    assert.ok(pid, "active seed must start before interruption");
    child.kill(signal);
    assert.equal(await completion, exitCode);
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    assert.equal((await readFile(pidFile, "utf8")).trim().split("\n").length, 1);
  });
}
