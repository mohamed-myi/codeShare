import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import WebSocket from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { setupYjsServer } from "../ws/yjs.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("silent");

function startServer(): Promise<{
  httpServer: http.Server;
  port: number;
  getDoc: (room: string) => Y.Doc | undefined;
  cleanup: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const httpServer = http.createServer();
    const { wss, getDoc } = setupYjsServer(logger);

    httpServer.on("upgrade", (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      resolve({
        httpServer,
        port,
        getDoc,
        cleanup: () =>
          new Promise<void>((res) => {
            wss.close();
            httpServer.close(() => res());
          }),
      });
    });
  });
}

function createYjsClient(
  port: number,
  roomName: string,
): { doc: Y.Doc; provider: WebsocketProvider } {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(
    `ws://127.0.0.1:${port}`,
    roomName,
    doc,
    { WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket },
  );
  return { doc, provider };
}

function waitForSync(provider: WebsocketProvider): Promise<void> {
  return new Promise<void>((resolve) => {
    if (provider.synced) {
      resolve();
      return;
    }
    provider.on("sync", function handler(synced: boolean) {
      if (synced) {
        provider.off("sync", handler);
        resolve();
      }
    });
  });
}

describe("y-websocket server", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const providers: WebsocketProvider[] = [];

  afterEach(async () => {
    for (const p of providers) {
      p.destroy();
    }
    providers.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it("two clients with same roomName share a document", async () => {
    const server = await startServer();
    cleanup = server.cleanup;

    const c1 = createYjsClient(server.port, "room-1");
    const c2 = createYjsClient(server.port, "room-1");
    providers.push(c1.provider, c2.provider);

    await Promise.all([waitForSync(c1.provider), waitForSync(c2.provider)]);

    c1.doc.getText("monaco").insert(0, "hello");

    await new Promise((r) => setTimeout(r, 200));

    expect(c2.doc.getText("monaco").toString()).toBe("hello");
  });

  it("two clients with different roomNames have isolated documents", async () => {
    const server = await startServer();
    cleanup = server.cleanup;

    const c1 = createYjsClient(server.port, "room-a");
    const c2 = createYjsClient(server.port, "room-b");
    providers.push(c1.provider, c2.provider);

    await Promise.all([waitForSync(c1.provider), waitForSync(c2.provider)]);

    c1.doc.getText("monaco").insert(0, "room-a-text");

    await new Promise((r) => setTimeout(r, 200));

    expect(c2.doc.getText("monaco").toString()).toBe("");
  });

  it("server maintains a Y.Doc per room accessible for reading", async () => {
    const server = await startServer();
    cleanup = server.cleanup;

    const c1 = createYjsClient(server.port, "test-room");
    providers.push(c1.provider);

    await waitForSync(c1.provider);

    c1.doc.getText("monaco").insert(0, "server-readable");

    await new Promise((r) => setTimeout(r, 200));

    const serverDoc = server.getDoc("test-room");
    expect(serverDoc).toBeDefined();
    expect(serverDoc!.getText("monaco").toString()).toBe("server-readable");
  });
});
