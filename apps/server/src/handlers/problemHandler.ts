import type { Socket, Server } from "socket.io";
import type { Logger } from "pino";

/**
 * Handles: problem:select, problem:import
 * Role-checks (interviewer-only in interview mode), in-flight guards,
 * loads problem data, resets Yjs doc.
 */
export function registerProblemHandler(
  _io: Server,
  _socket: Socket,
  _logger: Logger,
): void {
  // TODO: Implement problem selection and import handlers
}
