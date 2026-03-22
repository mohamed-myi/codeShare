import http from "node:http";
import { Server, type ServerOptions } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { listenOnLocalhost, TEST_HOST } from "./networkTestHelper.js";

interface TestServer {
  httpServer: http.Server;
  io: Server;
  port: number;
  cleanup: () => Promise<void>;
}

export async function createTestServer(
  opts?: Partial<ServerOptions>,
): Promise<TestServer> {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    path: "/ws/socket",
    cors: { origin: "*" },
    ...opts,
  });

  const port = await listenOnLocalhost(httpServer);

  const cleanup = async () => {
    io.disconnectSockets(true);
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  };

  return { httpServer, io, port, cleanup };
}

export function createTestClient(
  port: number,
  roomCode: string,
  opts?: Record<string, unknown>,
): ClientSocket {
  return ioClient(`http://${TEST_HOST}:${port}`, {
    path: "/ws/socket",
    transports: ["websocket"],
    autoConnect: true,
    query: { roomCode },
    ...opts,
  });
}

export function waitForEvent<T = unknown>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
