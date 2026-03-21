import { describe, expect, it } from "vitest";
import { roomCreateSchema } from "../validation.js";

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
