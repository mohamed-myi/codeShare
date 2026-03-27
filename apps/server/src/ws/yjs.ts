import type { IncomingMessage } from "node:http";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { Logger } from "pino";
import { type RawData, type WebSocket, WebSocketServer } from "ws";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as Y from "yjs";
import { isOriginAllowed } from "../lib/networkSecurity.js";
import { normalizeRoomCode } from "../lib/roomCode.js";
import { roomManager } from "../models/RoomManager.js";

const docs = new Map<string, WSSharedDoc>();
const messageSync = 0;
const messageAwareness = 1;
const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const pingTimeoutMs = 30_000;
let roomCleanupRegistered = false;

class WSSharedDoc extends Y.Doc {
  readonly name: string;
  readonly conns = new Map<WebSocket, Set<number>>();
  readonly awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super();
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        conn: unknown,
      ) => {
        const changedClients = added.concat(updated, removed);
        if (conn !== null) {
          const controlledIds = this.conns.get(conn as WebSocket);
          if (controlledIds) {
            for (const clientId of added) controlledIds.add(clientId);
            for (const clientId of removed) controlledIds.delete(clientId);
          }
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
        );
        const message = encoding.toUint8Array(encoder);

        for (const conn of this.conns.keys()) {
          send(this, conn, message);
        }
      },
    );

    this.on("update", (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const conn of this.conns.keys()) {
        send(this, conn, message);
      }
    });
  }
}

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
    for (const docName of Array.from(docs.keys())) {
      destroyDoc(docName);
    }
  });

  wss.on("connection", (ws, req) => {
    const roomName = extractRoomName(req.url);
    const token = extractToken(req.url);
    const origin = req.headers.origin;

    if (allowedOrigins !== undefined && !isOriginAllowed(origin, allowedOrigins)) {
      logger.warn({ roomName, origin }, "Yjs connection rejected: origin not allowed");
      ws.close(4403, "Forbidden");
      return;
    }

    const room = roomLookup.getRoom(roomName);
    if (!room || !token || room.yjsToken !== token) {
      logger.warn({ roomName }, "Yjs connection rejected: invalid or missing token");
      ws.close(4401, "Unauthorized");
      return;
    }

    logger.info({ roomName }, "Yjs client connected");
    setupWSConnection(
      ws,
      req,
      logger,
      {
        maxMessageBytes,
        maxDocBytes,
      },
      roomName,
    );
  });

  return {
    wss,
    getDoc: (roomCode: string) => docs.get(normalizeRoomCode(roomCode)),
  };
}

function registerRoomCleanupHook(): void {
  if (roomCleanupRegistered) {
    return;
  }

  roomManager.onDestroy((roomCode) => {
    destroyDoc(roomCode);
  });
  roomCleanupRegistered = true;
}

function getYDoc(docName: string): WSSharedDoc {
  const existing = docs.get(docName);
  if (existing) {
    return existing;
  }

  const doc = new WSSharedDoc(docName);
  docs.set(docName, doc);
  return doc;
}

function destroyDoc(docName: string): void {
  const doc = docs.get(docName);
  if (!doc) {
    return;
  }

  for (const conn of Array.from(doc.conns.keys())) {
    closeConn(doc, conn);
  }

  doc.awareness.destroy();
  doc.destroy();
  docs.delete(docName);
}

function setupWSConnection(
  conn: WebSocket,
  req: IncomingMessage,
  logger: Logger,
  limits: {
    maxMessageBytes: number;
    maxDocBytes: number;
  },
  docName = extractRoomName(req.url),
): void {
  conn.binaryType = "arraybuffer";
  const doc = getYDoc(docName);
  doc.conns.set(conn, new Set());

  conn.on("error", (err) => {
    logger.warn({ err, docName }, "Yjs websocket error");
  });

  conn.on("message", (message) => {
    const uint8Message = toUint8Array(message);
    if (uint8Message.byteLength > limits.maxMessageBytes) {
      logger.warn({ docName, size: uint8Message.byteLength }, "Rejected oversized Yjs message");
      conn.close(1009, "Message too large");
      return;
    }

    messageListener(conn, doc, uint8Message, logger, limits.maxDocBytes);
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
  send(doc, conn, encoding.toUint8Array(syncEncoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())),
    );
    send(doc, conn, encoding.toUint8Array(awarenessEncoder));
  }
}

function messageListener(
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array,
  logger: Logger,
  maxDocBytes: number,
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
          send(doc, conn, encoding.toUint8Array(encoder));
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
      logger.warn({ docName: doc.name }, "Rejected oversized Yjs document state");
      closeConn(doc, conn, 1009, "Document too large");
    }
  } catch (error) {
    logger.warn({ err: error, docName: doc.name }, "Failed to process Yjs websocket message");
    closeConn(doc, conn, 1003, "Invalid Yjs message");
  }
}

function send(doc: WSSharedDoc, conn: WebSocket, message: Uint8Array): void {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
    return;
  }

  try {
    conn.send(message, {}, (error) => {
      if (error) {
        closeConn(doc, conn);
      }
    });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: WSSharedDoc, conn: WebSocket, code?: number, reason?: string): void {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds ?? []), null);
  }
  if (conn.readyState === wsReadyStateConnecting || conn.readyState === wsReadyStateOpen) {
    conn.close(code, reason);
  }
}

function toUint8Array(message: RawData): Uint8Array {
  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message);
  }

  if (Array.isArray(message)) {
    return Buffer.concat(message).subarray();
  }

  if (typeof message === "string") {
    return new TextEncoder().encode(message);
  }

  return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
}

function extractRoomName(url: string | undefined): string {
  if (!url) return "default";

  const pathname = url.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  const roomName = segments.at(-1);
  return roomName ? normalizeRoomCode(decodeURIComponent(roomName)) : "default";
}

function extractToken(url: string | undefined): string | null {
  if (!url) return null;

  const queryStart = url.indexOf("?");
  if (queryStart === -1) return null;

  const params = new URLSearchParams(url.slice(queryStart));
  return params.get("token");
}
