// @ts-check
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

/**
 * @param {{command: string, args: string[], env?: NodeJS.ProcessEnv, signal?: AbortSignal, capture?: boolean, timeoutMs?: number, stopSignal?: "SIGTERM" | "SIGINT", gracePeriodMs?: number}} options
 * @returns {Promise<{code: number, stdout: string}>}
 */
export function runCommand({
  command,
  args,
  env,
  signal,
  capture = false,
  timeoutMs = 120_000,
  stopSignal = "SIGTERM",
  gracePeriodMs = 2_000,
}) {
  if (signal?.aborted) return Promise.resolve({ code: 130, stdout: "" });
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      detached: true,
      stdio: ["ignore", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
    });
    let stdout = "";
    /** @type {NodeJS.Timeout | undefined} */
    let forceKill;
    let timedOut = false;
    let stopDeadline = 0;
    /** @param {NodeJS.Signals | 0} termination */
    const killGroup = (termination) => {
      if (!child.pid) return false;
      try {
        process.kill(-child.pid, termination);
        return true;
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ESRCH") throw error;
        return false;
      }
    };
    const stop = () => {
      if (forceKill) return;
      stopDeadline = Date.now() + gracePeriodMs;
      killGroup(stopSignal);
      forceKill = setTimeout(() => killGroup("SIGKILL"), gracePeriodMs);
      forceKill.unref();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, timeoutMs);
    signal?.addEventListener("abort", stop, { once: true });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.resume();
    child.on("error", (error) => {
      console.error(`${command}: ${error.message}`);
    });
    child.on("close", async (code) => {
      // Wrappers may exit before descendants finish their own service teardown.
      while (Date.now() < stopDeadline && killGroup(0)) await delay(20);
      killGroup("SIGKILL");
      clearTimeout(timer);
      clearTimeout(forceKill);
      signal?.removeEventListener("abort", stop);
      resolve({ code: timedOut ? 124 : (code ?? 1), stdout: stdout.trim() });
    });
  });
}
