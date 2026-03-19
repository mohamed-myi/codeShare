import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { RoomInfoResponse } from "@codeshare/shared";
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

    checkRoom(roomCode)
      .then(setRoomInfo)
      .catch(() => setError("Failed to check room."))
      .finally(() => setLoading(false));
  }, [roomCode]);

  function handleJoin() {
    const trimmed = displayName.trim();
    if (!trimmed || !roomCode) return;
    sessionStorage.setItem("displayName", trimmed);
    navigate(`/room/${roomCode}/session`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Checking room...</p>
      </div>
    );
  }

  if (error || !roomInfo || !roomInfo.exists) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Room not found</h1>
        <p className="text-gray-600">
          It may have expired or the link is invalid.
        </p>
        <Link to="/" className="text-blue-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (roomInfo.userCount !== undefined && roomInfo.maxUsers !== undefined && roomInfo.userCount >= roomInfo.maxUsers) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">This room is full</h1>
        <p className="text-gray-600">
          {roomInfo.userCount}/{roomInfo.maxUsers} users
        </p>
        <Link to="/" className="text-blue-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  const modeLabel =
    roomInfo.mode === "interview" ? "Mock Interview" : "Collaboration";
  const roleHint =
    roomInfo.mode === "interview" ? "You'll join as Candidate" : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Join Room</h1>
      <p className="text-gray-600">
        {modeLabel} room &mdash; {roomInfo.userCount}/{roomInfo.maxUsers} users
      </p>
      {roleHint && <p className="text-sm text-gray-500">{roleHint}</p>}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
          className="rounded border px-4 py-2"
        />
        <button
          onClick={handleJoin}
          disabled={!displayName.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Join
        </button>
      </div>
    </div>
  );
}
