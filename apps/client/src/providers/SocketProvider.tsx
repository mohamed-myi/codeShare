import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomCode) return;

    const normalizedRoomCode = roomCode.toLowerCase();
    const s = io({
      path: "/ws/socket",
      autoConnect: true,
      query: { roomCode: normalizedRoomCode },
    });
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
    };
  }, [roomCode]);

  return <SocketContext value={{ socket, connected }}>{children}</SocketContext>;
}
