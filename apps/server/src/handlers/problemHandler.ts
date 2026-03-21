import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";
import type * as Y from "yjs";
import {
  GLOBAL_LIMITS,
  HINT_LIMIT_BY_DIFFICULTY,
  ROOM_LIMITS,
  SocketEvents,
  problemImportSchema,
  problemSelectSchema,
} from "@codeshare/shared";
import type { ProblemDetail, ProblemLoadedPayload } from "@codeshare/shared";
import { problemService } from "../services/ProblemService.js";
import { scraperService } from "../services/ScraperService.js";
import type { Room } from "../models/Room.js";
import { globalCounters } from "../lib/rateLimitCounters.js";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

export function registerProblemHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  getDoc: (roomCode: string) => Y.Doc | undefined,
  deps: {
    ipRateLimiter: IpRateLimiter;
    importsPerHour: number;
    enableProblemImport: boolean;
  },
): void {
  async function loadProblemIntoRoom(
    room: Room,
    roomCode: string,
    detail: ProblemDetail,
  ): Promise<void> {
    room.switchProblem(detail.id, HINT_LIMIT_BY_DIFFICULTY[detail.difficulty]);

    const boilerplateText = detail.boilerplate?.template ?? "";
    const doc = getDoc(roomCode);
    if (doc) {
      const ytext = doc.getText("monaco");
      doc.transact(() => {
        ytext.delete(0, ytext.length);
        if (boilerplateText) {
          ytext.insert(0, boilerplateText);
        }
      });
    }

    const payload: ProblemLoadedPayload = {
      problem: detail,
      visibleTestCases: detail.visibleTestCases,
      boilerplate: boilerplateText,
      parameterNames: detail.boilerplate?.parameterNames ?? [],
    };

    io.to(roomCode).emit(SocketEvents.PROBLEM_LOADED, payload);
  }

  socket.on(SocketEvents.PROBLEM_SELECT, async (data: unknown) => {
    const roomCode = socket.data.roomCode as string;
    const room = roomLookup.getRoom(roomCode);
    if (!room) return;

    const parsed = problemSelectSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(SocketEvents.PROBLEM_ERROR, {
        message: "Invalid problem selection payload.",
      });
      return;
    }

    const { problemId } = parsed.data;

    try {
      const detail = await problemService.getById(problemId);
      if (!detail) {
        socket.emit(SocketEvents.PROBLEM_ERROR, {
          message: "Problem not found.",
        });
        return;
      }

      await loadProblemIntoRoom(room, roomCode, detail);

      logger.info(
        { roomCode, problemId, title: detail.title },
        "Problem loaded for room",
      );
    } catch (err) {
      logger.error({ err, roomCode, problemId }, "Failed to load problem");
      socket.emit(SocketEvents.PROBLEM_ERROR, {
        message: "Failed to load problem. Please try again.",
      });
    }
  });

  socket.on(SocketEvents.PROBLEM_IMPORT, async (data: unknown) => {
    const roomCode = socket.data.roomCode as string;
    const room = roomLookup.getRoom(roomCode);
    if (!room) return;

    if (!deps.enableProblemImport) {
      socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message: "Problem import is disabled.",
      });
      return;
    }

    const parsed = problemImportSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message: "Invalid problem import payload.",
      });
      return;
    }

    const clientIp = (socket.data.clientIp as string | undefined) ?? "unknown";
    const importCheck = deps.ipRateLimiter.consume(
      "problem-import",
      clientIp,
      deps.importsPerHour,
      60 * 60 * 1000,
    );
    if (!importCheck.allowed) {
      socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message: `Too many import attempts. Try again in ${importCheck.retryAfterSeconds}s.`,
        retryAfterSeconds: importCheck.retryAfterSeconds,
      });
      return;
    }

    if (room.importsUsed >= ROOM_LIMITS.MAX_IMPORTS) {
      socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message: `Session import limit reached (${ROOM_LIMITS.MAX_IMPORTS}/${ROOM_LIMITS.MAX_IMPORTS}).`,
      });
      return;
    }

    if (!globalCounters.canImport(GLOBAL_LIMITS.IMPORTS_DAILY)) {
      socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message: "Daily import limit reached. Please try again tomorrow.",
      });
      return;
    }

    io.to(roomCode).emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
      status: "scraping",
    });

    try {
      const importedProblem = await scraperService.importFromUrl(parsed.data.leetcodeUrl);
      const detail = await problemService.getById(importedProblem.id);

      if (!detail) {
        throw new Error("Imported problem could not be loaded.");
      }

      await loadProblemIntoRoom(room, roomCode, detail);

      room.importsUsed += 1;
      globalCounters.recordImport();

      io.to(roomCode).emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "saved",
      });

      logger.info(
        {
          roomCode,
          problemId: importedProblem.id,
          sourceUrl: importedProblem.sourceUrl,
        },
        "Problem imported for room",
      );
    } catch (err) {
      logger.error({ err, roomCode }, "Failed to import problem");
      io.to(roomCode).emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
        status: "failed",
        message:
          err instanceof Error ? err.message : "Failed to import problem.",
      });
    }
  });
}
