import type { RoomMode, RoomUser } from "@codeshare/shared";
import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { JoinRoomDialog } from "./JoinRoomDialog.js";
import { RoomCodeModal } from "./RoomCodeModal.js";

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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const isSolverActive = location.pathname.endsWith("/solve");
  const modeLabel = mode === "interview" ? "Interview" : "Collab";

  function handleNavigate() {
    const base = `/room/${routeRoomCode}/session`;
    navigate(isSolverActive ? base : `${base}/solve`);
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center border-b border-[var(--color-border-subtle)] px-6 text-sm md:px-8"
      data-testid="room-header"
    >
      <div className="flex min-w-0 items-center gap-6">
        <span className="text-[var(--color-text-secondary)]">CodeShare</span>
        <span className="text-[var(--color-text-secondary)]">{modeLabel}</span>
        <button
          type="button"
          className="font-[var(--font-family-mono)] text-xs tracking-[0.16em] text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
          data-testid="room-code"
          onClick={() => setIsShareOpen(true)}
        >
          {roomCode}
        </button>
        <button
          type="button"
          onClick={() => setIsJoinOpen(true)}
          className="text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
          data-testid="join-room-button"
        >
          Join
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex min-w-0 items-center gap-5 text-xs">
        {!connected && <span className="text-[var(--color-warning-text)]">Reconnecting...</span>}
        {users.length < 2 && connected && (
          <div className="flex items-center gap-3 text-[var(--color-text-tertiary)]">
            {users.map((user) => (
              <span key={user.id} className="flex items-center gap-1.5 truncate">
                <span
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    user.connected ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
                  }`}
                />
                {user.displayName}
              </span>
            ))}
            <span className="text-[var(--color-text-tertiary)]">Waiting for partner</span>
          </div>
        )}
        {users.length >= 2 && (
          <div className="flex min-w-0 items-center gap-3 truncate text-[var(--color-text-tertiary)]">
            {users.map((user) => (
              <span key={user.id} className="flex items-center gap-1.5 truncate">
                <span
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    user.connected ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
                  }`}
                />
                {user.displayName}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleNavigate}
        data-testid="toggle-problems-view"
        className="ml-6 text-sm text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
      >
        {isSolverActive ? "Problems" : "Back to Solver"}
      </button>

      <RoomCodeModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomCode={roomCode}
      />

      <JoinRoomDialog isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
    </header>
  );
}
