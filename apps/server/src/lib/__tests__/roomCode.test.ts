import { describe, expect, it } from "vitest";
import { generateRoomCode, normalizeRoomCode } from "../roomCode.js";

describe("generateRoomCode", () => {
  it("generates a code in abc-xyz format", () => {
    const code = generateRoomCode(new Set());
    expect(code).toMatch(/^[a-z2-7]{3}-[a-z2-7]{3}$/);
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

describe("normalizeRoomCode", () => {
  it("lowercases the room code", () => {
    expect(normalizeRoomCode("ABCD-EFGH")).toBe("abcd-efgh");
  });

  it("trims whitespace", () => {
    expect(normalizeRoomCode("  abcd-efgh  ")).toBe("abcd-efgh");
  });

  it("handles mixed case and whitespace", () => {
    expect(normalizeRoomCode(" AbCd-EfGh ")).toBe("abcd-efgh");
  });
});
