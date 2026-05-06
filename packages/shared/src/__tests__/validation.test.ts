import { describe, expect, it } from "vitest";
import {
  harnessResultSchema,
  problemImportSchema,
  roomCodeSchema,
  roomCreateSchema,
  userJoinSchema,
} from "../validation.js";

describe("userJoinSchema", () => {
  it("rejects display names that are only whitespace", () => {
    const result = userJoinSchema.safeParse({
      displayName: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("roomCreateSchema", () => {
  it("requires a display name alongside the room mode", () => {
    const result = roomCreateSchema.safeParse({
      mode: "collaboration",
      displayName: "Alice",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.displayName).toBe("Alice");
  });

  it("rejects a missing display name", () => {
    const result = roomCreateSchema.safeParse({
      mode: "collaboration",
    });

    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from display names", () => {
    const result = roomCreateSchema.safeParse({
      mode: "interview",
      displayName: "  Alice  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.displayName).toBe("Alice");
  });

  it("rejects display names that are only whitespace", () => {
    const result = roomCreateSchema.safeParse({
      mode: "collaboration",
      displayName: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("roomCodeSchema", () => {
  it("accepts 3+3 base32 room codes", () => {
    expect(roomCodeSchema.safeParse("ab2-ef7").success).toBe(true);
  });

  it("normalizes uppercase room codes with surrounding whitespace", () => {
    const result = roomCodeSchema.safeParse("  AB2-EF7  ");

    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe("ab2-ef7");
  });

  it("rejects longer room codes", () => {
    expect(roomCodeSchema.safeParse("abcd-efgh").success).toBe(false);
  });

  it("rejects characters outside the room alphabet", () => {
    expect(roomCodeSchema.safeParse("ab1-ef0").success).toBe(false);
  });
});

describe("problemImportSchema", () => {
  it("canonicalizes valid LeetCode URLs", () => {
    const result = problemImportSchema.safeParse({
      leetcodeUrl: "http://www.leetcode.com/problems/two-sum/description/",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.leetcodeUrl).toBe(
      "https://leetcode.com/problems/two-sum/",
    );
  });

  it("rejects non-LeetCode URLs", () => {
    const result = problemImportSchema.safeParse({
      leetcodeUrl: "https://example.com/problems/two-sum/",
    });

    expect(result.success).toBe(false);
  });
});

describe("harnessResultSchema", () => {
  it("accepts actual-only case results from the Judge0 harness", () => {
    const result = harnessResultSchema.safeParse({
      results: [
        { index: 0, status: "ok", elapsed_ms: 12, got_json: [0, 1], got_repr: "[0, 1]" },
        {
          index: 1,
          status: "error",
          elapsed_ms: 3,
          error: "ValueError: bad input",
          error_truncated: true,
        },
        { index: 2, status: "unserializable", elapsed_ms: 4, got_repr: "<object object>" },
      ],
      userStdout: "debug output",
      metadata: { userStdoutTruncated: true },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid truncation metadata", () => {
    const result = harnessResultSchema.safeParse({
      results: [{ index: 0, status: "error", elapsed_ms: 3, error: "ValueError" }],
      userStdout: "debug output",
      metadata: { userStdoutTruncated: "yes" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects legacy harness payloads that grade inside Python", () => {
    const result = harnessResultSchema.safeParse({
      results: [{ index: 0, passed: true, elapsed_ms: 12, got: null, expected: null }],
      userStdout: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects ok cases without a JSON actual output", () => {
    const result = harnessResultSchema.safeParse({
      results: [{ index: 0, status: "ok", elapsed_ms: 12, got_repr: "[0, 1]" }],
      userStdout: "",
    });

    expect(result.success).toBe(false);
  });
});
