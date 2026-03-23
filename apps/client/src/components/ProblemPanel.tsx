import type { PendingHintRequest, Problem, RoomMode } from "@codeshare/shared";

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
      <div className="flex h-full items-center justify-center px-6 py-10">
        <p className="text-[var(--color-text-tertiary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-6 py-8" data-testid="problem-panel">
      <div>
        <div className="flex items-center gap-3">
          <h2
            className="text-2xl leading-tight tracking-[-0.04em] text-[var(--color-text-primary)]"
            data-testid="problem-title"
          >
            {problem.title}
          </h2>
          <span className={`text-sm capitalize ${DIFFICULTY_STYLES[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        </div>
        <span className="mt-2 inline-block text-sm text-[var(--color-text-tertiary)]">
          {problem.category}
        </span>
      </div>

      {hint && <HintStatus hint={hint} />}

      <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-secondary)]">
        {renderDescription(problem.description)}
      </div>

      {problem.constraints.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)] pt-6">
          <h3 className="mb-3 text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            Constraints:
          </h3>
          <ul className="list-inside list-disc space-y-1.5 text-sm leading-7 text-[var(--color-text-secondary)]">
            {problem.constraints.map((c) => (
              <li key={c}>{c}</li>
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
            className="text-[var(--color-accent-text)] underline"
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
  const canRequestHint =
    !hint.pendingHintRequest &&
    !hint.isHintStreaming &&
    !hint.executionInProgress &&
    hintsRemaining > 0;

  if (hint.mode !== "collaboration") return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-y border-[var(--color-border-subtle)] py-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Hints remaining: {hintsRemaining}/{hint.hintLimit}
        </p>
        <button
          type="button"
          data-testid="request-hint-button"
          className="ui-flat-button px-3 py-1.5 text-xs"
          disabled={!canRequestHint}
          onClick={hint.onRequestHint}
        >
          Request Hint
        </button>
      </div>

      {hint.pendingHintRequest && isRequester && (
        <div className="border-l border-[var(--color-warning)] pl-4 text-sm text-[var(--color-warning-text)]">
          Waiting for partner&apos;s approval...
        </div>
      )}

      {hint.pendingHintRequest && !isRequester && (
        <div className="border-l border-[var(--color-info)] pl-4">
          <div data-testid="hint-consent-card">
            <p className="text-sm text-[var(--color-info-text)]">Your partner wants a hint.</p>
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                data-testid="approve-hint-button"
                className="ui-flat-button px-3 py-1.5 text-xs"
                onClick={hint.onApproveHint}
              >
                Approve
              </button>
              <button
                type="button"
                data-testid="deny-hint-button"
                className="ui-ghost-button px-0 py-1.5 text-xs text-[var(--color-info-text)]"
                onClick={hint.onDenyHint}
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {hint.isHintStreaming && (
        <div
          className="border-l border-[var(--color-border-subtle)] pl-4 text-sm leading-7 text-[var(--color-text-secondary)]"
          data-testid="hint-output"
        >
          <span>{hint.hintText}</span>
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--color-accent)] align-middle"
          />
        </div>
      )}

      {hasCompletedHint && (
        <div
          className="border-l border-[var(--color-border-subtle)] pl-4 text-sm leading-7 text-[var(--color-text-secondary)]"
          data-testid="hint-output"
        >
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
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable split() output, never reordered
        <code
          key={`${part}-${index}`}
          className="border-b border-[var(--color-border-subtle)] px-0.5 font-[var(--font-family-mono)] text-xs text-[var(--color-text-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: stable split() output, never reordered
      <span key={`text-${index}`}>{part}</span>
    );
  });
}
