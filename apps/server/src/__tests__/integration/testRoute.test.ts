import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { globalCounters } from "../../lib/rateLimitCounters.js";
import { roomManager } from "../../models/RoomManager.js";
import { testRoutes } from "../../routes/test.js";

const mockProblemRepository = vi.hoisted(() => ({
  softDeleteE2eImportedProblems: vi.fn(),
}));

const mockResetSocketIORateLimits = vi.hoisted(() => vi.fn());

vi.mock("@codeshare/db", () => ({
  problemRepository: mockProblemRepository,
}));

vi.mock("../../ws/socketio.js", () => ({
  resetSocketIORateLimits: mockResetSocketIORateLimits,
}));

describe("POST /api/test/reset", () => {
  afterEach(async () => {
    roomManager.resetRooms();
    globalCounters.reset();
    mockProblemRepository.softDeleteE2eImportedProblems.mockReset();
    mockResetSocketIORateLimits.mockReset();
  });

  it("resets runtime state and cleans persisted E2E imports", async () => {
    mockProblemRepository.softDeleteE2eImportedProblems.mockResolvedValue({
      softDeletedProblemCount: 3,
    });

    const room = roomManager.createRoom("collaboration");
    globalCounters.recordImport();

    const app = Fastify();
    await app.register(testRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/test/reset",
    });

    expect(response.statusCode).toBe(200);
    expect(mockProblemRepository.softDeleteE2eImportedProblems).toHaveBeenCalledTimes(1);
    expect(mockResetSocketIORateLimits).toHaveBeenCalledTimes(1);
    expect(roomManager.getRoom(room.roomCode)).toBeUndefined();
    expect(globalCounters.canImport(1)).toBe(true);
    expect(response.json()).toEqual({
      ok: true,
      roomCount: 0,
      e2eImportCleanup: {
        softDeletedProblemCount: 3,
      },
    });

    await app.close();
  });
});
