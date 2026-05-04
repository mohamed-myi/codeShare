import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import WebSocket from "ws";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { hrtimeMs } from "./clock.js";
import { getLoadTestLogger } from "./logger.js";

const MESSAGE_SYNC = 0;
const YJS_TEXT_TYPE = "monaco";
const logger = getLoadTestLogger();

export interface LoadYjsClient {
  doc: Y.Doc;
  ws: WebSocket;
  close(): void;
  insertChar(index: number, char: string): void;
  insertText(index: number, text: string): void;
  getText(): string;
  onRemoteUpdate(cb: (latencyMs: number) => void): void;
}

function toWsUrl(serverUrl: string, roomCode: string, yjsToken: string): string {
  const wsUrl = serverUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
  return `${wsUrl}/ws/yjs/${roomCode}?token=${encodeURIComponent(yjsToken)}`;
}

function sendSyncStep1(ws: WebSocket, doc: Y.Doc): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));
}

function encodeSyncUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

// Sentinel origin used when applying remote updates via readSyncMessage.
// Local edits (insertChar/insertText) use this same object as transaction origin
// would NOT match, so we can distinguish local vs remote in doc.on('update').
const REMOTE_ORIGIN = Symbol("remote");

export function createLoadYjsClient(
  serverUrl: string,
  roomCode: string,
  yjsToken: string,
): Promise<LoadYjsClient> {
  return new Promise<LoadYjsClient>((resolve, reject) => {
    const doc = new Y.Doc();
    const url = toWsUrl(serverUrl, roomCode, yjsToken);
    const ws = new WebSocket(url, { headers: { origin: "http://localhost:5173" } });

    let remoteUpdateCb: ((latencyMs: number) => void) | null = null;

    ws.binaryType = "arraybuffer";

    const connectTimeout = setTimeout(() => {
      ws.close();
      doc.destroy();
      logger.error("load_test_yjs_connect_failed", {
        server_url: serverUrl,
        room_code: roomCode,
        error_message: "Yjs WebSocket connect timed out after 10s",
      });
      reject(new Error("Yjs WebSocket connect timed out after 10s"));
    }, 10_000);

    ws.on("open", () => {
      clearTimeout(connectTimeout);
      sendSyncStep1(ws, doc);
      resolve(client);
    });

    ws.on("error", (err) => {
      clearTimeout(connectTimeout);
      logger.error("load_test_yjs_connect_failed", {
        server_url: serverUrl,
        room_code: roomCode,
        error_message: String(err),
      });
      reject(new Error(`Yjs WebSocket error: ${String(err)}`));
    });

    ws.on("message", (rawData: ArrayBuffer | Buffer) => {
      const start = hrtimeMs();
      const data =
        rawData instanceof ArrayBuffer
          ? new Uint8Array(rawData)
          : new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength);

      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, REMOTE_ORIGIN);

        // Send reply if the encoder has content beyond the message type header
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }

        // syncMessageType 2 = update received from remote
        if (syncMessageType === 2 && remoteUpdateCb) {
          remoteUpdateCb(hrtimeMs() - start);
        }
      }
      // MESSAGE_AWARENESS: no action needed for load testing
    });

    // Forward local doc updates to server
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_ORIGIN) return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encodeSyncUpdate(update));
      }
    });

    const client: LoadYjsClient = {
      doc,
      ws,

      close() {
        ws.close();
        doc.destroy();
      },

      insertChar(index: number, char: string) {
        doc.getText(YJS_TEXT_TYPE).insert(index, char);
      },

      insertText(index: number, text: string) {
        doc.getText(YJS_TEXT_TYPE).insert(index, text);
      },

      getText() {
        return doc.getText(YJS_TEXT_TYPE).toString();
      },

      onRemoteUpdate(cb: (latencyMs: number) => void) {
        remoteUpdateCb = cb;
      },
    };
  });
}
