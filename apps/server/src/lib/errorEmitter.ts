import type { ExecutionErrorType } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import type { Server, Socket } from "socket.io";

export interface EmissionContext {
  socket: Pick<Socket, "emit">;
  io?: Pick<Server, "to">;
  roomCode?: string;
}

export type EmissionScope = "socket" | "room";

export function emitScopedEvent(
  context: EmissionContext,
  eventName: string,
  payload: Record<string, unknown>,
  scope: EmissionScope,
): void {
  if (scope === "room" && context.io && context.roomCode) {
    context.io.to(context.roomCode).emit(eventName, payload);
    return;
  }

  context.socket.emit(eventName, payload);
}

export function emitMessageEvent(
  context: EmissionContext,
  eventName: string,
  message: string,
  scope: EmissionScope = "socket",
): void {
  emitScopedEvent(context, eventName, { message }, scope);
}

export function emitExecutionError(
  context: EmissionContext,
  errorType: ExecutionErrorType,
  message: string,
  scope: EmissionScope,
): void {
  emitScopedEvent(context, SocketEvents.EXECUTION_ERROR, { errorType, message }, scope);
}
