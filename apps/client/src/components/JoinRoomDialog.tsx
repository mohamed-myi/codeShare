import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkRoom } from "../lib/api.js";

interface JoinRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type JoinStatus = "idle" | "checking" | "not_found" | "full" | "error";

export function JoinRoomDialog({ isOpen, onClose }: JoinRoomDialogProps) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState<JoinStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRoomCode("");
      setStatus("idle");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase()
      .slice(0, 6);
    setRoomCode(raw);
    if (status !== "idle" && status !== "checking") {
      setStatus("idle");
    }
  }

  const formattedCode =
    roomCode.length > 3 ? `${roomCode.slice(0, 3)}-${roomCode.slice(3)}` : roomCode;

  async function handleJoin() {
    if (roomCode.length !== 6) return;
    const formatted = `${roomCode.slice(0, 3)}-${roomCode.slice(3)}`;
    setStatus("checking");
    try {
      const info = await checkRoom(formatted);
      if (!info.exists) {
        setStatus("not_found");
        return;
      }
      if (
        info.userCount !== undefined &&
        info.maxUsers !== undefined &&
        info.userCount >= info.maxUsers
      ) {
        setStatus("full");
        return;
      }
      onClose();
      navigate(`/room/${formatted}`);
    } catch {
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleJoin();
    }
  }

  if (!isOpen) return null;

  const statusMessage: Record<JoinStatus, string | null> = {
    idle: null,
    checking: null,
    not_found: "Room not found.",
    full: "Room is full.",
    error: "Failed to check room. Try again.",
  };

  const errorText = statusMessage[status];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss is supplementary to the X button
    <div
      className="ui-overlay"
      data-testid="join-room-dialog-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="ui-dialog relative w-full max-w-xs p-6"
        role="dialog"
        aria-modal="true"
        data-testid="join-room-dialog"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--color-text-tertiary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="mb-5 text-lg tracking-[-0.03em] text-[var(--color-text-primary)]">
          Join Room
        </h2>

        <div>
          <p className="mb-1 text-xs text-[var(--color-text-tertiary)]">Room Code</p>
          <input
            ref={inputRef}
            type="text"
            value={formattedCode}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="abc-xyz"
            data-testid="join-room-input"
            className="ui-line-control font-[var(--font-family-mono)] text-lg tracking-[0.16em]"
          />
        </div>

        {errorText && (
          <p className="mt-3 text-sm text-[var(--color-error-text)]" data-testid="join-room-error">
            {errorText}
          </p>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={roomCode.length !== 6 || status === "checking"}
          data-testid="join-room-submit"
          className="ui-flat-button mt-5 w-full"
        >
          {status === "checking" ? "Checking..." : "Join"}
        </button>
      </div>
    </div>
  );
}
