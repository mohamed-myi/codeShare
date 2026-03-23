import type { ImportStatusPayload } from "@codeshare/shared";
import { normalizeLeetCodeUrl } from "@codeshare/shared";
import { Info, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leetcodeUrl: string) => void;
  importStatus: ImportStatusPayload | null;
  disabledReason: string | null;
}

export function ImportDialog({
  isOpen,
  onClose,
  onSubmit,
  importStatus,
  disabledReason,
}: ImportDialogProps) {
  const inputId = useId();
  const [leetcodeUrl, setLeetCodeUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [normalizedPreview, setNormalizedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLeetCodeUrl("");
      setValidationError(null);
      setNormalizedPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSubmitting = importStatus?.status === "scraping";
  const disabled = isSubmitting || disabledReason !== null;
  const statusMessage =
    importStatus?.status === "scraping"
      ? "Importing from LeetCode..."
      : importStatus?.status === "saved"
        ? "Problem imported and loaded."
        : importStatus?.status === "failed"
          ? (importStatus.message ?? "Import failed.")
          : null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = leetcodeUrl.trim();
    if (disabledReason) {
      setValidationError(disabledReason);
      return;
    }

    const result = normalizeLeetCodeUrl(trimmedUrl);
    if (!result) {
      setValidationError("Paste a valid LeetCode problem URL.");
      return;
    }

    setValidationError(null);
    onSubmit(result.canonicalUrl);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-7 shadow-lg"
        data-testid="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${inputId}-title`} className="font-semibold text-[var(--color-text-primary)]">
              Import Problem
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
              Paste a LeetCode problem URL. Only `leetcode.com/problems/*` is supported.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-tertiary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)] hover:text-[var(--color-text-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              LeetCode URL
            </label>
            <input
              id={inputId}
              type="text"
              aria-label="LeetCode URL"
              data-testid="import-url-input"
              value={leetcodeUrl}
              onChange={(event) => {
                const value = event.target.value;
                setLeetCodeUrl(value);
                if (validationError) setValidationError(null);
                const normalized = normalizeLeetCodeUrl(value);
                setNormalizedPreview(normalized ? normalized.canonicalUrl : null);
              }}
              placeholder="https://leetcode.com/problems/two-sum/"
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </div>

          {normalizedPreview && leetcodeUrl.trim() !== normalizedPreview && (
            <p
              data-testid="import-url-preview"
              className="text-xs text-[var(--color-text-tertiary)]"
            >
              Will import: {normalizedPreview}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
            <Info size={14} className="mt-0.5 shrink-0" />3 imports per room session. Imported
            problems keep visible attribution and only include visible sample cases.
          </div>

          {disabledReason && !validationError && (
            <p className="text-sm text-[var(--color-error-text)]">{disabledReason}</p>
          )}
          {validationError && (
            <p className="text-sm text-[var(--color-error-text)]">{validationError}</p>
          )}
          {statusMessage && (
            <p
              data-testid="import-status-message"
              className={
                importStatus?.status === "failed"
                  ? "text-sm text-[var(--color-error-text)]"
                  : "text-sm text-[var(--color-text-secondary)]"
              }
            >
              {statusMessage}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="cancel-import-button"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-import-button"
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-2 text-sm text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              disabled={disabled}
            >
              {isSubmitting ? "Importing..." : "Import Problem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
