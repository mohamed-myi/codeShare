import crypto from "node:crypto";
import type { Logger } from "pino";
import { WebSocketServer } from "ws";
import type * as Y from "yjs";
import { roomCodeLogFields } from "../lib/logger.js";
import { isOriginAllowed } from "../lib/networkSecurity.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import { roomManager } from "../models/RoomManager.js";
import type { AccessService } from "../services/AccessService.js";
import { extractRoomName, extractToken, setupWSConnection } from "./yjsConnection.js";
import { destroyAllSharedDocs, destroySharedDoc, findSharedDoc } from "./yjsDocRegistry.js";

let roomCleanupRegistered = false;

interface RoomLookup {
  getRoom(roomCode: string): { yjsToken: string } | undefined;
}

interface YjsServerResult {
  wss: WebSocketServer;
  getDoc: (roomCode: string) => Y.Doc | undefined;
}

interface YjsServerOptions {
  allowedOrigins?: string[];
  maxMessageBytes?: number;
  maxDocBytes?: number;
  accessService?: AccessService;
}

export function setupYjsServer(
  logger: Logger,
  roomLookup: RoomLookup,
  options: YjsServerOptions = {},
): YjsServerResult {
  registerRoomCleanupHook();
  const maxMessageBytes = options.maxMessageBytes ?? 32_768;
  const maxDocBytes = options.maxDocBytes ?? 65_536;
  const allowedOrigins = options.allowedOrigins;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: maxMessageBytes,
  });

  wss.on("close", () => {
    destroyAllSharedDocs();
  });

  wss.on("connection", async (ws, req) => {
    const roomName = extractRoomName(req.url);
    const token = extractToken(req.url);
    const origin = req.headers.origin;

    if (options.accessService) {
      const validation = await options.accessService
        .validateCookie(req.headers.cookie)
        .catch(() => ({ allowed: false as const, reason: "service_unavailable" }));
      if (!validation.allowed) {
        logger.warn(
          {
            event: "yjs_connection_rejected",
            ...roomCodeLogFields(roomName),
            origin,
            reason: "private_access_required",
            access_reason: validation.reason,
          },
          "Yjs connection rejected: private access required",
        );
        ws.close(4401, "Access required");
        return;
      }
    }

    if (allowedOrigins !== undefined && !isOriginAllowed(origin, allowedOrigins)) {
      logger.warn(
        {
          event: "yjs_connection_rejected",
          ...roomCodeLogFields(roomName),
          origin,
          reason: "origin_not_allowed",
        },
        "Yjs connection rejected: origin not allowed",
      );
      ws.close(4403, "Forbidden");
      return;
    }

    const room = roomLookup.getRoom(roomName);
    if (!room || !token || room.yjsToken !== token) {
      logger.warn(
        {
          event: "yjs_connection_rejected",
          ...roomCodeLogFields(roomName),
          reason: "invalid_or_missing_token",
        },
        "Yjs connection rejected: invalid or missing token",
      );
      ws.close(4401, "Unauthorized");
      return;
    }

    const connectionId = crypto.randomUUID();
    logger.info(
      {
        event: "yjs_client_connected",
        connection_id: connectionId,
        ...roomCodeLogFields(roomName),
      },
      "Yjs client connected",
    );
    setupWSConnection(
      ws,
      req,
      logger,
      {
        maxMessageBytes,
        maxDocBytes,
      },
      roomName,
      connectionId,
    );
  });

  return {
    wss,
    getDoc: (roomCode: string) => findSharedDoc(normalizeRoomCode(roomCode)),
  };
}

function registerRoomCleanupHook(): void {
  if (roomCleanupRegistered) {
    return;
  }

  roomManager.onDestroy((roomCode) => {
    destroySharedDoc(roomCode);
  });
  roomCleanupRegistered = true;
}
