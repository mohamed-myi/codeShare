import type { IncomingMessage } from "node:http";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as Y from "yjs";
import { roomCodeLogFields } from "../lib/logger.js";
import {
  closeConn,
  getOrCreateSharedDoc,
  toUint8Array,
  type WSSharedDoc,
} from "./yjsDocRegistry.js";

const messageAwareness = 1;
const messageSync = 0;
const pingTimeoutMs = 30_000;

interface ConnectionLimits {
  maxMessageBytes: number;
  maxDocBytes: number;
}

export function setupWSConnection(
  conn: WebSocket,
  req: IncomingMessage,
  logger: Logger,
  limits: ConnectionLimits,
  docName = extractRoomName(req.url),
  connectionId = crypto.randomUUID(),
): void {
  conn.binaryType = "arraybuffer";
  const doc = getOrCreateSharedDoc(docName);
  doc.conns.set(conn, new Set());

  conn.on("error", (err) => {
    logger.warn(
      {
        event: "yjs_websocket_error",
        err,
        connection_id: connectionId,
        ...roomCodeLogFields(docName),
      },
      "Yjs websocket error",
    );
  });

  conn.on("message", (message) => {
    const uint8Message = toUint8Array(message);
    if (uint8Message.byteLength > limits.maxMessageBytes) {
      logger.warn(
        {
          event: "yjs_message_rejected",
          connection_id: connectionId,
          ...roomCodeLogFields(docName),
          size_bytes: uint8Message.byteLength,
          reason: "message_too_large",
        },
        "Rejected oversized Yjs message",
      );
      conn.close(1009, "Message too large");
      return;
    }

    messageListener(conn, doc, uint8Message, logger, limits.maxDocBytes, connectionId);
  });

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      closeConn(doc, conn);
      clearInterval(pingInterval);
      return;
    }

    if (!doc.conns.has(conn)) {
      clearInterval(pingInterval);
      return;
    }

    pongReceived = false;
    try {
      conn.ping();
    } catch {
      closeConn(doc, conn);
      clearInterval(pingInterval);
    }
  }, pingTimeoutMs);

  conn.on("pong", () => {
    pongReceived = true;
  });

  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  conn.send(encoding.toUint8Array(syncEncoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())),
    );
    conn.send(encoding.toUint8Array(awarenessEncoder));
  }
}

export function extractRoomName(url: string | undefined): string {
  if (!url) {
    return "default";
  }

  const pathname = url.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  const roomName = segments.at(-1);
  return roomName ? normalizeRoomName(roomName) : "default";
}

export function extractToken(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return null;
  }

  const params = new URLSearchParams(url.slice(queryStart));
  return params.get("token");
}

function messageListener(
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array,
  logger: Logger,
  maxDocBytes: number,
  connectionId: string,
): void {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder));
        }
        break;
      }
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      }
      default:
        break;
    }

    if (Y.encodeStateAsUpdate(doc).byteLength > maxDocBytes) {
      logger.warn(
        {
          event: "yjs_document_rejected",
          connection_id: connectionId,
          ...roomCodeLogFields(doc.name),
          reason: "document_too_large",
        },
        "Rejected oversized Yjs document state",
      );
      closeConn(doc, conn, 1009, "Document too large");
    }
  } catch (error) {
    logger.warn(
      {
        event: "yjs_message_processing_failed",
        err: error,
        connection_id: connectionId,
        ...roomCodeLogFields(doc.name),
      },
      "Failed to process Yjs websocket message",
    );
    closeConn(doc, conn, 1003, "Invalid Yjs message");
  }
}

function normalizeRoomName(roomName: string): string {
  return decodeURIComponent(roomName).trim().toLowerCase();
}
