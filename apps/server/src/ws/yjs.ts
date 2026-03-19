import { createRequire } from "node:module";
import { WebSocketServer } from "ws";
import type { Logger } from "pino";
import type * as Y from "yjs";

const require = createRequire(import.meta.url);
const { setupWSConnection, docs } = require("y-websocket/bin/utils") as {
  setupWSConnection: (
    conn: import("ws").WebSocket,
    req: import("http").IncomingMessage,
    opts?: { docName?: string; gc?: boolean },
  ) => void;
  docs: Map<string, Y.Doc>;
};

interface YjsServerResult {
  wss: WebSocketServer;
  getDoc: (roomCode: string) => Y.Doc | undefined;
}

/**
 * Creates a y-websocket server in noServer mode.
 * Maintains per-room Y.Docs for CRDT sync and server-side code reading.
 */
export function setupYjsServer(logger: Logger): YjsServerResult {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    const roomName = extractRoomName(req.url);
    logger.info({ roomName }, "Yjs client connected");
    setupWSConnection(ws, req, { docName: roomName });
  });

  function getDoc(roomCode: string): Y.Doc | undefined {
    return docs.get(roomCode);
  }

  return { wss, getDoc };
}

function extractRoomName(url: string | undefined): string {
  if (!url) return "default";
  // URL format from y-websocket client: /<roomName>
  const pathname = url.split("?")[0];
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] || "default";
}
