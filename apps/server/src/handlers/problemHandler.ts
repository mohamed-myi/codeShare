import type { ProblemDetail, ProblemLoadedPayload } from "@codeshare/shared";
import {
  HINT_LIMIT_BY_DIFFICULTY,
  problemImportSchema,
  problemSelectSchema,
  SocketEvents,
} from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import { dependencyErrorLogFields } from "../lib/dependencyError.js";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { requestIdLogField, roomCodeLogFields } from "../lib/logger.js";
import { globalCounters } from "../lib/rateLimitCounters.js";
import type { Room } from "../models/Room.js";
import { problemService } from "../services/ProblemService.js";
import { scraperService } from "../services/ScraperService.js";
import type { GenerationContext } from "../services/TestCaseGeneratorService.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

interface ProblemHandlerDeps {
  ipRateLimiter: IpRateLimiter;
  importsPerHour: number;
  enableProblemImport: boolean;
  importsDailyLimit: number;
  importProblem?: (url: string) => Promise<{ id: string; sourceUrl: string | null }>;
  generateTestCases?: (ctx: GenerationContext) => Promise<void>;
}

interface ProblemSession {
  io: Server;
  socket: Socket;
  logger: Logger;
  room: Room;
  roomCode: string;
  getDoc: (roomCode: string) => Y.Doc | undefined;
  deps: ProblemHandlerDeps;
}

interface ProblemImportRejection {
  reason: string;
  message: string;
  retryAfterSeconds?: number;
  extra?: Record<string, unknown>;
  level?: "info" | "warn";
}

function createSession(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  getDoc: (roomCode: string) => Y.Doc | undefined,
  deps: ProblemHandlerDeps,
): ProblemSession | null {
  const roomCode = socket.data.roomCode as string;
  const room = roomLookup.getRoom(roomCode);

  if (!room) {
    return null;
  }

  return { io, socket, logger, room, roomCode, getDoc, deps };
}

function emitProblemLoadError(socket: Socket, message: string): void {
  socket.emit(SocketEvents.PROBLEM_ERROR, { message });
}

function emitImportStatusToSender(
  socket: Socket,
  payload: { status: "failed"; message: string; retryAfterSeconds?: number },
): void {
  socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, payload);
}

function emitImportStatusToRoom(
  session: ProblemSession,
  payload: { status: "scraping" | "saved" | "failed"; message?: string },
): void {
  session.io.to(session.roomCode).emit(SocketEvents.PROBLEM_IMPORT_STATUS, payload);
}

function logProblemImportRejection(
  session: ProblemSession,
  rejection: ProblemImportRejection,
): void {
  const payload = {
    event: "problem_import_rejected",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
    ...rejection.extra,
    reason: rejection.reason,
  };

  if (rejection.level === "warn") {
    session.logger.warn(payload);
    return;
  }

  session.logger.info(payload);
}

function loadProblemIntoRoom(session: ProblemSession, detail: ProblemDetail): void {
  session.room.switchProblem(detail.id, HINT_LIMIT_BY_DIFFICULTY[detail.difficulty]);

  const boilerplateText = detail.boilerplate?.template ?? "";
  const doc = session.getDoc(session.roomCode);
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

  session.io.to(session.roomCode).emit(SocketEvents.PROBLEM_LOADED, payload);
}

async function handleProblemSelect(session: ProblemSession, data: unknown): Promise<void> {
  const parsed = problemSelectSchema.safeParse(data);
  if (!parsed.success) {
    session.logger.warn({
      event: "problem_select_rejected",
      ...roomCodeLogFields(session.roomCode),
      ...requestIdLogField(session.socket),
      reason: "invalid_payload",
    });
    emitProblemLoadError(session.socket, "Invalid problem selection payload.");
    return;
  }

  const { problemId } = parsed.data;

  try {
    const detail = await problemService.getById(problemId);
    if (!detail) {
      emitProblemLoadError(session.socket, "Problem not found.");
      return;
    }

    loadProblemIntoRoom(session, detail);
    session.logger.info(
      {
        event: "problem_loaded",
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        problem_id: problemId,
      },
      "Problem loaded for room",
    );
  } catch (err) {
    session.logger.error(
      {
        event: "problem_load_failed",
        err,
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        problem_id: problemId,
      },
      "Failed to load problem",
    );
    emitProblemLoadError(session.socket, "Failed to load problem. Please try again.");
  }
}

function getClientIp(socket: Socket): string {
  return (socket.data.clientIp as string | undefined) ?? "unknown";
}

