import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";
import { SocketEvents, userJoinSchema } from "@codeshare/shared";
import type { UserJoinPayload } from "@codeshare/shared";
import type { Room } from "../models/Room.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
  destroyRoom(roomCode: string): void;
}

/**
 * Handles: user:join, disconnect
 * Manages slot assignment, reconnect token validation, grace periods.
 */
export function registerRoomHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
): void {
  socket.on(SocketEvents.USER_JOIN, (rawPayload: unknown) => {
    const parsed = userJoinSchema.safeParse(rawPayload);
    if (!parsed.success) {
      socket.emit("error", { message: "Invalid join payload." });
      return;
    }

    const { displayName, reconnectToken } = parsed.data as UserJoinPayload;
    const roomCode = socket.data.roomCode as string;
    const room = roomLookup.getRoom(roomCode);

    if (!room) {
      socket.emit("error", { message: "Room not found." });
      return;
    }

    // Reconnection attempt
    if (reconnectToken) {
      const existingUser = room.findByReconnectToken(reconnectToken);
      if (existingUser) {
        const reconnected = room.reconnectUser(existingUser.id, socket.id);
        if (reconnected) {
          socket.join(roomCode);

          socket.emit(SocketEvents.USER_JOINED, {
            userId: reconnected.id,
            displayName: reconnected.displayName,
            role: reconnected.role,
            mode: room.mode,
            reconnectToken: reconnected.reconnectToken,
          });

          socket.emit(SocketEvents.ROOM_SYNC, room.toSyncPayload());

          socket.to(roomCode).emit(SocketEvents.USER_JOINED, {
            userId: reconnected.id,
            displayName: reconnected.displayName,
            role: reconnected.role,
            mode: room.mode,
            reconnectToken: "",
          });

          logger.info({ roomCode, userId: reconnected.id }, "User reconnected");
          return;
        }
      }
      // Token invalid or user not found -- fall through to normal join
    }

    // Room full check
    if (room.isFull()) {
      socket.emit(SocketEvents.ROOM_FULL, {});
      socket.disconnect(true);
      return;
    }

    // Determine role
    let role: "peer" | "interviewer" | "candidate";
    if (room.mode === "interview") {
      role = room.users.length === 0 ? "interviewer" : "candidate";
    } else {
      role = "peer";
    }

    const user = room.addUser(displayName, role, socket.id);
    socket.join(roomCode);

    socket.emit(SocketEvents.USER_JOINED, {
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
      mode: room.mode,
      reconnectToken: user.reconnectToken,
    });

    socket.to(roomCode).emit(SocketEvents.USER_JOINED, {
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
      mode: room.mode,
      reconnectToken: "",
    });

    logger.info({ roomCode, userId: user.id, displayName, role }, "User joined room");
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode as string;
    if (!roomCode) return;

    const room = roomLookup.getRoom(roomCode);
    if (!room) return;

    const user = room.users.find((u) => u.socketId === socket.id);
    if (!user) return;

    user.connected = false;
    user.socketId = null;

    socket.to(roomCode).emit(SocketEvents.USER_LEFT, { userId: user.id });

    room.startGracePeriod(user.id, () => {
      room.removeUser(user.id);
      logger.info({ roomCode, userId: user.id }, "User removed after grace period");

      if (room.users.length === 0) {
        roomLookup.destroyRoom(roomCode);
        logger.info({ roomCode }, "Room destroyed (empty after grace period)");
      }
    });

    logger.info({ roomCode, userId: user.id }, "User disconnected, grace period started");
  });
}
