import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RoomMode } from "@codeshare/shared";
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
      const { roomCode } = await createRoom(mode);
      sessionStorage.setItem("displayName", trimmed);
      navigate(`/room/${roomCode}/session`);
    } catch {
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">CodeShare</h1>
      <p className="text-lg text-gray-600">
        Collaborative coding. No setup required.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
          className="rounded border px-4 py-2"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as RoomMode)}
          className="rounded border px-4 py-2"
        >
          <option value="collaboration">Collaboration</option>
          <option value="interview">Mock Interview</option>
        </select>
        <button
          onClick={handleCreate}
          disabled={!displayName.trim() || loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
