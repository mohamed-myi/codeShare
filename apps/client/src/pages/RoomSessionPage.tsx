import { AlertTriangle, Clock, WifiOff } from "lucide-react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { Header } from "../components/Header.tsx";
import { RoomErrorBoundary } from "../components/RoomErrorBoundary.tsx";
import { useRoom } from "../hooks/useRoom.ts";
import { useSocket } from "../hooks/useSocket.ts";
import { RoomProvider } from "../providers/RoomProvider.tsx";
import { SocketProvider } from "../providers/SocketProvider.tsx";
import { YjsProvider } from "../providers/YjsProvider.tsx";

export function RoomSessionPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const displayName = sessionStorage.getItem("displayName")?.trim();

  if (!roomCode) {
    return <Navigate to="/" replace />;
  }

  if (!displayName) {
    return <Navigate to={`/room/${roomCode}`} replace />;
  }

  return (
    <RoomErrorBoundary key={roomCode}>
      <SocketProvider key={`socket-${roomCode}`}>
        <RoomProvider>
          <YjsProvider key={`yjs-${roomCode}`}>
            <RoomSessionLayout />
          </YjsProvider>
        </RoomProvider>
      </SocketProvider>
    </RoomErrorBoundary>
  );
}

function RoomSessionLayout() {
  const { state } = useRoom();
  const { connected, connectionError } = useSocket();
  const connectedCount = state.users.filter((u) => u.connected).length;
  const bannerError = connectionError ?? state.lastError;

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg-primary)]">
      <Header
        roomCode={state.roomCode}
        mode={state.mode}
        users={state.users}
        connected={connected}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        {!connected && (
          <div
            data-testid="reconnecting-banner"
            className="flex items-center justify-center gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-warning-subtle)] px-4 py-1.5 text-center text-xs text-[var(--color-warning-text)]"
            role="status"
          >
            <WifiOff size={12} />
            Reconnecting to the room...
          </div>
        )}
        {bannerError && (
          <div
            data-testid="room-error-banner"
            className="flex items-center justify-center gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-error-subtle)] px-4 py-1.5 text-center text-xs text-[var(--color-error-text)]"
            role="alert"
          >
            <AlertTriangle size={12} />
            {bannerError}
          </div>
        )}
        {connectedCount < 2 && (
          <div
            data-testid="waiting-banner"
            className="flex items-center justify-center gap-2 bg-[var(--color-warning-subtle)] px-4 py-1.5 text-center text-xs text-[var(--color-warning-text)]"
          >
            <Clock size={12} />
            Waiting for partner...
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
