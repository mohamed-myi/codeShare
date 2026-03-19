import type { Server } from "socket.io";
import type { Logger } from "pino";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import { registerRoomHandler } from "../handlers/roomHandler.js";
import { roomManager } from "../models/RoomManager.js";

/**
 * Configures the Socket.io server: connection middleware and event handlers.
 * The Server instance must already be created (attached or noServer mode).
 */
export function setupSocketIO(io: Server, logger: Logger): void {
  io.use((socket, next) => {
    const roomCode = socket.handshake.query.roomCode;
    if (!roomCode || typeof roomCode !== "string") {
      return next(new Error("Missing required roomCode query parameter"));
    }
    socket.data.roomCode = roomCode;
    next();
  });

  const authMiddleware = createAuthMiddleware(roomManager);

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, roomCode: socket.data.roomCode }, "Socket connected");

    socket.use(authMiddleware(socket));
    registerRoomHandler(io, socket, logger, roomManager);
  });
}
