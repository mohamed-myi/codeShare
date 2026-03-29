import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { createLogger, roomCodeLogFields } from "../lib/logger.js";

function createMemoryStream(chunks: string[]): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
}

describe("createLogger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("initializes in development without throwing", () => {
    process.env.NODE_ENV = "development";

    expect(() => createLogger("info")).not.toThrow();
  });

  it("emits structured JSON with base metadata and redacted secrets", async () => {
    const chunks: string[] = [];
    const stream = createMemoryStream(chunks);
    const logger = createLogger("info", {
      environment: "production",
      service: "codeshare-server",
      stream,
      enablePretty: false,
      enableFileLogging: false,
    });

    logger.info(
      {
        event: "auth_event_rejected",
        headers: {
          authorization: "Bearer super-secret",
        },
        reconnectToken: "deadbeefdeadbeefdeadbeefdeadbeef",
      },
      "Auth rejected",
    );

    await new Promise((resolve) => logger.flush(resolve));

    const entry = JSON.parse(chunks.join("").trim()) as Record<string, unknown>;
    expect(entry.service).toBe("codeshare-server");
    expect(entry.environment).toBe("production");
    expect(entry.event).toBe("auth_event_rejected");
    expect(entry.headers).toEqual({ authorization: "[REDACTED]" });
    expect(entry.reconnectToken).toBe("[REDACTED]");
  });
});

describe("roomCodeLogFields", () => {
  it("keeps the raw room code in development", () => {
    expect(roomCodeLogFields("abc-xyz", "development")).toEqual({
      room_code: "abc-xyz",
    });
  });

  it("hashes room codes outside development", () => {
    expect(roomCodeLogFields("abc-xyz", "production")).toEqual({
      room_code_hash: expect.any(String),
    });
  });
});
