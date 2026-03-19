interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="rounded bg-white p-6 shadow-lg">
        <h2 className="mb-2 font-semibold">{title}</h2>
        <p className="mb-4 text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border px-3 py-1 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
