import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";

/**
 * Handles: code:run, code:submit
 * Rate checks, execution locking, reads Yjs code, builds harness,
 * submits to Judge0, parses result, broadcasts to room.
 */
export function registerExecutionHandler(
  _io: Server,
  _socket: Socket,
  _logger: Logger,
): void {
  // TODO: Implement execution event handlers
}
