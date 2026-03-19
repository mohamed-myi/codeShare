import { SocketEvents } from "@codeshare/shared";
import { useSocket } from "./useSocket.ts";

export function useExecution() {
  const { socket } = useSocket();

  function run() {
    socket?.emit(SocketEvents.CODE_RUN);
  }

  function submit() {
    socket?.emit(SocketEvents.CODE_SUBMIT);
  }

  return { run, submit };
}
