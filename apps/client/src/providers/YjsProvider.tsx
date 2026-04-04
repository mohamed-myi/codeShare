import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useRoom } from "../hooks/useRoom.ts";
import { getBrowserLogger } from "../lib/logger.ts";
import { getRealtimeWsBase } from "../lib/realtimeUrl.ts";

interface YjsContextValue {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
}

const YjsContext = createContext<YjsContextValue>({
  doc: null,
  provider: null,
});

export function useYjsContext(): YjsContextValue {
  return useContext(YjsContext);
}

export function YjsProvider({ children }: { children: ReactNode }) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { state } = useRoom();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  let yjsToken: string | null = null;
  if (state.currentUserId) {
    try {
      yjsToken = sessionStorage.getItem("yjsToken");
    } catch {
      // sessionStorage may throw in private browsing or when quota is exceeded
    }
  }

  useEffect(() => {
    if (!roomCode) {
      setDoc(null);
      setProvider(null);
      return;
    }

    const logger = getBrowserLogger();

    if (state.currentUserId && !yjsToken) {
      setDoc(null);
      setProvider(null);
      void logger.warn({
        event: CLIENT_LOG_EVENTS.CLIENT_YJS_TOKEN_MISSING,
        roomCode,
      });
      return;
    }
    if (!yjsToken) {
      setDoc(null);
      setProvider(null);
      return;
    }

    const normalizedRoomCode = roomCode.toLowerCase();
    const ydoc = new Y.Doc();
    const wsProvider = new WebsocketProvider(
      `${getRealtimeWsBase()}/ws/yjs`,
      normalizedRoomCode,
      ydoc,
      {
        params: { token: yjsToken },
      },
    );
    const handleStatus = (event: { status: string }) => {
      if (event.status === "connected") {
        void logger.info({
          event: CLIENT_LOG_EVENTS.CLIENT_YJS_CONNECTED,
          roomCode: normalizedRoomCode,
        });
        return;
      }

      if (event.status === "disconnected") {
        void logger.warn({
          event: CLIENT_LOG_EVENTS.CLIENT_YJS_DISCONNECTED,
          roomCode: normalizedRoomCode,
        });
      }
    };
    const handleConnectionError = (error: unknown) => {
      void logger.error({
        event: CLIENT_LOG_EVENTS.CLIENT_YJS_CONNECTION_FAILED,
        roomCode: normalizedRoomCode,
        error: error instanceof Error ? error : new Error("Yjs connection failed."),
      });
    };

    void logger.info({
      event: CLIENT_LOG_EVENTS.CLIENT_YJS_CONNECT_STARTED,
      roomCode: normalizedRoomCode,
    });
    wsProvider.on("status", handleStatus);
    wsProvider.on("connection-error", handleConnectionError);

    setDoc(ydoc);
    setProvider(wsProvider);

    return () => {
      wsProvider.off("status", handleStatus);
      wsProvider.off("connection-error", handleConnectionError);
      wsProvider.destroy();
      ydoc.destroy();
      setDoc(null);
      setProvider(null);
    };
  }, [roomCode, state.currentUserId, yjsToken]);

  return <YjsContext value={{ doc, provider }}>{children}</YjsContext>;
}
