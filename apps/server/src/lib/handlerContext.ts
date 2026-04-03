import type { Socket } from "socket.io";
import { requestIdLogField, roomCodeLogFields } from "./logger.js";

/**
 * Bundles common handler log context fields (room code + request ID).
 * Use in all handler log statements for consistency.
 *
 * @example
 * session.logger.info({
 *   event: "hint_request_rejected",
 *   ...handlerLogContext(session.roomCode, session.socket),
 *   reason: "cooldown_active",
 * });
 */
export function handlerLogContext(
  roomCode: string | null | undefined,
  socket: Socket,
): Record<string, string> {
  return {
    ...roomCodeLogFields(roomCode),
    ...requestIdLogField(socket),
  };
}
