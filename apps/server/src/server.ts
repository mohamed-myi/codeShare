import type http from "node:http";
import { testCaseRepository } from "@codeshare/db";
import type { Logger } from "pino";
import { Server as SocketIOServer } from "socket.io";
import type { WebSocketServer } from "ws";
import { createGroqClient } from "./clients/GroqClient.js";
import { createJudge0Client } from "./clients/Judge0Client.js";
import type { Config } from "./config.js";
import type { CircuitState } from "./lib/circuitBreaker.js";
import { roomCodeLogFields } from "./lib/logger.js";
import { roomManager } from "./models/RoomManager.js";
import { createScraperService } from "./services/ScraperService.js";
import { createTestCaseGeneratorService } from "./services/TestCaseGeneratorService.js";
import { setupSocketIO } from "./ws/socketio.js";
import { registerUpgradeHandler } from "./ws/upgrade.js";
import { setupYjsServer } from "./ws/yjs.js";

export interface ServerResources {
  io: SocketIOServer;
  wss: WebSocketServer;
  judge0Client: { getCircuitState(): CircuitState };
  groqClient?: { getCircuitState(): CircuitState };
}

/**
 * Sets up the HTTP upgrade routing for dual WebSocket channels.
 * Creates Socket.io + y-websocket servers, attaches to the HTTP server,
 * and routes upgrades by path.
 */
export function setupUpgradeRouting(
  httpServer: http.Server,
  config: Config,
  logger: Logger,
): ServerResources {
  roomManager.configureDefaults({
    submissionLimit: config.ROOM_MAX_SUBMISSIONS,
    importLimit: config.ROOM_MAX_IMPORTS,
    customTestCaseLimit: config.ROOM_MAX_CUSTOM_TEST_CASES,
    gracePeriodMs: config.ROOM_GRACE_PERIOD_MS,
    maxActiveRooms: config.MAX_ACTIVE_ROOMS,
  });

  const io = new SocketIOServer({
    path: "/ws/socket",
    cors: { origin: config.ALLOWED_ORIGINS, credentials: true },
    serveClient: false,
    pingTimeout: 20000,
    pingInterval: 25000,
    maxHttpBufferSize: config.MAX_SOCKET_EVENT_BYTES,
  });
  io.attach(httpServer, { path: "/ws/socket" });

  const { wss, getDoc } = setupYjsServer(logger, roomManager, {
    allowedOrigins: config.ALLOWED_ORIGINS,
    maxMessageBytes: config.MAX_YJS_MESSAGE_BYTES,
    maxDocBytes: config.MAX_YJS_DOC_BYTES,
  });
  const judge0Client = createJudge0Client(config);
  const groqClient = config.GROQ_API_KEY ? createGroqClient(config) : undefined;
  const scraperService = createScraperService({
    graphQlUrl: config.LEETCODE_GRAPHQL_URL,
  });

  const testCaseGenerator =
    groqClient && config.ENABLE_LLM_TEST_GENERATION
      ? createTestCaseGeneratorService({
          groqComplete: (msgs, opts) => groqClient.complete(msgs, opts),
          countHidden: (problemId) => testCaseRepository.countHidden(problemId),
          maxOrderIndex: (problemId) => testCaseRepository.maxOrderIndex(problemId),
          createMany: (cases) => testCaseRepository.createMany(cases),
          logger,
          maxCases: config.LLM_TEST_GENERATION_MAX_CASES,
          genTemperature: config.LLM_TEST_GEN_TEMPERATURE,
          genMaxTokens: config.LLM_TEST_GEN_MAX_TOKENS,
          verifyTemperature: config.LLM_VERIFY_TEMPERATURE,
          verifyMaxTokens: config.LLM_VERIFY_MAX_TOKENS,
        })
      : undefined;

  setupSocketIO(io, logger, {
    getDoc,
    judge0Client,
    dailyLimit: config.JUDGE0_DAILY_LIMIT,
    groqClient,
    rateLimits: {
      wsConnectionsPerMinute: config.RATE_LIMIT_WS_CONNECT,
      joinAttemptsPerHour: config.RATE_LIMIT_JOIN,
      importsPerHour: config.RATE_LIMIT_IMPORT,
    },
    allowedOrigins: config.ALLOWED_ORIGINS,
    trustedProxyIps: config.TRUSTED_PROXY_IPS,
    maxCodeBytes: config.MAX_CODE_BYTES,
    judge0ExecPerHour: config.JUDGE0_EXEC_PER_HOUR_PER_IP,
    enableProblemImport: config.ENABLE_PROBLEM_IMPORT,
    enableLLMHintFallback: config.ENABLE_LLM_HINT_FALLBACK,
    enableImportedProblemHints: config.ENABLE_IMPORTED_PROBLEM_HINTS,
    maxLLMPromptChars: config.MAX_LLM_PROMPT_CHARS,
    maxLLMHintChars: config.MAX_LLM_HINT_CHARS,
    maxLLMCallsPerRoom: config.MAX_LLM_CALLS_PER_ROOM,
    llmCallsPerHourPerIp: config.LLM_CALLS_PER_HOUR_PER_IP,
    llmDailyLimit: config.LLM_DAILY_LIMIT,
    hintConsentMs: config.ROOM_HINT_CONSENT_MS,
    importsDailyLimit: config.IMPORTS_DAILY_LIMIT,
    importProblem: (url) => scraperService.importFromUrl(url),
    generateTestCases: testCaseGenerator
      ? (ctx) => testCaseGenerator.generateForProblem(ctx)
      : undefined,
  });

  // Replace Socket.io's default upgrade listener with our unified router
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);

  logger.info(
    {
      event: "websocket_upgrade_routing_configured",
      socketio_path: "/ws/socket",
      yjs_path: "/ws/yjs",
      ...roomCodeLogFields(undefined),
    },
    "WebSocket upgrade routing configured",
  );

  return { io, wss, judge0Client, groqClient };
}
