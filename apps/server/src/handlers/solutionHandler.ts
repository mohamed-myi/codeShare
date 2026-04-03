import type { Problem } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import { emitMessageEvent } from "../lib/errorEmitter.js";
import { handlerLogContext } from "../lib/handlerContext.js";
import type { Room } from "../models/Room.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

export interface SolutionHandlerDeps {
  roomLookup: RoomLookup;
  findProblem: (problemId: string) => Promise<Problem | null>;
}

/**
 * Handles: solution:reveal (interview mode, interviewer only)
 * Fetches solution from DB and broadcasts to both users.
 * Auth middleware enforces interview mode + interviewer role.
 */
export function registerSolutionHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: SolutionHandlerDeps,
): void {
  socket.on(SocketEvents.SOLUTION_REVEAL, async () => {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room) return;

    try {
      if (room.mode !== "interview") {
        logger.info({
          event: "solution_reveal_rejected",
          ...handlerLogContext(roomCode, socket),
          reason: "not_interview_mode",
        });
        emitMessageEvent(
          { socket },
          SocketEvents.HINT_ERROR,
          "Solutions can only be revealed in interview mode.",
        );
        return;
      }

      if (!room.problemId) {
        logger.info({
          event: "solution_reveal_rejected",
          ...handlerLogContext(roomCode, socket),
          reason: "problem_not_selected",
        });
        emitMessageEvent({ socket }, SocketEvents.HINT_ERROR, "Select a problem first.");
        return;
      }

      const problem = await deps.findProblem(room.problemId);
      if (!problem) {
        logger.warn({
          event: "solution_reveal_rejected",
          ...handlerLogContext(roomCode, socket),
          problem_id: room.problemId,
          reason: "problem_not_found",
        });
        emitMessageEvent({ socket }, SocketEvents.HINT_ERROR, "Problem not found.");
        return;
      }

      if (!problem.solution) {
        logger.info({
          event: "solution_reveal_rejected",
          ...handlerLogContext(roomCode, socket),
          problem_id: room.problemId,
          reason: "solution_missing",
        });
        emitMessageEvent(
          { socket },
          SocketEvents.HINT_ERROR,
          "No solution available for this problem.",
        );
        return;
      }

      logger.info(
        {
          event: "solution_revealed",
          ...handlerLogContext(roomCode, socket),
          problem_id: room.problemId,
        },
        "Solution revealed",
      );

      io.to(roomCode).emit(SocketEvents.SOLUTION_REVEALED, {
        solution: problem.solution,
      });
    } catch (err) {
      logger.error(
        {
          event: "solution_reveal_failed",
          err,
          ...handlerLogContext(roomCode, socket),
          problem_id: room.problemId,
        },
        "Failed to reveal solution",
      );
      emitMessageEvent(
        { socket },
        SocketEvents.HINT_ERROR,
        "Failed to reveal solution. Please try again.",
      );
    }
  });
}
