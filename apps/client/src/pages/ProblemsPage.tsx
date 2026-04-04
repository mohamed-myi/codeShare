import type { ProblemListItem } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import { Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { ImportDialog } from "../components/ImportDialog.tsx";
import { Select } from "../components/Select.tsx";
import { useProblems } from "../hooks/useProblems.ts";
import { useRoom } from "../hooks/useRoom.ts";
import { useSocket } from "../hooks/useSocket.ts";
import { DIFFICULTY_COLORS } from "../lib/difficultyStyles.ts";

const DEBOUNCE_MS = 300;

export function ProblemsPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { state } = useRoom();
  const { problems, loading, error } = useProblems();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [pendingSelection, setPendingSelection] = useState<ProblemListItem | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = state.users.find((u) => u.id === state.currentUserId);
  const isCandidate = currentUser?.role === "candidate";
  const hasJoinedRoom = Boolean(state.currentUserId);
  const isJoiningRoom = connected && !hasJoinedRoom;
  const importDisabled = state.executionInProgress || state.isHintStreaming;
  const canImport = state.mode === "collaboration" || currentUser?.role === "interviewer";
  const selectionDisabled = !socket || state.executionInProgress || !connected || !hasJoinedRoom;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (state.importStatus?.status === "saved") {
      setShowImportDialog(false);
    }
  }, [state.importStatus]);

  const categories = [...new Set(problems.map((p) => p.category))].sort();

  const filtered = problems.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (difficultyFilter && p.difficulty !== difficultyFilter) return false;
    if (debouncedQuery && !p.title.toLowerCase().includes(debouncedQuery.toLowerCase()))
      return false;
    return true;
  });

  function emitSelection(problemId: string): void {
    socket?.emit(SocketEvents.PROBLEM_SELECT, { problemId });
    navigate(`/room/${roomCode}/session/solve`);
  }

  function handleSelect(problem: ProblemListItem): void {
    if (selectionDisabled) return;
    if (isCandidate && state.mode === "interview") return;
    if (problem.id === state.problemId) {
      navigate(`/room/${roomCode}/session/solve`);
      return;
    }

    if (state.problemId) {
      setPendingSelection(problem);
      return;
    }

    emitSelection(problem.id);
  }

  const handleImportProblem = useCallback(
    (leetcodeUrl: string) => {
      if (importDisabled || !hasJoinedRoom) return;
      socket?.emit(SocketEvents.PROBLEM_IMPORT, { leetcodeUrl });
    },
    [hasJoinedRoom, importDisabled, socket],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">Loading problems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-error-text)]" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto" data-testid="problems-page">
      <div className="px-6 pt-14 pb-4 md:px-12">
        <h1 className="text-[3rem] leading-none font-medium tracking-[-0.04em] text-[var(--color-text-primary)]">
          CodeShare
        </h1>
        <p className="mt-5 text-sm text-[var(--color-text-tertiary)]">
          {filtered.length} {filtered.length === 1 ? "problem" : "problems"} available
        </p>
        {isJoiningRoom && (
          <p
            className="mt-2 text-xs text-[var(--color-text-tertiary)]"
            data-testid="joining-room-message"
            role="status"
          >
            Joining room...
          </p>
        )}
      </div>

      <div
        className="sticky top-0 z-10 grid gap-x-8 gap-y-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] px-6 py-6 md:grid-cols-[minmax(0,1fr)_132px_132px_auto] md:items-end md:px-12"
        data-testid="problems-filter-bar"
      >
        <label className="relative block">
          <input
            type="text"
            aria-label="Search problems"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-line-control text-[1.1rem]"
          />
        </label>

        <Select
          ariaLabel="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Category"
          options={categories.map((cat) => ({ value: cat, label: cat }))}
          className="text-[1.1rem]"
        />

        <Select
          ariaLabel="Difficulty"
          value={difficultyFilter}
          onChange={setDifficultyFilter}
          placeholder="Difficulty"
          options={[
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
          ]}
          className="text-[1.1rem]"
        />

        {canImport && (
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            data-testid="open-import-dialog"
            disabled={importDisabled || !connected || !hasJoinedRoom}
            className="ui-ghost-button justify-self-start text-sm md:col-auto md:justify-self-end"
          >
            <Download size={14} />
            Import
          </button>
        )}
      </div>

      <div className="min-h-0" data-testid="problems-list">
        {filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-[var(--color-text-tertiary)]">
              No problems match your filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {filtered.map((problem, i) => (
              <button
                type="button"
                key={problem.id}
                onClick={() => handleSelect(problem)}
                data-testid={`problem-option-${problem.slug}`}
                disabled={selectionDisabled || (isCandidate && state.mode === "interview")}
                style={{ ["--stagger-delay" as string]: `${Math.min(i * 50, 400)}ms` }}
                className={`fade-up-in grid w-full grid-cols-[44px_minmax(0,1fr)_120px] items-center gap-6 px-6 py-7 text-left transition-all duration-[140ms] ease-in-out hover:bg-white/[0.02] disabled:opacity-40 md:px-12 ${
                  problem.id === state.problemId ? "text-[var(--color-text-primary)]" : ""
                }`}
              >
                <span className="text-left text-[1.05rem] text-[var(--color-text-tertiary)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[1.1rem] tracking-[-0.03em] text-[var(--color-text-primary)]">
                    {problem.title}
                  </div>
                  <div className="mt-1 text-[0.95rem] text-[var(--color-text-tertiary)]">
                    {problem.category}
                  </div>
                </div>
                <span
                  className={`text-right text-sm capitalize ${DIFFICULTY_COLORS[problem.difficulty]}`}
                >
                  {problem.difficulty}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingSelection !== null}
        title="Switch Problem?"
        message="Switching problems will reset your code and hints. Continue?"
        onCancel={() => setPendingSelection(null)}
        onConfirm={() => {
          if (!pendingSelection) return;
          if (selectionDisabled) {
            setPendingSelection(null);
            return;
          }
          emitSelection(pendingSelection.id);
          setPendingSelection(null);
        }}
      />

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSubmit={handleImportProblem}
        importStatus={state.importStatus}
        disabledReason={importDisabled ? "Import is unavailable while code is running." : null}
      />
    </div>
  );
}
