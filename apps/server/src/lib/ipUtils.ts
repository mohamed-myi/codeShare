import type { Socket } from "socket.io";

export function getClientIp(socket: Socket): string {
  return (socket.data.clientIp as string | undefined) ?? "unknown";
}
