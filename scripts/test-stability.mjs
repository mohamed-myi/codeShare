// @ts-check
import { runCommand } from "./benchmark-process.mjs";

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
try {
  for (const seed of [101, 102, 103, 104, 105]) {
    console.log(`Running uncached Vitest suites with shuffle seed ${seed}`);
    const { code } = await runCommand({
      command: "pnpm",
      args: [
        "exec",
        "turbo",
        "run",
        "test",
        "--force",
        "--",
        "--sequence.shuffle",
        `--sequence.seed=${seed}`,
      ],
      signal: controller.signal,
      timeoutMs: 15 * 60_000,
    });
    if (controller.signal.aborted || code !== 0) {
      process.exitCode = code;
      break;
    }
  }
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  if (interrupted) process.exitCode = interrupted;
}
