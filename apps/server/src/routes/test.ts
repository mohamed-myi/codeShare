import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { globalCounters } from "../lib/rateLimitCounters.js";
import { roomManager } from "../models/RoomManager.js";
import { resetSocketIORateLimits } from "../ws/socketio.js";

const TEST_SECRET = process.env.TEST_ROUTE_SECRET ?? "";

function requireTestSecret(request: FastifyRequest, reply: FastifyReply, done: () => void): void {
  if (TEST_SECRET && request.headers["x-test-secret"] !== TEST_SECRET) {
    reply.status(403).send({ error: "Forbidden" });
    return;
  }
  done();
}

export async function testRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireTestSecret);

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
