import { SocketEvents } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import { handleDisconnect } from "./roomDisconnectHandler.js";
import {
  handleUserJoin,
  type RoomHandlerContext,
  type RoomHandlerDeps,
  type RoomLookup,
} from "./roomHandlerCore.js";

/**
 * Handles: user:join, disconnect
 * Manages slot assignment, reconnect token validation, grace periods.
 */
export function registerRoomHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  deps: RoomHandlerDeps,
): void {
  const context: RoomHandlerContext = { io, socket, logger, roomLookup, deps };

  socket.on(SocketEvents.USER_JOIN, async (rawPayload: unknown) => {
    await handleUserJoin(context, rawPayload);
  });

  socket.on("disconnect", () => {
    handleDisconnect(context);
  });
}
