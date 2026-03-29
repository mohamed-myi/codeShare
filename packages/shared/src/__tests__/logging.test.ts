import { describe, expect, it } from "vitest";
import {
  CLIENT_LOG_EVENTS,
  clientLogPayloadSchema,
  LOG_SERVICES,
  logLevelSchema,
} from "../logging.js";

describe("logLevelSchema", () => {
  it("accepts the supported structured log levels", () => {
    expect(logLevelSchema.parse("info")).toBe("info");
    expect(logLevelSchema.parse("warn")).toBe("warn");
    expect(logLevelSchema.parse("error")).toBe("error");
  });

  it("rejects unsupported log levels", () => {
    expect(() => logLevelSchema.parse("verbose")).toThrow();
  });
});

describe("clientLogPayloadSchema", () => {
  it("accepts structured browser log payloads with correlation context", () => {
    const result = clientLogPayloadSchema.safeParse({
      level: "error",
      event: CLIENT_LOG_EVENTS.CLIENT_RENDER_FAILED,
      service: LOG_SERVICES.CLIENT,
      room_code: "abc-xyz",
      socket_id: "socket-1",
      request_id: "req-123",
      route: "/room/abc-xyz/session",
      error_type: "RenderError",
      error_message: "Boom",
      context: {
        panel: "results",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects client logs without a stable snake_case event name", () => {
    const result = clientLogPayloadSchema.safeParse({
      level: "error",
      event: "Render failed",
      service: LOG_SERVICES.CLIENT,
      error_message: "Boom",
    });

    expect(result.success).toBe(false);
  });
});
