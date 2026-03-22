import type { RoomInfoResponse } from "@codeshare/shared";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { checkRoom } from "../lib/api.js";

export function JoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [roomInfo, setRoomInfo] = useState<RoomInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    setRoomInfo(null);

    checkRoom(roomCode, abortController.signal)
      .then((nextRoomInfo) => {
        setRoomInfo(nextRoomInfo);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError("Failed to check room.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [roomCode]);

  function handleJoin() {
    const trimmed = displayName.trim();
    if (!trimmed || !roomCode) return;
    sessionStorage.setItem("displayName", trimmed);
    navigate(`/room/${roomCode}/session`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
          <Loader2 size={16} className="animate-spin" />
          Checking room...
        </div>
      </div>
    );
  }

  if (error || !roomInfo || !roomInfo.exists) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Room not found</h1>
        <p className="text-[var(--color-text-tertiary)]">
          It may have expired or the link is invalid.
        </p>
        <Link
          to="/"
          className="text-[var(--color-accent)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (
    roomInfo.userCount !== undefined &&
    roomInfo.maxUsers !== undefined &&
    roomInfo.userCount >= roomInfo.maxUsers
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">This room is full</h1>
        <p className="text-[var(--color-text-tertiary)]">
          {roomInfo.userCount}/{roomInfo.maxUsers} users
        </p>
        <Link
          to="/"
          className="text-[var(--color-accent)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const modeLabel = roomInfo.mode === "interview" ? "Mock Interview" : "Collaboration";
  const roleHint = roomInfo.mode === "interview" ? "You'll join as Candidate" : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-primary)] p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Join Room</h1>
      <p className="text-[var(--color-text-tertiary)]">
        {modeLabel} room &mdash; {roomInfo.userCount}/{roomInfo.maxUsers} users
      </p>
      {roleHint && <p className="text-sm text-[var(--color-text-tertiary)]">{roleHint}</p>}
      <div className="flex w-full max-w-md flex-col gap-4">
        <input
          type="text"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        />
        <button
          onClick={handleJoin}
          disabled={!displayName.trim()}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2.5 text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          Join
        </button>
      </div>
    </div>
  );
}
