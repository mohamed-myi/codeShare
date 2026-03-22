import type { RoomMode, RoomUser } from "@codeshare/shared";
import { Square } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface HeaderProps {
  roomCode: string;
  mode: RoomMode;
  users: RoomUser[];
  connected: boolean;
}

export function Header({ roomCode, mode, users, connected }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: routeRoomCode } = useParams<{ roomCode: string }>();

  const isSolverActive = location.pathname.endsWith("/solve");
  const modeLabel = mode === "interview" ? "Interview" : "Collab";

  function handleNavigate() {
    const base = `/room/${routeRoomCode}/session`;
    navigate(isSolverActive ? base : `${base}/solve`);
  }

  return (
    <header className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] px-4">
      <div className="flex items-center gap-2">
        <Square size={14} className="fill-[var(--color-accent)] text-[var(--color-accent)]" />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">CodeShare</span>
      </div>

      <span className="text-sm text-[var(--color-text-secondary)]">{modeLabel}</span>

      <span className="font-[var(--font-family-mono)] text-xs text-[var(--color-text-tertiary)]">
        {roomCode}
      </span>

      <div className="flex items-center gap-2">
        {users.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                user.connected ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
              }`}
            />
            {user.displayName}
          </span>
        ))}
      </div>

      {!connected && (
        <span className="text-xs text-[var(--color-warning-text)]">Reconnecting...</span>
      )}

      <div className="flex-1" />

      {users.length < 2 && connected && (
        <span className="text-xs text-[var(--color-text-tertiary)]">Waiting for partner...</span>
      )}

      <button
        type="button"
        onClick={handleNavigate}
        className="text-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:text-[var(--color-text-primary)]"
      >
        {isSolverActive ? "Problems" : "Back to Solver"}
      </button>
    </header>
  );
}
