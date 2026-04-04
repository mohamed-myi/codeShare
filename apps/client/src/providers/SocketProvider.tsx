import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { getBrowserLogger } from "../lib/logger.ts";
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
    const logger = getBrowserLogger();
    const s = io(getRealtimeHttpBase(), {
      path: "/ws/socket",
      autoConnect: true,
      withCredentials: true,
      query: { roomCode: normalizedRoomCode },
    });
    setSocket(s);

    let lastSocketId: string | undefined;
    const handleConnect = () => {
      lastSocketId = s.id;
      setConnected(true);
      setConnectionError(null);
      void logger.info({
        event: CLIENT_LOG_EVENTS.CLIENT_SOCKET_CONNECTED,
        roomCode: normalizedRoomCode,
        socketId: s.id,
      });
    };
    const handleDisconnect = () => {
      setConnected(false);
      void logger.warn({
        event: CLIENT_LOG_EVENTS.CLIENT_SOCKET_DISCONNECTED,
        roomCode: normalizedRoomCode,
        socketId: lastSocketId,
      });
    };
    const handleConnectError = (error: Error) => {
      setConnected(false);
      setConnectionError(error.message);
      void logger.error({
        event: CLIENT_LOG_EVENTS.CLIENT_SOCKET_CONNECT_FAILED,
        roomCode: normalizedRoomCode,
        error,
      });
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
