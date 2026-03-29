import type { Problem } from "@codeshare/shared";
import type { ReactNode } from "react";
import { ProblemHintStatus, type ProblemHintStatusProps } from "./ProblemHintStatus.tsx";

interface ProblemPanelProps {
  problem: Problem | null;
  emptyMessage?: string;
  hint?: ProblemHintStatusProps;
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

      {hint && <ProblemHintStatus {...hint} />}

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

function renderDescription(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  let offset = 0;

  return parts.map((part) => {
    const key = `${part.startsWith("`") && part.endsWith("`") ? "code" : "text"}-${offset}`;
    offset += part.length;

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="border-b border-[var(--color-border-subtle)] px-0.5 font-[var(--font-family-mono)] text-xs text-[var(--color-text-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}