function validateProblemImport(
  session: ProblemSession,
  data: unknown,
): { leetcodeUrl: string } | null {
  if (!session.deps.enableProblemImport) {
    logProblemImportRejection(session, {
      reason: "feature_disabled",
      message: "Problem import is disabled.",
    });
    emitImportStatusToSender(session.socket, {
      status: "failed",
      message: "Problem import is disabled.",
    });
    return null;
  }

  const parsed = problemImportSchema.safeParse(data);
  if (!parsed.success) {
    logProblemImportRejection(session, {
      reason: "invalid_payload",
      message: "Invalid problem import payload.",
      level: "warn",
    });
    emitImportStatusToSender(session.socket, {
      status: "failed",
      message: "Invalid problem import payload.",
    });
    return null;
  }

  const clientIp = getClientIp(session.socket);
  const importCheck = session.deps.ipRateLimiter.consume(
    "problem-import",
    clientIp,
    session.deps.importsPerHour,
    60 * 60 * 1000,
  );
  if (!importCheck.allowed) {
    logProblemImportRejection(session, {
      reason: "rate_limited",
      message: `Too many import attempts. Try again in ${importCheck.retryAfterSeconds}s.`,
      retryAfterSeconds: importCheck.retryAfterSeconds,
      extra: {
        client_ip: clientIp,
        retry_after_seconds: importCheck.retryAfterSeconds,
      },
      level: "warn",
    });
    emitImportStatusToSender(session.socket, {
      status: "failed",
      message: `Too many import attempts. Try again in ${importCheck.retryAfterSeconds}s.`,
      retryAfterSeconds: importCheck.retryAfterSeconds,
    });
    return null;
  }

  if (session.room.importsUsed >= session.room.importLimit) {
    logProblemImportRejection(session, {
      reason: "room_import_limit_reached",
      message: `Session import limit reached (${session.room.importLimit}/${session.room.importLimit}).`,
      extra: {
        import_limit: session.room.importLimit,
      },
    });
    emitImportStatusToSender(session.socket, {
      status: "failed",
      message: `Session import limit reached (${session.room.importLimit}/${session.room.importLimit}).`,
    });
    return null;
  }

  if (!globalCounters.canImport(session.deps.importsDailyLimit)) {
    logProblemImportRejection(session, {
      reason: "daily_import_limit_reached",
      message: "Daily import limit reached. Please try again tomorrow.",
      extra: {
        daily_limit: session.deps.importsDailyLimit,
      },
      level: "warn",
    });
    emitImportStatusToSender(session.socket, {
      status: "failed",
      message: "Daily import limit reached. Please try again tomorrow.",
    });
    return null;
  }

  return parsed.data;
}

function startBackgroundTestCaseGeneration(session: ProblemSession, detail: ProblemDetail): void {
  if (!session.deps.generateTestCases || !detail.boilerplate) {
    return;
  }

  session.deps
    .generateTestCases({
      problemId: detail.id,
      title: detail.title,
      description: detail.description,
      constraints: detail.constraints,
      parameterNames: detail.boilerplate.parameterNames,
      methodName: detail.boilerplate.methodName,
      visibleTestCases: detail.visibleTestCases.map((testCase) => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
      })),
    })
    .catch((err) => {
      session.logger.error(
        {
          event: "test_case_generation_failed",
          err,
          problem_id: detail.id,
        },
        "Background test case generation failed",
      );
    });
}

async function handleProblemImport(session: ProblemSession, data: unknown): Promise<void> {
  const parsed = validateProblemImport(session, data);
  if (!parsed) {
    return;
  }

  emitImportStatusToRoom(session, { status: "scraping" });

  const importStart = Date.now();
  session.logger.info(
    {
      event: "problem_import_started",
      ...roomCodeLogFields(session.roomCode),
      ...requestIdLogField(session.socket),
      source_url: parsed.leetcodeUrl,
    },
    "Problem import started",
  );

  try {
    const importedProblem = await (session.deps.importProblem
      ? session.deps.importProblem(parsed.leetcodeUrl)
      : scraperService.importFromUrl(parsed.leetcodeUrl));
    const detail = await problemService.getById(importedProblem.id);

    if (!detail) {
      throw new Error("Imported problem could not be loaded.");
    }

    loadProblemIntoRoom(session, detail);
    session.room.importsUsed += 1;
    globalCounters.recordImport();
    emitImportStatusToRoom(session, { status: "saved" });

    session.logger.info(
      {
        event: "problem_import_completed",
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        problem_id: importedProblem.id,
        source_url: importedProblem.sourceUrl,
        duration_ms: Date.now() - importStart,
      },
      "Problem imported for room",
    );

    startBackgroundTestCaseGeneration(session, detail);
  } catch (err) {
    session.logger.error(
      {
        event: "problem_import_failed",
        err,
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        ...dependencyErrorLogFields(err),
      },
      "Failed to import problem",
    );
    emitImportStatusToRoom(session, {
      status: "failed",
      message: err instanceof Error ? err.message : "Failed to import problem.",
    });
  }
}

export function registerProblemHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  getDoc: (roomCode: string) => Y.Doc | undefined,
  deps: ProblemHandlerDeps,
): void {
  socket.on(SocketEvents.PROBLEM_SELECT, async (data: unknown) => {
    const session = createSession(io, socket, logger, roomLookup, getDoc, deps);
    if (!session) {
      return;
    }

    await handleProblemSelect(session, data);
  });

  socket.on(SocketEvents.PROBLEM_IMPORT, async (data: unknown) => {
    const session = createSession(io, socket, logger, roomLookup, getDoc, deps);
    if (!session) {
      return;
    }

    await handleProblemImport(session, data);
  });
}
