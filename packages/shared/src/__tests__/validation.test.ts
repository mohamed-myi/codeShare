import { describe, expect, it } from "vitest";
import { roomCodeSchema, roomCreateSchema } from "../validation.js";

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
});

describe("roomCodeSchema", () => {
  it("accepts 3+3 base32 room codes", () => {
    expect(roomCodeSchema.safeParse("ab2-ef7").success).toBe(true);
  });

  it("rejects longer room codes", () => {
    expect(roomCodeSchema.safeParse("abcd-efgh").success).toBe(false);
  });
});
