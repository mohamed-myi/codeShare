import { io, type Socket } from "socket.io-client";
import { hrtimeMs } from "./clock.js";
import { getLoadTestLogger } from "./logger.js";

export interface TimedSocket {
  socket: Socket;
  connectLatencyMs: number;
}

export interface EventResult<T> {
  data: T;
  latencyMs: number;
}

const CONNECT_TIMEOUT_MS = 10_000;
const logger = getLoadTestLogger();

export async function createLoadSocket(
  serverUrl: string,
  roomCode: string,
  extraQuery?: Record<string, string>,
): Promise<TimedSocket> {
  return new Promise<TimedSocket>((resolve, reject) => {
    const start = hrtimeMs();

    const socket = io(serverUrl, {
      path: "/ws/socket",
      transports: ["websocket"],
      query: { roomCode, ...extraQuery },
      extraHeaders: { origin: "http://localhost:5173" },
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      logger.error("load_test_socket_connect_failed", {
        server_url: serverUrl,
        room_code: roomCode,
        error_message: `Socket connect timed out after ${CONNECT_TIMEOUT_MS}ms`,
      });
      reject(new Error(`Socket connect timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve({
        socket,
        connectLatencyMs: hrtimeMs() - start,
      });
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      logger.error("load_test_socket_connect_failed", {
        server_url: serverUrl,
        room_code: roomCode,
        error_message: err.message,
      });
      reject(new Error(`Socket connect failed: ${err.message}`));
    });
  });
}

export function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 10_000,
): Promise<EventResult<T>> {
  return new Promise<EventResult<T>>((resolve, reject) => {
    const start = hrtimeMs();

    const timeout = setTimeout(() => {
      socket.off(event, handler);
      logger.warn("load_test_socket_event_wait_failed", {
        event_name: event,
        timeout_ms: timeoutMs,
      });
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (data: T) => {
      clearTimeout(timeout);
      resolve({
        data,
        latencyMs: hrtimeMs() - start,
      });
    };

    socket.once(event, handler);
  });
}

export function emitTimed(socket: Socket, event: string, data: unknown): number {
  const timestamp = hrtimeMs();
  socket.emit(event, data);
  return timestamp;
}

export function disconnectSocket(ts: TimedSocket): void {
  ts.socket.disconnect();
}
