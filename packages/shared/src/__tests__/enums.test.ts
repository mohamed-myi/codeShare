import { describe, expect, it } from "vitest";
import { Difficulty, HINT_LIMIT_BY_DIFFICULTY, RoomMode } from "../index.js";

describe("enums", () => {
  it("defines room modes", () => {
    expect(RoomMode.COLLABORATION).toBe("collaboration");
    expect(RoomMode.INTERVIEW).toBe("interview");
  });
});

describe("constants", () => {
  it("maps difficulty to hint limits", () => {
    expect(HINT_LIMIT_BY_DIFFICULTY[Difficulty.EASY]).toBe(1);
    expect(HINT_LIMIT_BY_DIFFICULTY[Difficulty.MEDIUM]).toBe(2);
    expect(HINT_LIMIT_BY_DIFFICULTY[Difficulty.HARD]).toBe(3);
  });
});
