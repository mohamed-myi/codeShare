import type { RoomMode } from "@codeshare/shared";
import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select } from "../components/Select.tsx";
import { checkRoom, createRoom } from "../lib/api.js";
import { getBrowserLogger } from "../lib/logger.ts";
import {
  formatRoomCode,
  isRoomCodeComplete,
  normalizeRoomCodeInput,
  stripRoomCodeInput,
} from "../lib/roomCodeUtils.js";

type Tab = "create" | "join";

export function HomePage() {
  const navigate = useNavigate();
  const logger = getBrowserLogger(window.location.pathname);
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
      try {
        sessionStorage.setItem("displayName", trimmed);
      } catch (error) {
        await logger.error({
          event: CLIENT_LOG_EVENTS.CLIENT_SESSION_PERSIST_FAILED,
          error: error instanceof Error ? error : new Error("Failed to store display name."),
          context: {
            storage_key: "displayName",
          },
        });
        throw error;
      }
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
      try {
        sessionStorage.setItem("displayName", trimmed);
      } catch (error) {
        await logger.error({
          event: CLIENT_LOG_EVENTS.CLIENT_SESSION_PERSIST_FAILED,
          error: error instanceof Error ? error : new Error("Failed to store display name."),
          context: {
            storage_key: "displayName",
          },
        });
        throw error;
      }
      navigate(`/room/${normalized}/session`);
    } catch {
      setError("Failed to join room. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      className="app-screen flex min-h-screen flex-col px-6 py-8 md:px-10 md:py-10"
      data-testid="home-page"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)]">
          <span>CS</span>
        </div>
        <div className="grid flex-1 items-start gap-16 pt-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:pt-20">
          <section className="max-w-3xl" data-testid="home-hero">
            <h1 className="text-5xl leading-[0.96] font-medium tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-6xl">
              CodeShare
            </h1>
            <p className="mt-5 text-sm text-[var(--color-text-tertiary)]">
              Solve problems with your friends.
            </p>
          </section>

          <section className="fade-up-in" data-testid="home-actions">
            <div className="flex" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "create"}
                data-testid="tab-create"
                onClick={() => handleTabSwitch("create")}
                className={`flex-1 border-b pb-3 text-left text-sm transition-all duration-[140ms] ease-in-out ${
                  activeTab === "create"
                    ? "border-white/80 text-[var(--color-text-primary)]"
                    : "border-white/10 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
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
                className={`flex-1 border-b pb-3 text-left text-sm transition-all duration-[140ms] ease-in-out ${
                  activeTab === "join"
                    ? "border-white/80 text-[var(--color-text-primary)]"
                    : "border-white/10 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                Join Room
              </button>
            </div>

            <div className="mt-10 space-y-6">
              {activeTab === "create" ? (
                <>
                  <label className="block">
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

                  <Select
                    ariaLabel="Room mode"
                    value={mode}
                    onChange={(v) => setMode(v as RoomMode)}
                    options={[
                      { value: "collaboration", label: "Collaboration" },
                      { value: "interview", label: "Mock Interview" },
                    ]}
                  />

                  <button
                    type="button"
                    data-testid="create-room-button"
                    onClick={handleCreate}
                    disabled={!displayName.trim() || loading}
                    className="ui-flat-button w-full justify-center"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Creating..." : "Create Room"}
                  </button>
                </>
              ) : (
                <>
                  <label className="block">
                    <input
                      type="text"
                      aria-label="Room code"
                      placeholder="abc-xyz"
                      value={roomCodeInput}
                      onChange={(e) => handleRoomCodeChange(e.target.value)}
                      maxLength={7}
                      data-testid="room-code-input"
                      className="ui-line-control font-[var(--font-family-mono)] text-base tracking-[0.22em]"
                    />
                  </label>

                  <label className="block">
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
                    disabled={
                      !isRoomCodeComplete(roomCodeStripped) || !displayName.trim() || loading
                    }
                    className="ui-flat-button w-full justify-center"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Joining..." : "Join Room"}
                  </button>
                </>
              )}

              {error && <p className="text-sm text-[var(--color-error-text)]">{error}</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
