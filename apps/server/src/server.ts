import type http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type { Config } from "./config.js";
import type { Logger } from "pino";
import { setupSocketIO } from "./ws/socketio.js";
import { setupYjsServer } from "./ws/yjs.js";
import { registerUpgradeHandler } from "./ws/upgrade.js";
import { createJudge0Client } from "./clients/Judge0Client.js";
import { createGroqClient } from "./clients/GroqClient.js";
import { roomManager } from "./models/RoomManager.js";

/**
 * Sets up the HTTP upgrade routing for dual WebSocket channels.
 * Creates Socket.io + y-websocket servers, attaches to the HTTP server,
 * and routes upgrades by path.
 */
export function setupUpgradeRouting(
  httpServer: http.Server,
  config: Config,
  logger: Logger,
): SocketIOServer {
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
  const groqClient = config.GROQ_API_KEY
    ? createGroqClient(config)
    : undefined;

  setupSocketIO(io, logger, {
    getDoc,
    judge0Client,
    dailyLimit: config.JUDGE0_DAILY_LIMIT,
    groqClient,
    allowedOrigins: config.ALLOWED_ORIGINS,
    trustedProxyIps: config.TRUSTED_PROXY_IPS,
    maxCodeBytes: config.MAX_CODE_BYTES,
    enableProblemImport: config.ENABLE_PROBLEM_IMPORT,
    enableLLMHintFallback: config.ENABLE_LLM_HINT_FALLBACK,
    enableImportedProblemHints: config.ENABLE_IMPORTED_PROBLEM_HINTS,
    maxLLMPromptChars: config.MAX_LLM_PROMPT_CHARS,
    maxLLMHintChars: config.MAX_LLM_HINT_CHARS,
    maxLLMCallsPerRoom: config.MAX_LLM_CALLS_PER_ROOM,
  });

  // Replace Socket.io's default upgrade listener with our unified router
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);

  logger.info("WebSocket upgrade routing configured: /ws/socket (Socket.io), /ws/yjs (y-websocket)");

  return io;
}
