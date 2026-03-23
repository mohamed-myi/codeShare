import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

type CopiedField = "code" | "url" | null;

export function RoomCodeModal({ isOpen, onClose, roomCode }: RoomCodeModalProps) {
  const [copiedField, setCopiedField] = useState<CopiedField>(null);

  useEffect(() => {
    if (!isOpen) setCopiedField(null);
  }, [isOpen]);

  useEffect(() => {
    if (!copiedField) return;
    const timer = setTimeout(() => setCopiedField(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedField]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/room/${roomCode}`;

  async function handleCopy(text: string, field: CopiedField) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss is supplementary to the X button
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/70"
      data-testid="room-code-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-7 shadow-lg"
        role="dialog"
        aria-modal="true"
        data-testid="room-code-modal"
      >
        <button
          type="button"
          onClick={onClose}
          data-testid="modal-close-button"
          className="absolute right-3 top-3 text-[var(--color-text-tertiary)] transition-colors duration-[var(--transition-fast)] hover:text-[var(--color-text-primary)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="mb-5 text-lg font-semibold text-[var(--color-text-primary)]">Share Room</h2>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-xs text-[var(--color-text-tertiary)]">Room Code</p>
            <div className="flex items-center gap-2">
              <span
                className="flex-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] px-3 py-2 font-[var(--font-family-mono)] text-lg tracking-widest text-[var(--color-text-primary)]"
                data-testid="modal-room-code"
              >
                {roomCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(roomCode, "code")}
                data-testid="copy-code-button"
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] p-2 text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)]"
                aria-label="Copy room code"
              >
                {copiedField === "code" ? (
                  <Check size={16} className="text-[var(--color-success)]" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-[var(--color-text-tertiary)]">Shareable Link</p>
            <div className="flex items-center gap-2">
              <span
                className="flex-1 truncate rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
                data-testid="modal-share-url"
              >
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(shareUrl, "url")}
                data-testid="copy-url-button"
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] p-2 text-[var(--color-text-secondary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-hover-overlay)]"
                aria-label="Copy shareable link"
              >
                {copiedField === "url" ? (
                  <Check size={16} className="text-[var(--color-success)]" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
