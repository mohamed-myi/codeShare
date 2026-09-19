import WebSocket from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

interface SharedCodeOptions {
  url: string;
  roomCode: string;
  token: string;
  origin?: string;
  code: string;
  timeoutMs?: number;
}

export function waitForSharedCode(options: SharedCodeOptions): Promise<void> {
  // y-websocket accepts a constructor; this adapter supplies the browser origin.
  class OriginWebSocket extends WebSocket {
    constructor(address: string) {
      super(address, { origin: options.origin });
    }
  }
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(options.url, options.roomCode, doc, {
    connect: false,
    params: { token: options.token },
    WebSocketPolyfill: OriginWebSocket as unknown as typeof globalThis.WebSocket,
  });
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      doc.off("update", check);
      provider.off("sync", check);
      provider.off("connection-close", closed);
      provider.destroy();
      doc.destroy();
    };
    const check = () => {
      if (!provider.synced || doc.getText("monaco").toString() !== options.code) return;
      cleanup();
      resolve();
    };
    const closed = () => {
      cleanup();
      reject(new Error("Editor observer connection closed before synchronization"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for server-synchronized editor code"));
    }, options.timeoutMs ?? 5_000);
    doc.on("update", check);
    provider.on("sync", check);
    provider.on("connection-close", closed);
    provider.connect();
  });
}
