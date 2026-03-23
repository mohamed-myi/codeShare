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
      <main className="app-screen flex min-h-screen items-center justify-center px-6">
        <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
          <Loader2 size={16} className="animate-spin" />
          Checking room...
        </div>
      </main>
    );
  }

  if (error || !roomInfo || !roomInfo.exists) {
    return (
      <main className="app-screen flex min-h-screen items-center px-6 py-8 md:px-10">
        <div className="mx-auto w-full max-w-3xl border-t border-[var(--color-border-subtle)] pt-8">
          <p className="ui-copy-kicker">Join Session</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--color-text-primary)]">
            Room not found
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
            It may have expired or the link is invalid.
          </p>
          <Link to="/" className="ui-ghost-button mt-6 text-sm">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (
    roomInfo.userCount !== undefined &&
    roomInfo.maxUsers !== undefined &&
    roomInfo.userCount >= roomInfo.maxUsers
  ) {
    return (
      <main className="app-screen flex min-h-screen items-center px-6 py-8 md:px-10">
        <div className="mx-auto w-full max-w-3xl border-t border-[var(--color-border-subtle)] pt-8">
          <p className="ui-copy-kicker">Join Session</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--color-text-primary)]">
            This room is full
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">
            {roomInfo.userCount}/{roomInfo.maxUsers} users
          </p>
          <Link to="/" className="ui-ghost-button mt-6 text-sm">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const modeLabel = roomInfo.mode === "interview" ? "Mock Interview" : "Collaboration";
  const roleHint = roomInfo.mode === "interview" ? "You'll join as Candidate" : null;

  return (
    <main className="app-screen flex min-h-screen items-center px-6 py-8 md:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-16">
        <section className="flex flex-col justify-center gap-4">
          <p className="ui-copy-kicker">Join Session</p>
          <h1 className="text-5xl leading-[0.96] font-medium tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-6xl">
            Join Room
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
            {modeLabel} room &mdash; {roomInfo.userCount}/{roomInfo.maxUsers} users
          </p>
          {roleHint && <p className="text-sm text-[var(--color-text-tertiary)]">{roleHint}</p>}
        </section>

        <section className="border-t border-[var(--color-border-subtle)] pt-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <label className="block">
            <span className="mb-3 block text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              Display Name
            </span>
            <input
              type="text"
              aria-label="Display name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className="ui-line-control text-base"
            />
          </label>
          <button
            type="button"
            data-testid="join-room-button"
            onClick={handleJoin}
            disabled={!displayName.trim()}
            className="ui-flat-button mt-8 w-full justify-center"
          >
            Join
          </button>
        </section>
      </div>
    </main>
  );
}
