import type http from "node:http";
import type net from "node:net";
import type { Logger } from "pino";
import type { Server as SocketIOServer } from "socket.io";
import type { WebSocketServer } from "ws";

/**
 * Registers the HTTP upgrade listener that routes WebSocket connections
 * to either y-websocket (/ws/yjs) or Socket.io (/ws/socket).
 */
export function registerUpgradeHandler(
  httpServer: http.Server,
  yjsWss: WebSocketServer,
  io: SocketIOServer,
  logger: Logger,
): void {
  httpServer.on("upgrade", (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    const url = req.url ?? "";
    const pathname = url.split("?")[0];

    if (pathname.startsWith("/ws/yjs")) {
      yjsWss.handleUpgrade(req, socket, head, (ws) => {
        yjsWss.emit("connection", ws, req);
      });
    } else if (pathname.startsWith("/ws/socket")) {
      // Socket.io engine's handleUpgrade accepts IncomingMessage at runtime
      // but types require EngineRequest with _query -- safe to cast
      (
        io.engine as unknown as {
          handleUpgrade(req: http.IncomingMessage, socket: net.Socket, head: Buffer): void;
        }
      ).handleUpgrade(req, socket, head);
    } else {
      logger.warn(
        {
          event: "websocket_upgrade_rejected",
          pathname,
          reason: "unknown_path",
        },
        "Rejecting WebSocket upgrade for unknown path",
      );
      socket.destroy();
    }
  });
}
