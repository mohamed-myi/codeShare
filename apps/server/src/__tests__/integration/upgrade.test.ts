import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { createLogger } from "../../lib/logger.js";
import { roomManager } from "../../models/RoomManager.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { registerUpgradeHandler } from "../../ws/upgrade.js";
import { setupYjsServer } from "../../ws/yjs.js";
import { listenOnLocalhost, TEST_HOST } from "../helpers/networkTestHelper.js";

const logger = createLogger("silent");

interface TestEnv {
  httpServer: http.Server;
  io: SocketIOServer;
  port: number;
  getDoc: (roomCode: string) => Y.Doc | undefined;
  cleanup: () => Promise<void>;
}

async function createFullServer(): Promise<TestEnv> {
  const httpServer = http.createServer();
  const io = new SocketIOServer({
    path: "/ws/socket",
    cors: { origin: "*" },
    serveClient: false,
  });
  io.attach(httpServer, { path: "/ws/socket" });
  setupSocketIO(io, logger);

  const { wss, getDoc } = setupYjsServer(logger, roomManager);

  // Remove Socket.io's default upgrade listener so we control routing
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);

  const port = await listenOnLocalhost(httpServer);

  return {
    httpServer,
    io,
    port,
    getDoc,
    cleanup: async () => {
      io.disconnectSockets(true);
      await new Promise<void>((r) => io.close(() => r()));
      wss.close();
      await new Promise<void>((r) => httpServer.close(() => r()));
    },
  };
}

describe("HTTP upgrade routing", () => {
  let env: TestEnv | undefined;
  const cleanups: (() => void)[] = [];
  const createdRoomCodes: string[] = [];

  afterEach(async () => {
    for (const fn of cleanups) fn();
    cleanups.length = 0;
    for (const code of createdRoomCodes) {
      roomManager.destroyRoom(code);
    }
    createdRoomCodes.length = 0;
    if (env) {
      await env.cleanup();
      env = undefined;
    }
  });

  function createTestRoom(): { roomCode: string; yjsToken: string } {
    const room = roomManager.createRoom("collaboration");
    createdRoomCodes.push(room.roomCode);
    return { roomCode: room.roomCode, yjsToken: room.yjsToken };
  }

  it("routes /ws/yjs to y-websocket server (Yjs sync works)", async () => {
    env = await createFullServer();
    const { roomCode, yjsToken } = createTestRoom();

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(`ws://${TEST_HOST}:${env.port}/ws/yjs`, roomCode, doc, {
      WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
      params: { token: yjsToken },
    });
    cleanups.push(() => {
      provider.destroy();
      doc.destroy();
    });

    await new Promise<void>((resolve) => {
      if (provider.synced) return resolve();
      provider.on("sync", (synced: boolean) => {
        if (synced) resolve();
      });
    });

    doc.getText("monaco").insert(0, "upgrade-test");
    await new Promise((r) => setTimeout(r, 100));

    expect(doc.getText("monaco").toString()).toBe("upgrade-test");
  });

  it("keys the server-side Yjs doc by room code for /ws/yjs/<roomCode>", async () => {
    env = await createFullServer();
    const { roomCode, yjsToken } = createTestRoom();

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(`ws://${TEST_HOST}:${env.port}/ws/yjs`, roomCode, doc, {
      WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
      params: { token: yjsToken },
    });
    cleanups.push(() => {
      provider.destroy();
      doc.destroy();
    });

    await new Promise<void>((resolve) => {
      if (provider.synced) return resolve();
      provider.on("sync", (synced: boolean) => {
        if (synced) resolve();
      });
    });

    doc.getText("monaco").insert(0, "server-readable");
    await new Promise((r) => setTimeout(r, 100));

    expect(env.getDoc(roomCode)?.getText("monaco").toString()).toBe("server-readable");
    expect(env.getDoc("ws")).toBeUndefined();
  });

  it("routes /ws/socket to Socket.io server (connection works)", async () => {
    env = await createFullServer();

    const client: ClientSocket = ioClient(`http://${TEST_HOST}:${env.port}`, {
      path: "/ws/socket",
      transports: ["websocket"],
      query: { roomCode: "abc-xyz" },
    });
    cleanups.push(() => client.disconnect());

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Socket.io connect timeout")), 3000);
      client.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.on("connect_error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    expect(client.connected).toBe(true);
  });

  it("destroys socket for unknown path /ws/unknown", async () => {
    env = await createFullServer();

    const ws = new WebSocket(`ws://${TEST_HOST}:${env.port}/ws/unknown`);
    cleanups.push(() => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    const result = await new Promise<string>((resolve) => {
      ws.on("error", () => resolve("error"));
      ws.on("close", () => resolve("closed"));
      ws.on("open", () => resolve("open"));
    });

    expect(result).not.toBe("open");
  });

  it("destroys socket for root path /", async () => {
    env = await createFullServer();

    const ws = new WebSocket(`ws://${TEST_HOST}:${env.port}/`);
    cleanups.push(() => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    const result = await new Promise<string>((resolve) => {
      ws.on("error", () => resolve("error"));
      ws.on("close", () => resolve("closed"));
      ws.on("open", () => resolve("open"));
    });

    expect(result).not.toBe("open");
  });

  it("rejects Yjs connection without token via upgrade handler", async () => {
    env = await createFullServer();
    const { roomCode } = createTestRoom();

    const ws = new WebSocket(`ws://${TEST_HOST}:${env.port}/ws/yjs/${roomCode}`);
    cleanups.push(() => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4401);
  });
});
