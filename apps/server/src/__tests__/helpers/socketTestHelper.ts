import http from "node:http";
import { Server, type ServerOptions } from "socket.io";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import { listenOnLocalhost, TEST_HOST } from "./networkTestHelper.js";

interface TestServer {
  httpServer: http.Server;
  io: Server;
  port: number;
  cleanup: () => Promise<void>;
}

export async function createTestServer(opts?: Partial<ServerOptions>): Promise<TestServer> {
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

interface EventSource {
  on(event: string, listener: (value: unknown) => void): unknown;
  off(event: string, listener: (value: unknown) => void): unknown;
}

// Keep the established call signature used by the integration suites.
export function waitForEvent<T = unknown>(
  socket: EventSource,
  event: string,
  options: number | { timeoutMs?: number; accept?: (value: T) => boolean } = 3000,
): Promise<T> {
  const { timeoutMs = 3000, accept } =
    typeof options === "number" ? { timeoutMs: options } : options;
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      socket.off("disconnect", onFailure);
      socket.off("connect_error", onFailure);
    };
    const onEvent = (data: unknown) => {
      if (accept && !accept(data as T)) return;
      cleanup();
      resolve(data as T);
    };
    const onFailure = (reason: unknown) => {
      cleanup();
      reject(reason instanceof Error ? reason : new Error(String(reason)));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);
    socket.on(event, onEvent);
    if (event !== "disconnect") socket.on("disconnect", onFailure);
    if (event !== "connect_error") socket.on("connect_error", onFailure);
  });
}
