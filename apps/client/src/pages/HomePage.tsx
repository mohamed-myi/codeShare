import type { RoomMode } from "@codeshare/shared";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkRoom, createRoom } from "../lib/api.js";
import {
  formatRoomCode,
  isRoomCodeComplete,
  normalizeRoomCodeInput,
  stripRoomCodeInput,
} from "../lib/roomCodeUtils.js";

type Tab = "create" | "join";

export function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<RoomMode>("collaboration");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCodeStripped, setRoomCodeStripped] = useState("");

  function handleTabSwitch(tab: Tab) {
    setActiveTab(tab);
    setError(null);
  }

  function handleRoomCodeChange(raw: string) {
    const stripped = stripRoomCodeInput(raw);
    setRoomCodeStripped(stripped);
    setRoomCodeInput(formatRoomCode(stripped));
    if (error) setError(null);
  }

  async function handleCreate() {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const { roomCode } = await createRoom(mode, trimmed);
      sessionStorage.setItem("displayName", trimmed);
      navigate(`/room/${roomCode}/session`);
    } catch {
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  }

  async function handleJoin() {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    const normalized = normalizeRoomCodeInput(roomCodeInput);
    if (!normalized) {
      setError("Invalid room code format.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await checkRoom(normalized);
      if (!info.exists) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }
      if (
        info.userCount !== undefined &&
        info.maxUsers !== undefined &&
        info.userCount >= info.maxUsers
      ) {
        setError("Room is full.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem("displayName", trimmed);
      navigate(`/room/${normalized}/session`);
    } catch {
      setError("Failed to join room. Please try again.");
      setLoading(false);
    }
  }

  const nameInputClass =
    "rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]";

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-primary)] p-8"
      data-testid="home-page"
    >
      <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">CodeShare</h1>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Collaborative coding. No setup required.
      </p>

      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            data-testid="tab-create"
            onClick={() => handleTabSwitch("create")}
            className={`flex-1 border-b-2 pb-2 text-sm font-medium transition-colors duration-[var(--transition-fast)] ${
              activeTab === "create"
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "join"}
            data-testid="tab-join"
            onClick={() => handleTabSwitch("join")}
            className={`flex-1 border-b-2 pb-2 text-sm font-medium transition-colors duration-[var(--transition-fast)] ${
              activeTab === "join"
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Join Room
          </button>
        </div>

        {activeTab === "create" && (
          <>
            <input
              type="text"
              aria-label="Display name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className={nameInputClass}
            />
            <select
              aria-label="Room mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as RoomMode)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-4 py-2.5 text-[var(--color-text-primary)]"
            >
              <option value="collaboration">Collaboration</option>
              <option value="interview">Mock Interview</option>
            </select>
            <button
              type="button"
              data-testid="create-room-button"
              onClick={handleCreate}
              disabled={!displayName.trim() || loading}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2.5 text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating..." : "Create Room"}
            </button>
          </>
        )}

        {activeTab === "join" && (
          <>
            <input
              type="text"
              aria-label="Room code"
              placeholder="abc-xyz"
              value={roomCodeInput}
              onChange={(e) => handleRoomCodeChange(e.target.value)}
              maxLength={7}
              data-testid="room-code-input"
              className={`${nameInputClass} text-center font-[var(--font-family-mono)] tracking-widest`}
            />
            <input
              type="text"
              aria-label="Display name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className={nameInputClass}
            />
            <button
              type="button"
              data-testid="join-room-button"
              onClick={handleJoin}
              disabled={!isRoomCodeComplete(roomCodeStripped) || !displayName.trim() || loading}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2.5 text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Joining..." : "Join Room"}
            </button>
          </>
        )}

        {error && <p className="text-sm text-[var(--color-error-text)]">{error}</p>}
      </div>
    </main>
  );
}
