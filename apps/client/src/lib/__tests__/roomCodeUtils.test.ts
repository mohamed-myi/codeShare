import { describe, expect, it } from "vitest";
import {
  formatRoomCode,
  isRoomCodeComplete,
  normalizeRoomCodeInput,
  stripRoomCodeInput,
} from "../roomCodeUtils.js";

describe("stripRoomCodeInput", () => {
  it("lowercases input", () => {
    expect(stripRoomCodeInput("ABC")).toBe("abc");
  });

  it("strips hyphens", () => {
    expect(stripRoomCodeInput("abc-xyz")).toBe("abcxyz");
  });

  it("strips spaces", () => {
    expect(stripRoomCodeInput("abc xyz")).toBe("abcxyz");
  });

  it("rejects digits not in alphabet (0, 1, 8, 9)", () => {
    expect(stripRoomCodeInput("a0b1c8d9")).toBe("abcd");
  });

  it("accepts digits in alphabet (2-7)", () => {
    expect(stripRoomCodeInput("a2b3c4d5e6f7")).toBe("a2b3c4");
  });

  it("truncates at 6 characters", () => {
    expect(stripRoomCodeInput("abcdefgh")).toBe("abcdef");
  });

  it("handles empty input", () => {
    expect(stripRoomCodeInput("")).toBe("");
  });

  it("handles partial input", () => {
    expect(stripRoomCodeInput("ab")).toBe("ab");
  });

  it("filters mixed invalid characters", () => {
    expect(stripRoomCodeInput("a!b@c#x$y%z")).toBe("abcxyz");
  });
});

describe("formatRoomCode", () => {
  it("inserts hyphen after 3 characters", () => {
    expect(formatRoomCode("abcxyz")).toBe("abc-xyz");
  });

  it("returns input unchanged when 3 or fewer chars", () => {
    expect(formatRoomCode("abc")).toBe("abc");
    expect(formatRoomCode("ab")).toBe("ab");
    expect(formatRoomCode("")).toBe("");
  });

  it("handles partial second segment", () => {
    expect(formatRoomCode("abcx")).toBe("abc-x");
  });
});

describe("isRoomCodeComplete", () => {
  it("returns true for exactly 6 characters", () => {
    expect(isRoomCodeComplete("abcxyz")).toBe(true);
  });

  it("returns false for fewer than 6", () => {
    expect(isRoomCodeComplete("abcxy")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRoomCodeComplete("")).toBe(false);
  });
});

describe("normalizeRoomCodeInput", () => {
  it("returns formatted code for valid full input", () => {
    expect(normalizeRoomCodeInput("ABCXYZ")).toBe("abc-xyz");
  });

  it("returns formatted code from hyphenated input", () => {
    expect(normalizeRoomCodeInput("abc-xyz")).toBe("abc-xyz");
  });

  it("returns null for incomplete input", () => {
    expect(normalizeRoomCodeInput("abc")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(normalizeRoomCodeInput("")).toBeNull();
  });

  it("normalizes input with invalid characters", () => {
    expect(normalizeRoomCodeInput("a!b@c#x$y%z")).toBe("abc-xyz");
  });

  it("returns null when too few valid chars after stripping", () => {
    expect(normalizeRoomCodeInput("a0b1c")).toBeNull();
  });
});
