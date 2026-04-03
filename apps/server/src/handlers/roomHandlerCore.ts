import type {
  EventRejectedPayload,
  ProblemLoadedPayload,
  UserJoinPayload,
  UserRole,
} from "@codeshare/shared";
import { SocketEvents, userJoinSchema } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import { handlerLogContext } from "../lib/handlerContext.js";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { getClientIp } from "../lib/ipUtils.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import { validatePayloadOrReject } from "../lib/validation.js";
import type { Room } from "../models/Room.js";
import { problemService } from "../services/ProblemService.js";

export interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
  destroyRoom(roomCode: string): void;
}

export interface RoomHandlerDeps {
  ipRateLimiter: IpRateLimiter;
  joinAttemptsPerHour: number;
}

export interface RoomHandlerContext {
  io: Server;
  socket: Socket;
  logger: Logger;
  roomLookup: RoomLookup;
  deps: RoomHandlerDeps;
}

type JoinedRoomUser = ReturnType<Room["addUser"]>;

const JOIN_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const RECONNECT_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export async function handleUserJoin(
  context: RoomHandlerContext,
  rawPayload: unknown,
): Promise<void> {
  const parsed = validatePayloadOrReject(
    context.socket,
    context.logger,
    userJoinSchema,
    rawPayload,
    {
      eventType: "room_join",
      invalidMessage: "Invalid join payload.",
      onReject: (message) => emitJoinRejected(context.socket, message),
    },
  );
  if (!parsed) {
    return;
  }

  const roomCode = getSocketRoomCode(context.socket);
  const room = context.roomLookup.getRoom(roomCode);
  const { displayName, reconnectToken } = parsed as UserJoinPayload;

  context.logger.debug(
    {
      event: "room_join_processing",
      socket_id: context.socket.id,
      ...handlerLogContext(roomCode, context.socket),
      reconnecting: Boolean(reconnectToken),
    },
    "Processing user join",
  );

  if (!room) {
    rejectJoin(context, roomCode, "room_not_found", "Room not found.");
    return;
  }

  const existingSocketUser = room.findBySocketId(context.socket.id);
  if (existingSocketUser) {
    await emitJoinedPayload(context.socket, context.logger, room, existingSocketUser);
    context.logger.info(
      {
        event: "room_join_duplicate_ignored",
        ...handlerLogContext(roomCode, context.socket),
        user_id: existingSocketUser.id,
        socket_id: context.socket.id,
      },
      "Duplicate join ignored for existing socket",
    );
    return;
  }

  if (isJoinRateLimited(context, roomCode)) {
    return;
  }

  if (reconnectToken && (await tryReconnectUser(context, room, reconnectToken))) {
    return;
  }

  if (room.isFull()) {
    context.logger.warn(
      {
        event: "room_join_rejected",
        socket_id: context.socket.id,
        ...handlerLogContext(roomCode, context.socket),
        reason: "room_full",
      },
      "Rejected user join: room full",
    );
    context.socket.emit(SocketEvents.ROOM_FULL, {});
    context.socket.disconnect(true);
    return;
  }

  const role = determineRole(room);
  const user = room.addUser(displayName, role, context.socket.id);

  await emitJoinedPayload(context.socket, context.logger, room, user);
  emitPresenceBroadcast(context.socket, room, user);

  context.logger.info(
    {
      event: "room_user_joined",
      ...handlerLogContext(roomCode, context.socket),
      user_id: user.id,
      role,
    },
    "User joined room",
  );
}

function rejectJoin(
  context: RoomHandlerContext,
  roomCode: string | undefined,
  rejectionReason: string,
  clientReason: string,
): void {
  context.logger.warn(
    {
      event: "room_join_rejected",
      socket_id: context.socket.id,
      ...handlerLogContext(roomCode, context.socket),
      reason: rejectionReason,
    },
    `Rejected user join: ${rejectionReason.replaceAll("_", " ")}`,
  );
  emitJoinRejected(context.socket, clientReason);
}

function emitJoinRejected(socket: Socket, clientReason: string, retryAfterSeconds?: number): void {
  const payload: EventRejectedPayload = {
    event: SocketEvents.USER_JOIN,
    reason: clientReason,
    retryAfterSeconds,
  };
  socket.emit(SocketEvents.EVENT_REJECTED, payload);
}

