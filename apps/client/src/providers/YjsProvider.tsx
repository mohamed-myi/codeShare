import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useParams } from "react-router-dom";

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
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const ydoc = new Y.Doc();
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/yjs`;
    const wsProvider = new WebsocketProvider(wsUrl, roomCode, ydoc);

    setDoc(ydoc);
    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [roomCode]);

  return (
    <YjsContext value={{ doc, provider }}>
      {children}
    </YjsContext>
  );
}
