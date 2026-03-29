import { SocketEvents } from "@codeshare/shared";
import { requestIdLogField, roomCodeLogFields } from "../lib/logger.js";
import type { Room } from "../models/Room.js";
import type { RoomHandlerContext } from "./roomHandlerCore.js";

export function handleDisconnect(context: RoomHandlerContext): void {
  const roomCode = context.socket.data.roomCode as string | undefined;
  if (!roomCode) {
    return;
  }

  const room = context.roomLookup.getRoom(roomCode);
  if (!room) {
    return;
  }

  const user = room.findBySocketId(context.socket.id);
  if (!user) {
    return;
  }

  user.connected = false;
  user.socketId = null;

  context.socket.to(room.roomCode).emit(SocketEvents.USER_LEFT, { userId: user.id });
  room.startGracePeriod(user.id, () => {
    removeDisconnectedUser(context, room, user.id);
  });

  context.logger.info(
    {
      event: "room_user_disconnected",
      ...roomCodeLogFields(room.roomCode),
      ...requestIdLogField(context.socket),
      user_id: user.id,
    },
    "User disconnected, grace period started",
  );
}

function removeDisconnectedUser(context: RoomHandlerContext, room: Room, userId: string): void {
  const expiredUser = room.users.find((candidate) => candidate.id === userId);
  if (!expiredUser || expiredUser.connected || expiredUser.socketId !== null) {
    return;
  }

  room.removeUser(userId);
  context.logger.info(
    {
      event: "room_user_removed_after_grace_period",
      ...roomCodeLogFields(room.roomCode),
      ...requestIdLogField(context.socket),
      user_id: userId,
    },
    "User removed after grace period",
  );

  if (room.users.length > 0) {
    const newToken = room.rotateYjsToken();
    context.io.to(room.roomCode).emit(SocketEvents.YJS_TOKEN_ROTATED, { yjsToken: newToken });
    context.logger.info(
      {
        event: "yjs_token_rotated",
        ...roomCodeLogFields(room.roomCode),
        ...requestIdLogField(context.socket),
        reason: "user_removed",
      },
      "Yjs token rotated after user removal",
    );
    return;
  }

  const durationMs = Date.now() - room.createdAt.getTime();
  context.roomLookup.destroyRoom(room.roomCode);
  context.logger.info(
    {
      event: "room_destroyed",
      ...roomCodeLogFields(room.roomCode),
      ...requestIdLogField(context.socket),
      duration_ms: durationMs,
      submissions_used: room.submissionsUsed,
    },
    "Room destroyed (empty after grace period)",
  );
}
