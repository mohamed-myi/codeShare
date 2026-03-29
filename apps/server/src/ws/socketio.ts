import {
  boilerplateRepository,
  hintRepository,
  problemRepository,
  testCaseRepository,
} from "@codeshare/db";
import type { Hint } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import { registerExecutionHandler } from "../handlers/executionHandler.js";
import { registerHintHandler } from "../handlers/hintHandler.js";
import { registerProblemHandler } from "../handlers/problemHandler.js";
import { registerRoomHandler } from "../handlers/roomHandler.js";
import { registerSolutionHandler } from "../handlers/solutionHandler.js";
import { registerTestcaseHandler } from "../handlers/testcaseHandler.js";
import { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { roomCodeLogFields } from "../lib/logger.js";
import { extractClientIp, isOriginAllowed } from "../lib/networkSecurity.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import { roomManager } from "../models/RoomManager.js";
import type { GenerationContext } from "../services/TestCaseGeneratorService.js";

let activeIpRateLimiter: IpRateLimiter | null = null;

interface Judge0Client {
  submit(
    source: string,
    timeLimitMs: number,
  ): Promise<{
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
  judge0ExecPerHour?: number;
  enableProblemImport?: boolean;
  enableLLMHintFallback?: boolean;
  enableImportedProblemHints?: boolean;
  maxLLMPromptChars?: number;
  maxLLMHintChars?: number;
  maxLLMCallsPerRoom?: number;
  llmCallsPerHourPerIp?: number;
  llmDailyLimit?: number;
  hintConsentMs?: number;
  importsDailyLimit?: number;
  importProblem?: (url: string) => Promise<{ id: string; sourceUrl: string | null }>;
  generateTestCases?: (ctx: GenerationContext) => Promise<void>;
}

interface SocketIOConfig {
  ipRateLimiter: IpRateLimiter;
  wsConnectionsPerMinute: number;
  joinAttemptsPerHour: number;
  importsPerHour: number;
  allowedOrigins?: string[];
  trustedProxyIps: string[];
}

/**
 * Configures the Socket.io server: connection middleware and event handlers.
 * The Server instance must already be created (attached or noServer mode).
 */
export function setupSocketIO(io: Server, logger: Logger, deps?: SocketIODeps): void {
  const config = resolveSocketIOConfig(deps);
  activeIpRateLimiter = config.ipRateLimiter;

  io.use(createHandshakeMiddleware(logger, config));

  const authMiddleware = createAuthMiddleware(roomManager, logger);

  io.on("connection", (socket) => {
    logger.info(
      {
        event: "socket_connected",
        socket_id: socket.id,
        ...roomCodeLogFields(socket.data.roomCode as string),
      },
      "Socket connected",
    );

    socket.use(authMiddleware(socket));
    registerSocketHandlers(io, socket, logger, deps, config);
  });
}

export function resetSocketIORateLimits(): void {
  activeIpRateLimiter?.clear();
}

function resolveSocketIOConfig(deps?: SocketIODeps): SocketIOConfig {
  return {
    ipRateLimiter: deps?.ipRateLimiter ?? new IpRateLimiter(),
    wsConnectionsPerMinute: deps?.rateLimits?.wsConnectionsPerMinute ?? 20,
    joinAttemptsPerHour: deps?.rateLimits?.joinAttemptsPerHour ?? 30,
    importsPerHour: deps?.rateLimits?.importsPerHour ?? 10,
    allowedOrigins: deps?.allowedOrigins,
    trustedProxyIps: deps?.trustedProxyIps ?? [],
  };
}

function createHandshakeMiddleware(logger: Logger, config: SocketIOConfig) {
  return (socket: Socket, next: (err?: Error) => void) => {
    const roomCode = socket.handshake.query.roomCode;
    if (!roomCode || typeof roomCode !== "string") {
      logger.warn(
        {
          event: "socket_handshake_rejected",
          socket_id: socket.id,
          ...roomCodeLogFields(typeof roomCode === "string" ? roomCode : undefined),
          origin: socket.handshake.headers.origin,
          reason: "missing_room_code",
        },
        "Socket handshake rejected: missing roomCode",
      );
      return next(new Error("Missing required roomCode query parameter"));
    }

    const origin = socket.handshake.headers.origin;
    if (config.allowedOrigins !== undefined && !isOriginAllowed(origin, config.allowedOrigins)) {
      logger.warn(
        {
          event: "socket_handshake_rejected",
          socket_id: socket.id,
          ...roomCodeLogFields(roomCode),
          origin,
          allowedOrigins: config.allowedOrigins,
          reason: "origin_not_allowed",
        },
        "Socket handshake rejected: origin not allowed",
      );
      return next(new Error("Origin not allowed"));
    }

    const clientIp = extractClientIp({
      remoteAddress: socket.request.socket.remoteAddress ?? socket.handshake.address,
      forwardedForHeader: socket.handshake.headers["x-forwarded-for"],
      trustedProxyIps: config.trustedProxyIps,
    });
    const connectionCheck = config.ipRateLimiter.consume(
      "ws-connect",
      clientIp,
      config.wsConnectionsPerMinute,
      60_000,
    );
    if (!connectionCheck.allowed) {
      logger.warn(
        {
          event: "socket_handshake_rejected",
          socket_id: socket.id,
          ...roomCodeLogFields(roomCode),
          client_ip: clientIp,
          retry_after_seconds: connectionCheck.retryAfterSeconds,
          reason: "rate_limited",
        },
        "Socket handshake rejected: rate limited",
      );
      return next(
        new Error(
          `Too many websocket connections. Try again in ${connectionCheck.retryAfterSeconds}s.`,
        ),
      );
    }

    socket.data.roomCode = normalizeRoomCode(roomCode);
    socket.data.clientIp = clientIp;
    logger.debug(
      {
        event: "socket_handshake_accepted",
        socket_id: socket.id,
        ...roomCodeLogFields(socket.data.roomCode as string),
        origin,
        client_ip: clientIp,
      },
      "Socket handshake accepted",
    );
    next();
  };
}

function registerSocketHandlers(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: SocketIODeps | undefined,
  config: SocketIOConfig,
): void {
  registerRoomHandler(io, socket, logger, roomManager, {
    ipRateLimiter: config.ipRateLimiter,
    joinAttemptsPerHour: config.joinAttemptsPerHour,
  });

  if (deps?.getDoc) {
    registerProblemHandler(io, socket, logger, roomManager, deps.getDoc, {
      ipRateLimiter: config.ipRateLimiter,
      importsPerHour: config.importsPerHour,
      enableProblemImport: deps.enableProblemImport ?? true,
      importsDailyLimit: deps.importsDailyLimit ?? 50,
      importProblem: deps.importProblem,
      generateTestCases: deps.generateTestCases,
    });
  }

  registerTestcaseHandler(io, socket, logger, roomManager, (problemId, language) =>
    boilerplateRepository.findByProblemAndLanguage(problemId, language),
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
    hintConsentMs: deps?.hintConsentMs,
    ipRateLimiter: config.ipRateLimiter,
    llmCallsPerHourPerIp: deps?.llmCallsPerHourPerIp,
    llmDailyLimit: deps?.llmDailyLimit,
    findStoredHint:
      deps?.findStoredHint ??
      (async (problemId, hintsUsed) => {
        const hints = await hintRepository.findByProblemId(problemId);
        return hints[hintsUsed] ?? null;
      }),
    findProblem: (problemId) => problemRepository.findById(problemId),
  });
  registerSolutionHandler(io, socket, logger, {
    roomLookup: roomManager,
    findProblem: (problemId) => problemRepository.findById(problemId),
  });

  if (!deps?.judge0Client || !deps.getDoc) {
    return;
  }

  registerExecutionHandler(io, socket, logger, {
    roomLookup: roomManager,
    getDoc: deps.getDoc,
    judge0Client: deps.judge0Client,
    dailyLimit: deps.dailyLimit ?? 100,
    ipRateLimiter: config.ipRateLimiter,
    judge0ExecPerHour: deps.judge0ExecPerHour,
    findVisible: (problemId) => testCaseRepository.findVisible(problemId),
    findByProblemId: (problemId) => testCaseRepository.findByProblemId(problemId),
    findBoilerplate: (problemId, language) =>
      boilerplateRepository.findByProblemAndLanguage(problemId, language),
    findProblem: (problemId) => problemRepository.findById(problemId),
    maxCodeBytes: deps.maxCodeBytes ?? 65_536,
  });
}
