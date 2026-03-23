import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { getRealtimeHttpBase } from "../lib/realtimeUrl.ts";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  connectionError: null,
});

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const normalizedRoomCode = roomCode.toLowerCase();
    const s = io(getRealtimeHttpBase(), {
      path: "/ws/socket",
      autoConnect: true,
      withCredentials: true,
      query: { roomCode: normalizedRoomCode },
    });
    setSocket(s);

    const handleConnect = () => {
      setConnected(true);
      setConnectionError(null);
    };
    const handleDisconnect = () => {
      setConnected(false);
    };
    const handleConnectError = (error: Error) => {
      setConnected(false);
      setConnectionError(error.message);
    };

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);
    s.on("connect_error", handleConnectError);

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("connect_error", handleConnectError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
      setConnectionError(null);
    };
  }, [roomCode]);

  return <SocketContext value={{ socket, connected, connectionError }}>{children}</SocketContext>;
}
