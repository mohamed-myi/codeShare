import { describe, it, expect } from "vitest";
import { generateReconnectToken } from "../reconnectToken.js";

describe("generateReconnectToken", () => {
  it("returns a 32-character hex string (128 bits)", () => {
    const token = generateReconnectToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generates unique tokens on successive calls", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) {
      tokens.add(generateReconnectToken());
    }
    expect(tokens.size).toBe(20);
  });
});
