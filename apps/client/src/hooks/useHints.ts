import { SocketEvents } from "@codeshare/shared";
import { useSocket } from "./useSocket.ts";

export function useHints() {
  const { socket } = useSocket();

  function requestHint() {
    socket?.emit(SocketEvents.HINT_REQUEST);
  }

  function approveHint() {
    socket?.emit(SocketEvents.HINT_APPROVE);
  }

  function denyHint() {
    socket?.emit(SocketEvents.HINT_DENY);
  }

  return { requestHint, approveHint, denyHint };
}
