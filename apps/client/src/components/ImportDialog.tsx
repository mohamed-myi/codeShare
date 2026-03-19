interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  if (!isOpen) return null;

  // TODO: URL-paste import modal with status feedback
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="rounded bg-white p-6 shadow-lg">
        <h2 className="mb-4 font-semibold">Import Problem</h2>
        <button onClick={onClose} className="text-gray-500">
          Close
        </button>
      </div>
    </div>
  );
}
