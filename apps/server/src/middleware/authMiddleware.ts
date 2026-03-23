import { SocketEvents } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Socket } from "socket.io";
import type { Room } from "../models/Room.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

// Events that bypass membership check (pre-join)
const BYPASS_EVENTS = new Set<string>([SocketEvents.USER_JOIN]);

// Events that only interviewers can trigger
const INTERVIEWER_ONLY_EVENTS = new Set<string>([
  SocketEvents.PROBLEM_SELECT,
  SocketEvents.PROBLEM_IMPORT,
  SocketEvents.SOLUTION_REVEAL,
]);

// Events blocked in interview mode entirely
const BLOCKED_IN_INTERVIEW = new Set<string>([SocketEvents.HINT_REQUEST]);

// Events that require no execution in progress
const REQUIRES_NO_EXECUTION = new Set<string>([SocketEvents.CODE_RUN, SocketEvents.CODE_SUBMIT]);

const REQUIRES_SWITCHABLE_PROBLEM = new Set<string>([
  SocketEvents.PROBLEM_SELECT,
  SocketEvents.PROBLEM_IMPORT,
]);

const HINT_RESPONSE_EVENTS = new Set<string>([SocketEvents.HINT_APPROVE, SocketEvents.HINT_DENY]);

/**
 * Creates a per-event middleware factory.
 * Usage: socket.use(createAuthMiddleware(roomManager)(socket))
 */
export function createAuthMiddleware(roomLookup: RoomLookup, logger?: Logger) {
  return (socket: Socket) => {
    return (event: [string, ...unknown[]], next: (err?: Error) => void): void => {
      const eventName = event[0];

      if (BYPASS_EVENTS.has(eventName)) {
        next();
        return;
      }

      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) {
        logger?.warn({ socketId: socket.id, eventName }, "Auth middleware: missing roomCode");
        next(new Error("silent"));
        return;
      }

      const room = roomLookup.getRoom(roomCode);
      if (!room) {
        logger?.warn(
          { socketId: socket.id, eventName, roomCode },
          "Auth middleware: room not found",
        );
        next(new Error("silent"));
        return;
      }

      const user = room.users.find((u) => u.socketId === socket.id);
      if (!user) {
        logger?.warn(
          { socketId: socket.id, eventName, roomCode },
          "Auth middleware: user not in room",
        );
        next(new Error("silent"));
        return;
      }

      // Role-based checks for interview mode
      if (eventName === SocketEvents.SOLUTION_REVEAL && room.mode !== "interview") {
        logger?.info(
          { socketId: socket.id, eventName, roomCode },
          "Auth middleware: solution reveal outside interview mode",
        );
        socket.emit(SocketEvents.EVENT_REJECTED, {
          event: eventName,
          reason: "Solutions can only be revealed in interview mode.",
        });
        return;
      }

      if (room.mode === "interview") {
        if (INTERVIEWER_ONLY_EVENTS.has(eventName) && user.role !== "interviewer") {
          logger?.info(
            { socketId: socket.id, eventName, roomCode, userId: user.id, role: user.role },
            "Auth middleware: interviewer-only event rejected",
          );
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: "Only the interviewer can perform this action.",
          });
          return;
        }

        if (BLOCKED_IN_INTERVIEW.has(eventName)) {
          logger?.info(
            { socketId: socket.id, eventName, roomCode },
            "Auth middleware: blocked in interview mode",
          );
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: "Hints are not available in interview mode.",
          });
          return;
        }
      }

      // State-based checks
      if (REQUIRES_NO_EXECUTION.has(eventName)) {
        const check = room.canExecute();
        if (!check.allowed) {
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: check.reason as string,
          });
          return;
        }
      }

      if (REQUIRES_SWITCHABLE_PROBLEM.has(eventName)) {
        const check = room.canSwitchProblem();
        if (!check.allowed) {
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: check.reason as string,
          });
          return;
        }
      }

      if (HINT_RESPONSE_EVENTS.has(eventName)) {
        if (!room.pendingHintRequest) {
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: "No hint request is pending.",
          });
          return;
        }

        if (room.pendingHintRequest.requestedBy === user.id) {
          socket.emit(SocketEvents.EVENT_REJECTED, {
            event: eventName,
            reason: "Only the other participant can respond to a hint request.",
          });
          return;
        }
      }

      next();
    };
  };
}
