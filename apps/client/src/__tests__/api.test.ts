import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { checkRoom, createRoom } from "../lib/api.js";
import { server } from "./mocks/server.js";

describe("createRoom", () => {
  it("POST /api/rooms and returns roomCode", async () => {
    const result = await createRoom("collaboration", "Alice");
    expect(result.roomCode).toBe("abc-xyz");
  });

  it("throws on non-OK response", async () => {
    server.use(
      http.post("*/api/rooms", () => {
        return new HttpResponse(null, { status: 400 });
      }),
    );

    await expect(createRoom("collaboration", "Alice")).rejects.toThrow(
      "Failed to create room: 400",
    );
  });
});

describe("checkRoom", () => {
  it("GET /api/rooms/:code and returns RoomInfoResponse", async () => {
    const result = await checkRoom("abc-xyz");

    expect(result.exists).toBe(true);
    expect(result.mode).toBe("collaboration");
    expect(result.userCount).toBe(1);
    expect(result.maxUsers).toBe(2);
  });

  it("returns { exists: false } for non-existent room", async () => {
    server.use(
      http.get("*/api/rooms/:roomCode", () => {
        return HttpResponse.json({ exists: false });
      }),
    );

    const result = await checkRoom("zzz-zzz");
    expect(result.exists).toBe(false);
  });
});
