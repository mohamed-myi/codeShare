import { type RoomInfoResponse, roomCreateSchema } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type { Room } from "../models/Room.js";
import { roomManager } from "../models/RoomManager.js";

export async function roomRoutes(app: FastifyInstance, opts: { config: Config }): Promise<void> {
  app.post(
    "/rooms",
    {
      config: {
        rateLimit: {
          max: opts.config.RATE_LIMIT_ROOM_CREATE,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      const result = roomCreateSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.flatten().fieldErrors });
      }
      let room: Room;
      try {
        room = roomManager.createRoom(result.data.mode);
      } catch {
        return reply.status(503).send({ error: "Server is at capacity. Please try again later." });
      }
      app.log.info(
        {
          roomCode: room.roomCode,
          mode: room.mode,
          clientIp: request.ip,
          displayName: result.data.displayName,
        },
        "Room created",
      );
      return reply.status(201).send({ roomCode: room.roomCode });
    },
  );

  app.get<{ Params: { roomCode: string } }>(
    "/rooms/:roomCode",
    {
      config: {
        rateLimit: {
          max: opts.config.RATE_LIMIT_ROOM_LOOKUP,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const room = roomManager.getRoom(request.params.roomCode);
      if (!room) {
        return { exists: false } satisfies RoomInfoResponse;
      }
      return {
        exists: true,
        mode: room.mode,
        userCount: room.occupiedUserCount(),
        maxUsers: room.maxUsers,
      } satisfies RoomInfoResponse;
    },
  );
}
