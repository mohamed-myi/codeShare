import type { FastifyInstance } from "fastify";
import { globalCounters } from "../lib/rateLimitCounters.js";
import { roomManager } from "../models/RoomManager.js";
import { resetSocketIORateLimits } from "../ws/socketio.js";

export async function testRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/test/reset", async () => {
    roomManager.resetRooms();
    globalCounters.reset();
    resetSocketIORateLimits();

    return {
      ok: true,
      roomCount: roomManager.getRoomCount(),
    };
  });

  app.post("/api/test/gc", async () => {
    if (typeof globalThis.gc === "function") {
      globalThis.gc();
      return { ok: true, gcTriggered: true };
    }
    return { ok: false, gcTriggered: false, reason: "gc not exposed (start with --expose-gc)" };
  });
}
