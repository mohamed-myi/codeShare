import type { Server, Socket } from "socket.io";
import type { Logger } from "pino";
import type * as Y from "yjs";
import type { Hint } from "@codeshare/shared";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import { registerRoomHandler } from "../handlers/roomHandler.js";
import { registerProblemHandler } from "../handlers/problemHandler.js";
import { registerTestcaseHandler } from "../handlers/testcaseHandler.js";
import { registerExecutionHandler } from "../handlers/executionHandler.js";
import { registerHintHandler } from "../handlers/hintHandler.js";
import { registerSolutionHandler } from "../handlers/solutionHandler.js";
import { roomManager } from "../models/RoomManager.js";
import {
  boilerplateRepository,
  testCaseRepository,
  problemRepository,
  hintRepository,
} from "@codeshare/db";
import { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import {
  extractClientIp,
  isOriginAllowed,
} from "../lib/networkSecurity.js";

interface Judge0Client {
  submit(source: string, timeLimitMs: number): Promise<{
    stdout: string | null;
    stderr: string | null;
    status: { id: number; description: string };
    time: string | null;
    memory: number | null;
  }>;
}

export interface SocketIODeps {
  getDoc?: (roomCode: string) => Y.Doc | undefined;
  judge0Client?: Judge0Client;
  dailyLimit?: number;
  groqClient?: {
    streamCompletion(
      messages: Array<{ role: "system" | "user"; content: string }>,
    ): AsyncGenerator<string>;
  };
  findStoredHint?: (problemId: string, hintsUsed: number) => Promise<Hint | null>;
  rateLimits?: {
    wsConnectionsPerMinute?: number;
    joinAttemptsPerHour?: number;
    importsPerHour?: number;
  };
  ipRateLimiter?: IpRateLimiter;
  allowedOrigins?: string[];
  trustedProxyIps?: string[];
  maxCodeBytes?: number;
  enableProblemImport?: boolean;
  enableLLMHintFallback?: boolean;
  enableImportedProblemHints?: boolean;
  maxLLMPromptChars?: number;
  maxLLMHintChars?: number;
  maxLLMCallsPerRoom?: number;
}

/**
 * Configures the Socket.io server: connection middleware and event handlers.
 * The Server instance must already be created (attached or noServer mode).
 */
export function setupSocketIO(io: Server, logger: Logger, deps?: SocketIODeps): void {
  const ipRateLimiter = deps?.ipRateLimiter ?? new IpRateLimiter();
  const wsConnectionsPerMinute = deps?.rateLimits?.wsConnectionsPerMinute ?? 20;
  const joinAttemptsPerHour = deps?.rateLimits?.joinAttemptsPerHour ?? 30;
  const importsPerHour = deps?.rateLimits?.importsPerHour ?? 10;
  const allowedOrigins = deps?.allowedOrigins ?? [];
  const trustedProxyIps = deps?.trustedProxyIps ?? [];

  io.use((socket, next) => {
    const roomCode = socket.handshake.query.roomCode;
    if (!roomCode || typeof roomCode !== "string") {
      return next(new Error("Missing required roomCode query parameter"));
    }

    const origin = socket.handshake.headers.origin;
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return next(new Error("Origin not allowed"));
    }

    const clientIp = extractClientIp({
      remoteAddress:
        socket.request.socket.remoteAddress ?? socket.handshake.address,
      forwardedForHeader: socket.handshake.headers["x-forwarded-for"],
      trustedProxyIps,
    });
    const connectionCheck = ipRateLimiter.consume(
      "ws-connect",
      clientIp,
      wsConnectionsPerMinute,
      60_000,
    );
    if (!connectionCheck.allowed) {
      return next(
        new Error(
          `Too many websocket connections. Try again in ${connectionCheck.retryAfterSeconds}s.`,
        ),
      );
    }

    socket.data.roomCode = normalizeRoomCode(roomCode);
    socket.data.clientIp = clientIp;
    next();
  });

  const authMiddleware = createAuthMiddleware(roomManager);

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, roomCode: socket.data.roomCode }, "Socket connected");

    socket.use(authMiddleware(socket));
    registerRoomHandler(io, socket, logger, roomManager, {
      ipRateLimiter,
      joinAttemptsPerHour,
    });
    if (deps?.getDoc) {
      registerProblemHandler(io, socket, logger, roomManager, deps.getDoc, {
        ipRateLimiter,
        importsPerHour,
        enableProblemImport: deps?.enableProblemImport ?? true,
      });
    }
    registerTestcaseHandler(
      io, socket, logger, roomManager,
      (problemId, language) => boilerplateRepository.findByProblemAndLanguage(problemId, language),
    );
    registerHintHandler(io, socket, logger, {
      roomLookup: roomManager,
      getDoc: deps?.getDoc ?? (() => undefined),
      groqClient: deps?.groqClient,
      enableLLMHintFallback: deps?.enableLLMHintFallback ?? true,
      enableImportedProblemHints: deps?.enableImportedProblemHints ?? true,
      maxLLMPromptChars: deps?.maxLLMPromptChars ?? 12_000,
      maxLLMHintChars: deps?.maxLLMHintChars ?? 1_500,
      maxLLMCallsPerRoom: deps?.maxLLMCallsPerRoom ?? 15,
      findStoredHint: deps?.findStoredHint ?? (async (problemId, hintsUsed) => {
        const hints = await hintRepository.findByProblemId(problemId);
        return hints[hintsUsed] ?? null;
      }),
      findProblem: (problemId) => problemRepository.findById(problemId),
    });
    registerSolutionHandler(io, socket, logger, {
      roomLookup: roomManager,
      findProblem: (problemId) => problemRepository.findById(problemId),
    });
    if (deps?.judge0Client && deps.getDoc) {
      registerExecutionHandler(io, socket, logger, {
        roomLookup: roomManager,
        getDoc: deps.getDoc,
        judge0Client: deps.judge0Client,
        dailyLimit: deps.dailyLimit ?? 100,
        findVisible: (problemId) => testCaseRepository.findVisible(problemId),
        findByProblemId: (problemId) => testCaseRepository.findByProblemId(problemId),
        findBoilerplate: (problemId, language) => boilerplateRepository.findByProblemAndLanguage(problemId, language),
        findProblem: (problemId) => problemRepository.findById(problemId),
        maxCodeBytes: deps?.maxCodeBytes ?? 65_536,
      });
    }
  });
}
