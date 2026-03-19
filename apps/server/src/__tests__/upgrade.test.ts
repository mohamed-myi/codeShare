import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import WebSocket from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { Server as SocketIOServer } from "socket.io";
import { registerUpgradeHandler } from "../ws/upgrade.js";
import { setupSocketIO } from "../ws/socketio.js";
import { setupYjsServer } from "../ws/yjs.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("silent");

interface TestEnv {
  httpServer: http.Server;
  io: SocketIOServer;
  port: number;
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

  const { wss, getDoc: _getDoc } = setupYjsServer(logger);

  // Remove Socket.io's default upgrade listener so we control routing
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      resolve(addr && typeof addr === "object" ? addr.port : 0);
    });
  });

  return {
    httpServer,
    io,
    port,
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

  afterEach(async () => {
    for (const fn of cleanups) fn();
    cleanups.length = 0;
    if (env) {
      await env.cleanup();
      env = undefined;
    }
  });

  it("routes /ws/yjs to y-websocket server (Yjs sync works)", async () => {
    env = await createFullServer();

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      `ws://127.0.0.1:${env.port}/ws/yjs`,
      "test-room",
      doc,
      { WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket },
    );
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

  it("routes /ws/socket to Socket.io server (connection works)", async () => {
    env = await createFullServer();

    const client: ClientSocket = ioClient(`http://127.0.0.1:${env.port}`, {
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

    const ws = new WebSocket(`ws://127.0.0.1:${env.port}/ws/unknown`);
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

    const ws = new WebSocket(`ws://127.0.0.1:${env.port}/`);
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
});
