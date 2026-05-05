import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createLogger } from "../../lib/logger.js";
import { roomManager } from "../../models/RoomManager.js";
import {
  type AccessInviteRecord,
  type AccessSessionRecord,
  type AccessStore,
  createAccessService,
  createInviteCodeHash,
} from "../../services/AccessService.js";
import { setupSocketIO } from "../../ws/socketio.js";
import { registerUpgradeHandler } from "../../ws/upgrade.js";
import { setupYjsServer } from "../../ws/yjs.js";
import { listenOnLocalhost, TEST_HOST } from "../helpers/networkTestHelper.js";

const logger = createLogger("silent");
const sessionSecret = "test-access-secret-that-is-long-enough";

class MemoryAccessStore implements AccessStore {
  invites: AccessInviteRecord[] = [
    {
      id: "invite-1",
      label: "Recruiter",
      codeHash: createInviteCodeHash("demo-code", "0123456789abcdef"),
      maxSessions: 3,
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
    },
  ];
  sessions: AccessSessionRecord[] = [];

  async listUsableInvites(): Promise<AccessInviteRecord[]> {
    return this.invites;
  }

  async createSession(input: {
    inviteId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<AccessSessionRecord | null> {
    const invite = this.invites[0];
    const session: AccessSessionRecord = {
      id: `session-${this.sessions.length + 1}`,
      inviteId: input.inviteId,
      sessionTokenHash: input.sessionTokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      inviteLabel: invite.label,
      inviteExpiresAt: invite.expiresAt,
      inviteRevokedAt: invite.revokedAt,
    };
    this.sessions.push(session);
    return session;
  }

  async findSessionById(sessionId: string): Promise<AccessSessionRecord | null> {
    return this.sessions.find((session) => session.id === sessionId) ?? null;
  }

  async revokeSession(): Promise<void> {}
}

async function createServer() {
  const store = new MemoryAccessStore();
  const accessService = createAccessService({
    store,
    cookieName: "codeshare_access",
    sessionSecret,
    sessionTtlDays: 30,
    secureCookies: false,
  });
  const httpServer = http.createServer();
  const io = new SocketIOServer({
    path: "/ws/socket",
    cors: { origin: "*" },
    serveClient: false,
  });
  io.attach(httpServer, { path: "/ws/socket" });
  setupSocketIO(io, logger, { accessService });

  const { wss } = setupYjsServer(logger, roomManager, { accessService });
  httpServer.removeAllListeners("upgrade");
  registerUpgradeHandler(httpServer, wss, io, logger);
  const port = await listenOnLocalhost(httpServer);

  return {
    accessService,
    port,
    cleanup: async () => {
      io.disconnectSockets(true);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      wss.close();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

describe("private access WebSocket enforcement", () => {
  let cleanup: (() => Promise<void>) | undefined;
  const clients: ClientSocket[] = [];
  const roomCodes: string[] = [];

  afterEach(async () => {
    for (const client of clients) client.disconnect();
    clients.length = 0;
    for (const roomCode of roomCodes) roomManager.destroyRoom(roomCode);
    roomCodes.length = 0;
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it("rejects Socket.io handshakes without an access cookie", async () => {
    const server = await createServer();
    cleanup = server.cleanup;

    const client = ioClient(`http://${TEST_HOST}:${server.port}`, {
      path: "/ws/socket",
      transports: ["websocket"],
      query: { roomCode: "abc-xyz" },
    });
    clients.push(client);

    const error = await new Promise<Error>((resolve) => {
      client.on("connect_error", (err) => resolve(err));
    });

    expect(error.message).toContain("Access required");
  });

  it("allows Socket.io handshakes with a valid access cookie", async () => {
    const server = await createServer();
    cleanup = server.cleanup;
    const login = await server.accessService.login("demo-code", new Date());
    if (!login.allowed) throw new Error("Unable to create access cookie");

    const client = ioClient(`http://${TEST_HOST}:${server.port}`, {
      path: "/ws/socket",
      transports: ["websocket"],
      query: { roomCode: "abc-xyz" },
      extraHeaders: { cookie: login.cookieHeader },
    });
    clients.push(client);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 3000);
      client.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.on("connect_error", reject);
    });

    expect(client.connected).toBe(true);
  });

  it("rejects Yjs upgrades without an access cookie", async () => {
    const server = await createServer();
    cleanup = server.cleanup;
    const room = roomManager.createRoom("collaboration");
    roomCodes.push(room.roomCode);

    const ws = new WebSocket(
      `ws://${TEST_HOST}:${server.port}/ws/yjs/${room.roomCode}?token=${room.yjsToken}`,
    );

    const closeCode = await new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    expect(closeCode).toBe(4401);
  });
});
