import type { PendingHintRequest, Problem, RoomMode } from "@codeshare/shared";
import { Lightbulb } from "lucide-react";

interface HintProps {
  hintsUsed: number;
  hintLimit: number;
  pendingHintRequest: PendingHintRequest | null;
  isHintStreaming: boolean;
  executionInProgress: boolean;
  hintText: string;
  currentUserId: string | null;
  mode: RoomMode;
  onRequestHint: () => void;
  onApproveHint: () => void;
  onDenyHint: () => void;
}

interface ProblemPanelProps {
  problem: Problem | null;
  emptyMessage?: string;
  hint?: HintProps;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-[var(--color-difficulty-easy)]",
  medium: "text-[var(--color-difficulty-medium)]",
  hard: "text-[var(--color-difficulty-hard)]",
};

export function ProblemPanel({
  problem,
  emptyMessage = "Select a problem to begin.",
  hint,
}: ProblemPanelProps) {
  if (!problem) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-[var(--color-text-tertiary)]">{emptyMessage}</p>
      </div>
    );
  }

  // TODO: Re-enable hint button by removing the `false &&` guard
  const showHintButton =
    false &&
    hint &&
    hint.mode === "collaboration" &&
    !hint.pendingHintRequest &&
    !hint.isHintStreaming &&
    !hint.executionInProgress &&
    remainingHints(hint.hintsUsed, hint.hintLimit) > 0;

  const hasCompletedHint = hint && !hint.isHintStreaming && hint.hintText.trim().length > 0;

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {problem.title}
          </h2>
          <span
            className={`text-xs font-medium capitalize ${DIFFICULTY_STYLES[problem.difficulty]}`}
          >
            {problem.difficulty}
          </span>
          {showHintButton && (
            <>
              <div className="flex-1" />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)]"
                onClick={hint.onRequestHint}
              >
                <Lightbulb size={12} />
                {hasCompletedHint
                  ? `Next Hint (${remainingHints(hint.hintsUsed, hint.hintLimit)} remaining)`
                  : `Get Hint (${remainingHints(hint.hintsUsed, hint.hintLimit)} remaining)`}
              </button>
            </>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-tertiary)]">{problem.category}</span>
      </div>

      {hint && <HintStatus hint={hint} />}

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {renderDescription(problem.description)}
      </div>

      {problem.constraints.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Constraints:
          </h3>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-[var(--color-text-secondary)]">
            {problem.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {problem.source === "user_submitted" && problem.sourceUrl && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Problem sourced from{" "}
          <a
            href={problem.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] underline"
          >
            LeetCode
          </a>
        </p>
      )}
    </div>
  );
}

function HintStatus({ hint }: { hint: HintProps }) {
  const isRequester = hint.pendingHintRequest?.requestedBy === hint.currentUserId;
  const hasCompletedHint = !hint.isHintStreaming && hint.hintText.trim().length > 0;
  const hintsRemaining = remainingHints(hint.hintsUsed, hint.hintLimit);

  if (hint.mode !== "collaboration") return null;

  return (
    <>
      {hint.pendingHintRequest && isRequester && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-subtle)] px-3 py-2 text-sm text-[var(--color-warning-text)]">
          Waiting for partner&apos;s approval...
        </div>
      )}

      {hint.pendingHintRequest && !isRequester && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-info)] bg-[var(--color-info-subtle)] px-3 py-3">
          <p className="text-sm font-medium text-[var(--color-info-text)]">
            Your partner wants a hint.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-[var(--radius-sm)] bg-[var(--color-info)] px-3 py-1.5 text-sm text-white transition-colors duration-[var(--transition-fast)]"
              onClick={hint.onApproveHint}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-[var(--color-info)] px-3 py-1.5 text-sm text-[var(--color-info-text)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-info-subtle)]"
              onClick={hint.onDenyHint}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {hint.isHintStreaming && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] px-3 py-3 text-sm text-[var(--color-text-secondary)]">
          <span>{hint.hintText}</span>
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--color-accent)] align-middle"
          />
        </div>
      )}

      {hasCompletedHint && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] px-3 py-3 text-sm text-[var(--color-text-secondary)]">
          {hint.hintText}
        </div>
      )}

      {!hint.pendingHintRequest && !hint.isHintStreaming && hintsRemaining === 0 && (
        <p className="text-sm text-[var(--color-text-tertiary)]">All hints used</p>
      )}

      {hint.executionInProgress && !hint.pendingHintRequest && !hint.isHintStreaming && (
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Finish the current execution before requesting a hint.
        </p>
      )}
    </>
  );
}

function remainingHints(hintsUsed: number, hintLimit: number): number {
  return Math.max(hintLimit - hintsUsed, 0);
}

function renderDescription(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5 text-xs text-[var(--color-text-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
