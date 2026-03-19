import { useSocketContext } from "../providers/SocketProvider.tsx";

export function useSocket() {
  return useSocketContext();
}
