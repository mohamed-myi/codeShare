import type http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type { Config } from "./config.js";
import type { Logger } from "pino";
import { setupSocketIO } from "./ws/socketio.js";
import { setupYjsServer } from "./ws/yjs.js";
import { registerUpgradeHandler } from "./ws/upgrade.js";

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
    cors: { origin: config.CORS_ORIGIN, credentials: true },
    serveClient: false,
    pingTimeout: 20000,
    pingInterval: 25000,
  });
  io.attach(httpServer, { path: "/ws/socket" });

  setupSocketIO(io, logger);

  const { wss } = setupYjsServer(logger);

  // Replace Socket.io's default upgrade listener with our unified router
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);

  logger.info("WebSocket upgrade routing configured: /ws/socket (Socket.io), /ws/yjs (y-websocket)");

  return io;
}
