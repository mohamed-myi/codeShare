import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validatePayloadOrReject } from "../validation.js";

describe("validatePayloadOrReject", () => {
  const schema = z.object({
    problemId: z.string().uuid(),
  });

  it("returns typed data when the payload is valid", () => {
    const logger = { warn: vi.fn() };
    const socket = { data: { requestId: "req-123" } };

    const result = validatePayloadOrReject(
      socket as never,
      logger as never,
      schema,
      {
        problemId: "00000000-0000-4000-8000-000000000001",
      },
      {
        eventType: "problem_select",
        invalidMessage: "Invalid problem selection payload.",
      },
    );

    expect(result).toEqual({
      problemId: "00000000-0000-4000-8000-000000000001",
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs and rejects invalid payloads", () => {
    const logger = { warn: vi.fn() };
    const socket = { data: { requestId: "req-123" } };
    const onReject = vi.fn();

    const result = validatePayloadOrReject(
      socket as never,
      logger as never,
      schema,
      { badField: true },
      {
        roomCode: "abc-xyz",
        eventType: "problem_select",
        invalidMessage: "Invalid problem selection payload.",
        onReject,
      },
    );

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "problem_select_rejected",
        request_id: "req-123",
        reason: "invalid_payload",
      }),
    );
    expect(onReject).toHaveBeenCalledWith("Invalid problem selection payload.");
  });
});
