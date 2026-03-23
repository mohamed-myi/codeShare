import type { Difficulty, ProblemListItem } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { ImportDialog } from "../components/ImportDialog.tsx";
import { useProblems } from "../hooks/useProblems.ts";
import { useRoom } from "../hooks/useRoom.ts";
import { useSocket } from "../hooks/useSocket.ts";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-[var(--color-difficulty-easy)]",
  medium: "text-[var(--color-difficulty-medium)]",
  hard: "text-[var(--color-difficulty-hard)]",
};

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
  const importDisabled = state.executionInProgress || state.isHintStreaming;
  const canImport = state.mode === "collaboration" || currentUser?.role === "interviewer";

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
    if (!socket || state.executionInProgress || !connected) return;
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
      if (importDisabled) return;
      socket?.emit(SocketEvents.PROBLEM_IMPORT, { leetcodeUrl });
    },
    [importDisabled, socket],
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
    <div className="flex flex-1 flex-col overflow-hidden" data-testid="problems-page">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Problems</h1>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          {filtered.length} {filtered.length === 1 ? "problem" : "problems"} available
        </p>
      </div>

      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          />
          <input
            type="text"
            aria-label="Search problems"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
          />
        </div>

        <select
          aria-label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          <option value="">Category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          aria-label="Difficulty"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          <option value="">Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {canImport && (
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            data-testid="open-import-dialog"
            disabled={importDisabled || !connected}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
          >
            <Download size={14} />
            Import
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
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
                disabled={
                  state.executionInProgress ||
                  !connected ||
                  (isCandidate && state.mode === "interview")
                }
                className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)] disabled:opacity-40 ${
                  problem.id === state.problemId ? "border-l-2 border-l-[var(--color-accent)]" : ""
                }`}
              >
                <span className="w-10 text-right text-base font-medium text-[var(--color-text-tertiary)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {problem.title}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    {problem.category}
                  </div>
                </div>
                <span
                  className={`text-sm font-medium capitalize ${DIFFICULTY_COLORS[problem.difficulty]}`}
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
          if (state.executionInProgress || !connected) {
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
