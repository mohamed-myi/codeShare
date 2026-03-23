import type { Difficulty, ProblemListItem } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import { useState } from "react";
import { useProblems } from "../hooks/useProblems.ts";
import { useSocket } from "../hooks/useSocket.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { Select } from "./Select.tsx";

interface ProblemSelectorProps {
  currentProblemId: string | null;
  executionInProgress: boolean;
  disabled?: boolean;
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-[var(--color-success-text)]",
  medium: "text-[var(--color-warning-text)]",
  hard: "text-[var(--color-error-text)]",
};

export function ProblemSelector({
  currentProblemId,
  executionInProgress,
  disabled = false,
}: ProblemSelectorProps) {
  const { socket } = useSocket();
  const { problems, loading, error } = useProblems();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [pendingSelection, setPendingSelection] = useState<ProblemListItem | null>(null);

  const categories = [...new Set(problems.map((problem) => problem.category))].sort();
  const filtered = problems.filter((problem) => {
    if (categoryFilter && problem.category !== categoryFilter) {
      return false;
    }
    if (difficultyFilter && problem.difficulty !== difficultyFilter) {
      return false;
    }
    return true;
  });

  function emitSelection(problemId: string): void {
    socket?.emit(SocketEvents.PROBLEM_SELECT, { problemId });
  }

  function handleSelect(problem: ProblemListItem): void {
    if (!socket || executionInProgress || disabled) return;
    if (problem.id === currentProblemId) return;

    if (currentProblemId) {
      setPendingSelection(problem);
      return;
    }

    emitSelection(problem.id);
  }

  if (loading) {
    return <div className="p-4 text-sm text-[var(--color-text-tertiary)]">Loading problems...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-[var(--color-error-text)]" role="alert">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col">
        <div
          className="flex gap-4 border-b border-[var(--color-border-subtle)] px-4 py-4"
          data-testid="problems-filter-bar"
        >
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            options={categories.map((cat) => ({ value: cat, label: cat }))}
            size="compact"
            disabled={executionInProgress || disabled}
          />
          <Select
            value={difficultyFilter}
            onChange={setDifficultyFilter}
            placeholder="All Difficulties"
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
            size="compact"
            disabled={executionInProgress || disabled}
          />
        </div>
        <div className="max-h-48 overflow-y-auto" data-testid="problems-list">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
              No problems match filters.
            </div>
          ) : (
            filtered.map((problem) => (
              <button
                type="button"
                key={problem.id}
                onClick={() => handleSelect(problem)}
                disabled={executionInProgress || disabled}
                className={`flex w-full items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3 text-left text-sm text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:bg-[var(--color-hover-overlay)] disabled:opacity-40 ${
                  problem.id === currentProblemId ? "bg-[var(--color-accent-subtle)]" : ""
                }`}
              >
                <span className="truncate">{problem.title}</span>
                <span
                  className={`ml-2 text-xs font-medium ${DIFFICULTY_COLORS[problem.difficulty]}`}
                >
                  {problem.difficulty}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={pendingSelection !== null}
        title="Switch Problem?"
        message="Switching problems will reset your code and hints. Continue?"
        onCancel={() => setPendingSelection(null)}
        onConfirm={() => {
          if (!pendingSelection) {
            return;
          }
          if (executionInProgress || disabled) {
            setPendingSelection(null);
            return;
          }
          emitSelection(pendingSelection.id);
          setPendingSelection(null);
        }}
      />
    </>
  );
}
