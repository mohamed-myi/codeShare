import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useRoom } from "../hooks/useRoom.ts";
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

  const yjsToken = state.currentUserId ? sessionStorage.getItem("yjsToken") : null;

  useEffect(() => {
    if (!roomCode || !yjsToken) return;

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

    setDoc(ydoc);
    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
      setDoc(null);
      setProvider(null);
    };
  }, [roomCode, yjsToken]);

  return <YjsContext value={{ doc, provider }}>{children}</YjsContext>;
}
