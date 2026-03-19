import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";

/**
 * Handles: hint:request, hint:approve, hint:deny
 * Implements the mutual consent state machine with 30s timeout.
 * Delivers stored hints first, falls back to LLM streaming.
 */
export function registerHintHandler(
  _io: Server,
  _socket: Socket,
  _logger: Logger,
): void {
  // TODO: Implement hint consent and delivery handlers
}
