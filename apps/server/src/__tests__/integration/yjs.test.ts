import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { createLogger } from "../../lib/logger.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupYjsServer } from "../../ws/yjs.js";
import { listenOnLocalhost, TEST_HOST } from "../helpers/networkTestHelper.js";

type YDoc = import("yjs").Doc;
type YWebsocketProvider = import("y-websocket").WebsocketProvider;

const logger = createLogger("silent");

async function startServer(options?: Parameters<typeof setupYjsServer>[2]): Promise<{
  httpServer: http.Server;
  port: number;
  getDoc: (room: string) => YDoc | undefined;
  cleanup: () => Promise<void>;
}> {
  const httpServer = http.createServer();
  const { wss, getDoc } = setupYjsServer(logger, roomManager, options);

  httpServer.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  const port = await listenOnLocalhost(httpServer);

  return {
    httpServer,
    port,
    getDoc,
    cleanup: () =>
      new Promise<void>((res) => {
        wss.close();
        httpServer.close(() => res());
      }),
  };
}

function createYjsClient(
  port: number,
  roomName: string,
  token?: string,
): { doc: YDoc; provider: YWebsocketProvider } {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(`ws://${TEST_HOST}:${port}`, roomName, doc, {
    WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
    ...(token ? { params: { token } } : {}),
  });
  return { doc, provider };
}

function waitForSync(provider: YWebsocketProvider): Promise<void> {
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
  const providers: YWebsocketProvider[] = [];
  const createdRoomCodes: string[] = [];

  afterEach(async () => {
    for (const p of providers) {
      p.destroy();
    }
    providers.length = 0;
    for (const code of createdRoomCodes) {
      roomManager.destroyRoom(code);
    }
    createdRoomCodes.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  function createTestRoom(): { roomCode: string; yjsToken: string } {
    const room = roomManager.createRoom("collaboration");
    createdRoomCodes.push(room.roomCode);
    return { roomCode: room.roomCode, yjsToken: room.yjsToken };
  }

  it("two clients with same roomName and valid token share a document", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const { roomCode, yjsToken } = createTestRoom();

    const c1 = createYjsClient(server.port, roomCode, yjsToken);
    const c2 = createYjsClient(server.port, roomCode, yjsToken);
    providers.push(c1.provider, c2.provider);

    await Promise.all([waitForSync(c1.provider), waitForSync(c2.provider)]);

    c1.doc.getText("monaco").insert(0, "hello");

    await new Promise((r) => setTimeout(r, 200));

    expect(c2.doc.getText("monaco").toString()).toBe("hello");
  });

  it("two clients with different roomNames have isolated documents", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const roomA = createTestRoom();
    const roomB = createTestRoom();

    const c1 = createYjsClient(server.port, roomA.roomCode, roomA.yjsToken);
    const c2 = createYjsClient(server.port, roomB.roomCode, roomB.yjsToken);
    providers.push(c1.provider, c2.provider);

    await Promise.all([waitForSync(c1.provider), waitForSync(c2.provider)]);

    c1.doc.getText("monaco").insert(0, "room-a-text");

    await new Promise((r) => setTimeout(r, 200));

    expect(c2.doc.getText("monaco").toString()).toBe("");
  });

  it("server maintains a Y.Doc per room accessible for reading", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const { roomCode, yjsToken } = createTestRoom();

    const c1 = createYjsClient(server.port, roomCode, yjsToken);
    providers.push(c1.provider);

    await waitForSync(c1.provider);

    c1.doc.getText("monaco").insert(0, "server-readable");

    await new Promise((r) => setTimeout(r, 200));

    const serverDoc = server.getDoc(roomCode);
    expect(serverDoc).toBeDefined();
    expect(serverDoc?.getText("monaco").toString()).toBe("server-readable");
  });

  it("destroys the Yjs doc when the owning room is destroyed", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const { roomCode, yjsToken } = createTestRoom();

    const client = createYjsClient(server.port, roomCode, yjsToken);
    providers.push(client.provider);

    await waitForSync(client.provider);
    client.doc.getText("monaco").insert(0, "ephemeral");
    await new Promise((r) => setTimeout(r, 100));

    expect(server.getDoc(roomCode)).toBeDefined();

    roomManager.destroyRoom(roomCode);
    // Remove from our tracking since we just destroyed it
    createdRoomCodes.splice(createdRoomCodes.indexOf(roomCode), 1);

    expect(server.getDoc(roomCode)).toBeUndefined();
  });

  it("rejects connection with no token", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const { roomCode } = createTestRoom();

    const ws = new WebSocket(`ws://${TEST_HOST}:${server.port}/${roomCode}`);

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4401);
  });

  it("rejects connection with wrong token", async () => {
    const server = await startServer();
    cleanup = server.cleanup;
    const { roomCode } = createTestRoom();

    const ws = new WebSocket(`ws://${TEST_HOST}:${server.port}/${roomCode}?token=wrong-token`);

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4401);
  });

  it("rejects connection to nonexistent room", async () => {
    const server = await startServer();
    cleanup = server.cleanup;

    const ws = new WebSocket(`ws://${TEST_HOST}:${server.port}/nop-nop?token=anything`);

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4401);
  });

  it("rejects Yjs connections from disallowed origins", async () => {
    const server = await startServer({
      allowedOrigins: ["http://localhost:5173"],
    });
    cleanup = server.cleanup;
    const { roomCode, yjsToken } = createTestRoom();

    const ws = new WebSocket(`ws://${TEST_HOST}:${server.port}/${roomCode}?token=${yjsToken}`, {
      origin: "https://evil.example",
    });

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4403);
  });

  it("rejects oversized websocket messages", async () => {
    const server = await startServer({
      maxMessageBytes: 32,
    });
    cleanup = server.cleanup;
    const { roomCode, yjsToken } = createTestRoom();

    const ws = new WebSocket(`ws://${TEST_HOST}:${server.port}/${roomCode}?token=${yjsToken}`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", (error) => reject(error));
    });

    ws.on("error", () => {});
    ws.send(Buffer.alloc(128, 1));

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
    });

    expect(closeCode).toBe(1009);
  });
});
