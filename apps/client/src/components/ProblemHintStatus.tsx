import type { PendingHintRequest, RoomMode } from "@codeshare/shared";

export interface ProblemHintStatusProps {
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

export function ProblemHintStatus({
  hintsUsed,
  hintLimit,
  pendingHintRequest,
  isHintStreaming,
  executionInProgress,
  hintText,
  currentUserId,
  mode,
  onRequestHint,
  onApproveHint,
  onDenyHint,
}: ProblemHintStatusProps) {
  const isRequester = pendingHintRequest?.requestedBy === currentUserId;
  const hasCompletedHint = !isHintStreaming && hintText.trim().length > 0;
  const hintsRemaining = remainingHints(hintsUsed, hintLimit);
  const canRequestHint =
    !pendingHintRequest && !isHintStreaming && !executionInProgress && hintsRemaining > 0;

  if (mode !== "collaboration") {
    return (
      <div
        className="border-y border-[var(--color-border-subtle)] py-4"
        data-testid="interview-hint-notice"
      >
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Hints are not available in interview mode.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-y border-[var(--color-border-subtle)] py-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Hints remaining: {hintsRemaining}/{hintLimit}
        </p>
        <button
          type="button"
          data-testid="request-hint-button"
          className="ui-flat-button px-3 py-1.5 text-xs"
          disabled={!canRequestHint}
          onClick={onRequestHint}
        >
          Request Hint
        </button>
      </div>

      {pendingHintRequest && isRequester && (
        <div className="border-l border-[var(--color-warning)] pl-4 text-sm text-[var(--color-warning-text)]">
          Waiting for partner&apos;s approval...
        </div>
      )}

      {pendingHintRequest && !isRequester && (
        <div className="border-l border-[var(--color-info)] pl-4">
          <div data-testid="hint-consent-card">
            <p className="text-sm text-[var(--color-info-text)]">Your partner wants a hint.</p>
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                data-testid="approve-hint-button"
                className="ui-flat-button px-3 py-1.5 text-xs"
                onClick={onApproveHint}
              >
                Approve
              </button>
              <button
                type="button"
                data-testid="deny-hint-button"
                className="ui-ghost-button px-0 py-1.5 text-xs text-[var(--color-info-text)]"
                onClick={onDenyHint}
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {isHintStreaming && (
        <div
          className="border-l border-[var(--color-border-subtle)] pl-4 text-sm leading-7 text-[var(--color-text-secondary)]"
          data-testid="hint-output"
        >
          <span>{hintText}</span>
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
          {hintText}
        </div>
      )}

      {!pendingHintRequest && !isHintStreaming && hintsRemaining === 0 && (
        <p className="text-sm text-[var(--color-text-tertiary)]">All hints used</p>
      )}

      {executionInProgress && !pendingHintRequest && !isHintStreaming && (
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
