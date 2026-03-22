import type { CaseResult, ExecutionResult, RunResult, SubmitResult } from "@codeshare/shared";
import { Check, Loader2, X } from "lucide-react";

interface ResultsPanelProps {
  executionResult: ExecutionResult | null;
  executionInProgress: boolean;
  lastError: string | null;
}

export function ResultsPanel({
  executionResult,
  executionInProgress,
  lastError,
}: ResultsPanelProps) {
  if (executionInProgress) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
          <Loader2 size={16} className="animate-spin" />
          Running...
        </div>
      </div>
    );
  }

  if (lastError) {
    return (
      <div className="p-4">
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-error)] bg-[var(--color-error-subtle)] p-3 text-sm text-[var(--color-error-text)]">
          {lastError}
        </div>
      </div>
    );
  }

  if (!executionResult) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No results yet. Run or submit your code.
        </p>
      </div>
    );
  }

  if (executionResult.type === "run") {
    return <RunResultView result={executionResult} />;
  }

  return <SubmitResultView result={executionResult} />;
}

function RunResultView({ result }: { result: RunResult }) {
  const allPassed = result.passed === result.total;

  return (
    <div className="overflow-y-auto p-3">
      <div className="mb-2 flex items-center gap-2">
        {allPassed ? (
          <Check size={16} className="text-[var(--color-success)]" />
        ) : (
          <X size={16} className="text-[var(--color-error)]" />
        )}
        <span
          className={`text-sm font-semibold ${allPassed ? "text-[var(--color-success-text)]" : "text-[var(--color-error-text)]"}`}
        >
          {result.passed}/{result.total} passed
        </span>
      </div>

      <div className="space-y-2">
        {result.cases.map((c) => (
          <CaseResultView key={c.index} caseResult={c} />
        ))}
      </div>

      {result.userStdout && (
        <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-2">
          <h4 className="mb-1 text-xs font-semibold text-[var(--color-text-tertiary)]">
            Console Output
          </h4>
          <pre className="whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-2 font-[var(--font-family-mono)] text-xs text-[var(--color-text-secondary)]">
            {result.userStdout}
          </pre>
        </div>
      )}
    </div>
  );
}

function CaseResultView({ caseResult }: { caseResult: CaseResult }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] p-2 text-xs">
      <div className="mb-1 flex items-center gap-2">
        {caseResult.passed ? (
          <Check size={12} className="text-[var(--color-success)]" />
        ) : (
          <X size={12} className="text-[var(--color-error)]" />
        )}
        <span
          className={
            caseResult.passed
              ? "text-[var(--color-success-text)]"
              : "text-[var(--color-error-text)]"
          }
        >
          {caseResult.passed ? "Pass" : "Fail"}
        </span>
        <span className="text-[var(--color-text-tertiary)]">Case {caseResult.index + 1}</span>
        <span className="text-[var(--color-text-tertiary)]">{caseResult.elapsedMs}ms</span>
        {caseResult.slow && <span className="text-[var(--color-warning-text)]">Slow</span>}
      </div>

      {caseResult.error && (
        <pre className="mt-1 whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-error-subtle)] p-1 font-[var(--font-family-mono)] text-xs text-[var(--color-error-text)]">
          {caseResult.error}
        </pre>
      )}

      {!caseResult.error && !caseResult.passed && (
        <div className="mt-1 space-y-1 text-xs">
          {caseResult.input && (
            <div>
              <span className="font-medium text-[var(--color-text-tertiary)]">Input: </span>
              <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                {caseResult.input}
              </span>
            </div>
          )}
          <div>
            <span className="font-medium text-[var(--color-text-tertiary)]">Expected: </span>
            <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
              {caseResult.expected}
            </span>
          </div>
          <div>
            <span className="font-medium text-[var(--color-text-tertiary)]">Got: </span>
            <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
              {caseResult.got}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitResultView({ result }: { result: SubmitResult }) {
  const allPassed = result.passed === result.total;

  return (
    <div className="overflow-y-auto p-3">
      <div className="mb-2 flex items-center gap-2">
        {allPassed ? (
          <Check size={16} className="text-[var(--color-success)]" />
        ) : (
          <X size={16} className="text-[var(--color-error)]" />
        )}
        <span
          className={`text-sm font-semibold ${allPassed ? "text-[var(--color-success-text)]" : "text-[var(--color-error-text)]"}`}
        >
          {result.passed}/{result.total} passed
        </span>
      </div>

      {result.firstFailure && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-error)] bg-[var(--color-error-subtle)] p-2 text-xs">
          <div className="mb-1 font-medium text-[var(--color-error-text)]">
            First failure: Case {result.firstFailure.index + 1}
          </div>
          {result.firstFailure.input && (
            <div>
              <span className="font-medium text-[var(--color-text-tertiary)]">Input: </span>
              <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                {result.firstFailure.input}
              </span>
            </div>
          )}
          <div>
            <span className="font-medium text-[var(--color-text-tertiary)]">Expected: </span>
            <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
              {result.firstFailure.expected}
            </span>
          </div>
          <div>
            <span className="font-medium text-[var(--color-text-tertiary)]">Got: </span>
            <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
              {result.firstFailure.got}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
