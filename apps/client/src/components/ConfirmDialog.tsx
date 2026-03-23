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
    <div className="ui-overlay p-4">
      <div className="ui-dialog p-6" role="dialog" aria-modal="true" data-testid="confirm-dialog">
        <h2 className="text-lg tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="ui-ghost-button text-sm">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="ui-flat-button text-sm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
