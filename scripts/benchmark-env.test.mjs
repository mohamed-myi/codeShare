import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanEnvironment, createTestEnvironment } from "./benchmark-env.mjs";

test("only host tooling settings survive into benchmark subprocesses", () => {
  assert.deepEqual(
    cleanEnvironment({
      PATH: "/bin",
      HOME: "/home/test",
      DATABASE_URL: "untrusted",
      NODE_OPTIONS: "untrusted",
      GROQ_API_KEY: "untrusted",
    }),
    { PATH: "/bin", HOME: "/home/test" },
  );
});

test("each service uses the assigned loopback port and disposable database", () => {
  const env = createTestEnvironment({
    ports: [41001, 41002, 41003],
    databasePort: 41004,
    envDir: "/tmp/isolated",
  });
  assert.equal(env.DATABASE_URL, "postgresql://codeshare@127.0.0.1:41004/codeshare_e2e");
  assert.equal(env.E2E_CLIENT_ORIGIN, "http://127.0.0.1:41001");
  assert.equal(env.E2E_SERVER_URL, "http://127.0.0.1:41002");
  assert.equal(env.E2E_STUB_URL, "http://127.0.0.1:41003");
  assert.equal(env.E2E_ENV_DIR, "/tmp/isolated");
});

test("invalid or colliding ports fail before starting services", () => {
  for (const ports of [
    [0, 2, 3],
    [1, 1, 3],
    [1, 2, 65536],
    [1, 2, 3.5],
    [1, 2],
  ]) {
    assert.throws(
      () => createTestEnvironment({ ports, databasePort: 4, envDir: "/tmp/test" }),
      /ports/i,
    );
  }
  assert.throws(
    () => createTestEnvironment({ ports: [1, 2, 3], databasePort: 3, envDir: "/tmp/test" }),
    /ports/i,
  );
});
