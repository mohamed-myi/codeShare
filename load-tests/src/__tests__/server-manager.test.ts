import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.hoisted(() => vi.fn());
const spawn = vi.hoisted(() => vi.fn());
const waitForHealthy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const resolveDatabaseUrl = vi.hoisted(() => vi.fn().mockReturnValue("postgresql://codeshare/test"));

vi.mock("node:child_process", () => ({
  execFileSync,
  spawn,
}));

vi.mock("../lib/health-client.js", () => ({
  waitForHealthy,
}));

vi.mock("../lib/server-env.js", () => ({
  resolveDatabaseUrl,
}));

import { spawnServerProcesses } from "../lib/server-manager.js";

interface MockChildProcess {
  stdout: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

function createChildProcess(): MockChildProcess {
  const stdout = new EventEmitter();
  return {
    stdout,
    kill: vi.fn(),
    on: vi.fn(),
  };
}

describe("spawnServerProcesses", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cleans e2e imports between migrate and seed during auto-start DB setup", async () => {
    spawn.mockImplementation(() => {
      const child = createChildProcess();
      if (spawn.mock.calls.length === 1) {
        queueMicrotask(() => {
          child.stdout.emit("data", Buffer.from("e2e_stub_server_ready"));
        });
      }
      return child;
    });

    const processes = await spawnServerProcesses();

    expect(execFileSync).toHaveBeenCalledTimes(5);
    expect(execFileSync).toHaveBeenNthCalledWith(
      1,
      "pnpm",
      ["--filter", "@codeshare/shared", "build"],
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenNthCalledWith(
      2,
      "pnpm",
      ["--filter", "@codeshare/db", "build"],
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenNthCalledWith(3, "pnpm", ["db:migrate"], expect.any(Object));
    expect(execFileSync).toHaveBeenNthCalledWith(
      4,
      "pnpm",
      ["--filter", "@codeshare/db", "clean-e2e-imports"],
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenNthCalledWith(5, "pnpm", ["db:seed"], expect.any(Object));

    processes.kill();
  });
});
