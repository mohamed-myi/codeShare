import type { FastifyInstance } from "fastify";
import { roomCreateSchema, type RoomInfoResponse } from "@codeshare/shared";
import { roomManager } from "../models/RoomManager.js";

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  app.post("/rooms", async (request, reply) => {
    const result = roomCreateSchema.safeParse(request.body);
    if (!result.success) {
      return reply
        .status(400)
        .send({ error: result.error.flatten().fieldErrors });
    }
    const room = roomManager.createRoom(result.data.mode);
    return reply.status(201).send({ roomCode: room.roomCode });
  });

  app.get<{ Params: { roomCode: string } }>(
    "/rooms/:roomCode",
    async (request) => {
      const room = roomManager.getRoom(request.params.roomCode);
      if (!room) {
        return { exists: false } satisfies RoomInfoResponse;
      }
      return {
        exists: true,
        mode: room.mode,
        userCount: room.connectedUserCount(),
        maxUsers: room.maxUsers,
      } satisfies RoomInfoResponse;
    },
  );
}