function isJoinRateLimited(context: RoomHandlerContext, roomCode: string): boolean {
  const clientIp = getClientIp(context.socket);
  const joinCheck = context.deps.ipRateLimiter.consume(
    "join-attempt",
    clientIp,
    context.deps.joinAttemptsPerHour,
    JOIN_ATTEMPT_WINDOW_MS,
  );
  if (joinCheck.allowed) {
    return false;
  }

  context.logger.warn(
    {
      event: "room_join_rejected",
      socket_id: context.socket.id,
      ...handlerLogContext(roomCode, context.socket),
      client_ip: clientIp,
      retry_after_seconds: joinCheck.retryAfterSeconds,
      reason: "rate_limited",
    },
    "Rejected user join: rate limited",
  );
  emitJoinRejected(
    context.socket,
    `Too many join attempts. Try again in ${joinCheck.retryAfterSeconds}s.`,
    joinCheck.retryAfterSeconds,
  );
  return true;
}

async function tryReconnectUser(
  context: RoomHandlerContext,
  room: Room,
  reconnectToken: string,
): Promise<boolean> {
  const roomCode = room.roomCode;
  if (!RECONNECT_TOKEN_PATTERN.test(reconnectToken)) {
    context.logger.debug(
      {
        event: "room_reconnect_token_invalid",
        socket_id: context.socket.id,
        ...handlerLogContext(roomCode, context.socket),
      },
      "Invalid reconnect token format",
    );
    return false;
  }

  const existingUser = room.findByReconnectToken(reconnectToken);
  if (!existingUser) {
    return false;
  }

  const reconnectedUser = room.reconnectUser(existingUser.id, context.socket.id);
  if (!reconnectedUser) {
    return false;
  }

  await emitJoinedPayload(context.socket, context.logger, room, reconnectedUser);
  emitPresenceBroadcast(context.socket, room, reconnectedUser);

  context.logger.info(
    {
      event: "room_user_reconnected",
      ...handlerLogContext(roomCode, context.socket),
      user_id: reconnectedUser.id,
    },
    "User reconnected",
  );
  return true;
}

async function emitJoinedPayload(
  socket: Socket,
  logger: Logger,
  room: Room,
  user: JoinedRoomUser,
): Promise<void> {
  socket.join(room.roomCode);
  socket.emit(SocketEvents.USER_JOINED, {
    userId: user.id,
    displayName: user.displayName,
    role: user.role,
    mode: room.mode,
    reconnectToken: user.reconnectToken,
    yjsToken: room.yjsToken,
  });

  await emitRoomHydration(socket, logger, room);
}

async function emitRoomHydration(socket: Socket, logger: Logger, room: Room): Promise<void> {
  socket.emit(SocketEvents.ROOM_SYNC, room.toSyncPayload());
  if (!room.problemId) {
    return;
  }

  try {
    const detail = await problemService.getById(room.problemId);
    if (!detail) {
      logger.warn(
        {
          event: "room_hydration_problem_missing",
          ...handlerLogContext(room.roomCode, socket),
          problem_id: room.problemId,
        },
        "Active problem could not be loaded during room hydration",
      );
      return;
    }

    const payload: ProblemLoadedPayload = {
      problem: detail,
      visibleTestCases: detail.visibleTestCases,
      boilerplate: detail.boilerplate?.template ?? "",
      parameterNames: detail.boilerplate?.parameterNames ?? [],
    };
    socket.emit(SocketEvents.PROBLEM_LOADED, payload);
  } catch (err) {
    logger.error(
      {
        event: "room_hydration_failed",
        err,
        ...handlerLogContext(room.roomCode, socket),
        problem_id: room.problemId,
      },
      "Failed to hydrate active problem during room join",
    );
  }
}

function emitPresenceBroadcast(socket: Socket, room: Room, user: JoinedRoomUser): void {
  socket.to(room.roomCode).emit(SocketEvents.USER_JOINED, {
    userId: user.id,
    displayName: user.displayName,
    role: user.role,
    mode: room.mode,
    reconnectToken: "",
    yjsToken: "",
  });
}

function determineRole(room: Room): UserRole {
  if (room.mode !== "interview") {
    return "peer";
  }
  return room.users.length === 0 ? "interviewer" : "candidate";
}

function getSocketRoomCode(socket: Socket): string {
  return normalizeRoomCode((socket.data.roomCode as string | undefined) ?? "");
}
