import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";
import { SocketEvents } from "@codeshare/shared";
import type { Problem } from "@codeshare/shared";
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
        socket.emit(SocketEvents.HINT_ERROR, {
          message: "Solutions can only be revealed in interview mode.",
        });
        return;
      }

      if (!room.problemId) {
        socket.emit(SocketEvents.HINT_ERROR, {
          message: "Select a problem first.",
        });
        return;
      }

      const problem = await deps.findProblem(room.problemId);
      if (!problem) {
        socket.emit(SocketEvents.HINT_ERROR, {
          message: "Problem not found.",
        });
        return;
      }

      if (!problem.solution) {
        socket.emit(SocketEvents.HINT_ERROR, {
          message: "No solution available for this problem.",
        });
        return;
      }

      logger.info(
        { roomCode, problemId: room.problemId },
        "Solution revealed",
      );

      io.to(roomCode).emit(SocketEvents.SOLUTION_REVEALED, {
        solution: problem.solution,
      });
    } catch (err) {
      logger.error({ err, roomCode, problemId: room.problemId }, "Failed to reveal solution");
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "Failed to reveal solution. Please try again.",
      });
    }
  });
}
