import type { RoomMode } from "@codeshare/shared";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api.js";

export function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<RoomMode>("collaboration");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <input
          type="text"
          aria-label="Display name"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-4 py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
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
        {error && <p className="text-sm text-[var(--color-error-text)]">{error}</p>}
      </div>
    </main>
  );
}
