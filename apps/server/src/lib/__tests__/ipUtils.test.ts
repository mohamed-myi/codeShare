import { describe, expect, it } from "vitest";
import { getClientIp } from "../ipUtils.js";

describe("getClientIp", () => {
  it("returns the socket clientIp when present", () => {
    const socket = { data: { clientIp: "203.0.113.10" } };

    expect(getClientIp(socket as never)).toBe("203.0.113.10");
  });

  it("falls back to unknown when clientIp is missing", () => {
    const socket = { data: {} };

    expect(getClientIp(socket as never)).toBe("unknown");
  });
});
