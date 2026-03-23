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
    <div className="ui-overlay p-4">
      <div
        className="ui-dialog w-full max-w-lg p-6"
        data-testid="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`${inputId}-title`}
              className="text-lg tracking-[-0.03em] text-[var(--color-text-primary)]"
            >
              Import Problem
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-text-tertiary)]">
              Paste a LeetCode problem URL. Only `leetcode.com/problems/*` is supported.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="text-[var(--color-text-tertiary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
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
              className="ui-line-control mt-1 text-sm"
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

          <div className="flex items-start gap-2 border-l border-dashed border-[var(--color-border-strong)] pl-4 text-xs leading-6 text-[var(--color-text-tertiary)]">
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
              className="ui-ghost-button text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-import-button"
              className="ui-flat-button text-sm"
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
