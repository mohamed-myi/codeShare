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
  it("accepts stronger 4+4 base32 room codes", () => {
    expect(roomCodeSchema.safeParse("ab2d-ef7h").success).toBe(true);
  });

  it("rejects shorter legacy room codes", () => {
    expect(roomCodeSchema.safeParse("abc-xyz").success).toBe(false);
  });
});
