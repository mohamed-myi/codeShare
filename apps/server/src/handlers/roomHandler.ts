import type {
  EventRejectedPayload,
  ProblemLoadedPayload,
  UserJoinPayload,
} from "@codeshare/shared";
import { SocketEvents, userJoinSchema } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import type { Room } from "../models/Room.js";
import { problemService } from "../services/ProblemService.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
  destroyRoom(roomCode: string): void;
}

/**
 * Handles: user:join, disconnect
 * Manages slot assignment, reconnect token validation, grace periods.
 */
export function registerRoomHandler(
  _io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  deps: {
    ipRateLimiter: IpRateLimiter;
    joinAttemptsPerHour: number;
  },
): void {
  async function emitRoomHydration(room: Room): Promise<void> {
    socket.emit(SocketEvents.ROOM_SYNC, room.toSyncPayload());

    if (!room.problemId) {
      return;
    }

    try {
      const detail = await problemService.getById(room.problemId);
      if (!detail) {
        logger.warn(
          { roomCode: room.roomCode, problemId: room.problemId },
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
        { err, roomCode: room.roomCode, problemId: room.problemId },
        "Failed to hydrate active problem during room join",
      );
    }
  }

  async function emitJoinedPayload(
    room: Room,
    user: {
      id: string;
      displayName: string;
      role: "peer" | "interviewer" | "candidate";
      reconnectToken: string;
    },
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

    await emitRoomHydration(room);
  }

  socket.on(SocketEvents.USER_JOIN, async (rawPayload: unknown) => {
    const parsed = userJoinSchema.safeParse(rawPayload);
    if (!parsed.success) {
      logger.warn({ socketId: socket.id }, "Rejected user join: invalid payload");
      socket.emit(SocketEvents.EVENT_REJECTED, {
        event: SocketEvents.USER_JOIN,
        reason: "Invalid join payload.",
      });
      return;
    }

    const { displayName, reconnectToken } = parsed.data as UserJoinPayload;
    const roomCode = normalizeRoomCode(socket.data.roomCode as string);
    const room = roomLookup.getRoom(roomCode);

    logger.debug(
      {
        socketId: socket.id,
        roomCode,
        displayName,
        reconnecting: Boolean(reconnectToken),
      },
      "Processing user join",
    );

    if (!room) {
      logger.warn({ socketId: socket.id, roomCode }, "Rejected user join: room not found");
      socket.emit(SocketEvents.EVENT_REJECTED, {
        event: SocketEvents.USER_JOIN,
        reason: "Room not found.",
      });
      return;
    }

    const existingSocketUser = room.findBySocketId(socket.id);
    if (existingSocketUser) {
      await emitJoinedPayload(room, existingSocketUser);
      logger.info(
        { roomCode, userId: existingSocketUser.id, socketId: socket.id },
        "Duplicate join ignored for existing socket",
      );
      return;
    }

    const clientIp = (socket.data.clientIp as string | undefined) ?? "unknown";
    const joinCheck = deps.ipRateLimiter.consume(
      "join-attempt",
      clientIp,
      deps.joinAttemptsPerHour,
      60 * 60 * 1000,
    );
    if (!joinCheck.allowed) {
      logger.warn(
        {
          socketId: socket.id,
          roomCode,
          clientIp,
          retryAfterSeconds: joinCheck.retryAfterSeconds,
        },
        "Rejected user join: rate limited",
      );
      const payload: EventRejectedPayload = {
        event: SocketEvents.USER_JOIN,
        reason: `Too many join attempts. Try again in ${joinCheck.retryAfterSeconds}s.`,
        retryAfterSeconds: joinCheck.retryAfterSeconds,
      };
      socket.emit(SocketEvents.EVENT_REJECTED, payload);
      return;
    }

    // Reconnection attempt
    if (reconnectToken) {
      const existingUser = room.findByReconnectToken(reconnectToken);
      if (existingUser) {
        const reconnected = room.reconnectUser(existingUser.id, socket.id);
        if (reconnected) {
          await emitJoinedPayload(room, reconnected);

          socket.to(room.roomCode).emit(SocketEvents.USER_JOINED, {
            userId: reconnected.id,
            displayName: reconnected.displayName,
            role: reconnected.role,
            mode: room.mode,
            reconnectToken: "",
            yjsToken: "",
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
    await emitJoinedPayload(room, user);

    socket.to(room.roomCode).emit(SocketEvents.USER_JOINED, {
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
      mode: room.mode,
      reconnectToken: "",
      yjsToken: "",
    });

    logger.info({ roomCode, userId: user.id, displayName, role }, "User joined room");
  });

  socket.on("disconnect", () => {
    const roomCode = normalizeRoomCode(socket.data.roomCode as string);
    if (!roomCode) return;

    const room = roomLookup.getRoom(roomCode);
    if (!room) return;

    const user = room.findBySocketId(socket.id);
    if (!user) return;

    user.connected = false;
    user.socketId = null;

    socket.to(room.roomCode).emit(SocketEvents.USER_LEFT, { userId: user.id });

    room.startGracePeriod(user.id, () => {
      const expiredUser = room.users.find((candidate) => candidate.id === user.id);
      if (!expiredUser || expiredUser.connected || expiredUser.socketId !== null) {
        return;
      }

      room.removeUser(user.id);
      logger.info({ roomCode, userId: user.id }, "User removed after grace period");

      if (room.users.length === 0) {
        const durationMs = Date.now() - room.createdAt.getTime();
        roomLookup.destroyRoom(room.roomCode);
        logger.info(
          { roomCode: room.roomCode, durationMs, submissionsUsed: room.submissionsUsed },
          "Room destroyed (empty after grace period)",
        );
      }
    });

    logger.info({ roomCode, userId: user.id }, "User disconnected, grace period started");
  });
}
