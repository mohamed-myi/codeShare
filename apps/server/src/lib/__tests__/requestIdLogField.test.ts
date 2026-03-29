import { describe, expect, it } from "vitest";
import { requestIdLogField } from "../logger.js";

describe("requestIdLogField", () => {
  it("returns { request_id } when present on socket.data", () => {
    const socket = { data: { requestId: "abc-123" } };
    expect(requestIdLogField(socket)).toEqual({ request_id: "abc-123" });
  });

  it("returns {} when requestId absent", () => {
    const socket = { data: {} };
    expect(requestIdLogField(socket)).toEqual({});
  });

  it("returns {} when requestId is not a string", () => {
    const socket = { data: { requestId: 42 } };
    expect(requestIdLogField(socket)).toEqual({});
  });
});
