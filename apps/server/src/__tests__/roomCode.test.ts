import { describe, it, expect } from "vitest";
import { generateRoomCode } from "../lib/roomCode.js";

describe("generateRoomCode", () => {
  it("generates a code in abc-xyz format", () => {
    const code = generateRoomCode(new Set());
    expect(code).toMatch(/^[a-z]{3}-[a-z]{3}$/);
  });

  it("avoids collisions with active codes", () => {
    const active = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const code = generateRoomCode(active);
      expect(active.has(code)).toBe(false);
      active.add(code);
    }
  });
});
