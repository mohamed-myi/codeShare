import { type RoomInfoResponse, roomCreateSchema } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { roomCodeLogFields } from "../lib/logger.js";
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
        request.log.warn(
          {
            event: "room_create_rejected",
            reason: "max_active_rooms_reached",
            max_active_rooms: opts.config.MAX_ACTIVE_ROOMS,
            mode: result.data.mode,
            client_ip: request.ip,
          },
          "Room creation rejected",
        );
        return reply.status(503).send({ error: "Server is at capacity. Please try again later." });
      }
      request.log.info(
        {
          event: "room_created",
          ...roomCodeLogFields(room.roomCode, opts.config.NODE_ENV),
          mode: room.mode,
          client_ip: request.ip,
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
      request.log.info({
        event: "room_lookup_completed",
        ...roomCodeLogFields(request.params.roomCode, opts.config.NODE_ENV),
        exists: Boolean(room),
      });
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
