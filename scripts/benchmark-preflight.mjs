// @ts-check
import { access } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { runCommand } from "./benchmark-process.mjs";

if (process.versions.node !== "22.21.0") {
  throw new Error("Benchmark requires Node 22.21.0; run nvm use before verification");
}
for (const { command, args, expected } of [
  { command: "pnpm", args: ["--version"], expected: "10.32.1" },
  { command: "python3", args: ["--version"], expected: "Python 3.13.11" },
]) {
  const result = await runCommand({ command, args, capture: true, timeoutMs: 10_000 });
  if (result.code !== 0 || result.stdout !== expected)
    throw new Error(`Benchmark requires ${command} ${expected}`);
  console.log(result.stdout);
}
const docker = await runCommand({
  command: "docker",
  args: ["info", "--format", "{{.ServerVersion}}"],
  capture: true,
  timeoutMs: 10_000,
});
if (docker.code !== 0) throw new Error("Start Docker before benchmark verification");
await access(chromium.executablePath()).catch(() => {
  throw new Error("Install Chromium with pnpm exec playwright install chromium");
});
console.log(`Node ${process.versions.node}; Docker ${docker.stdout}; Chromium installed`);
