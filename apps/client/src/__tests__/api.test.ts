import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoom, checkRoom } from "../lib/api.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("createRoom", () => {
  it("POST /api/rooms with mode and returns roomCode", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ roomCode: "abc-xyz" }),
    });

    const result = await createRoom("collaboration");

    expect(result.roomCode).toBe("abc-xyz");
    expect(fetchMock).toHaveBeenCalledWith("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "collaboration" }),
    });
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(createRoom("collaboration")).rejects.toThrow(
      "Failed to create room: 400",
    );
  });
});

describe("checkRoom", () => {
  it("GET /api/rooms/:code and returns RoomInfoResponse", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          exists: true,
          mode: "collaboration",
          userCount: 1,
          maxUsers: 2,
        }),
    });

    const result = await checkRoom("abc-xyz");

    expect(result.exists).toBe(true);
    expect(result.mode).toBe("collaboration");
    expect(result.userCount).toBe(1);
    expect(result.maxUsers).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/rooms/abc-xyz");
  });

  it("returns { exists: false } for non-existent room", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ exists: false }),
    });

    const result = await checkRoom("zzz-zzz");
    expect(result.exists).toBe(false);
  });
});
