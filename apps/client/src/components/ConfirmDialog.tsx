interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70">
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-7 shadow-lg"
        role="dialog"
        aria-modal="true"
        data-testid="confirm-dialog"
      >
        <h2 className="mb-2 font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mb-4 text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-1 text-sm text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1 text-sm text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
