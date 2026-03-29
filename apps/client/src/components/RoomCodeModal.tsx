import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getBrowserLogger } from "../lib/logger.ts";

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

type CopiedField = "code" | "url" | null;

export function RoomCodeModal({ isOpen, onClose, roomCode }: RoomCodeModalProps) {
  const [copiedField, setCopiedField] = useState<CopiedField>(null);
  const logger = getBrowserLogger(window.location.pathname);

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
    } catch (error) {
      await logger.warn({
        event: CLIENT_LOG_EVENTS.CLIENT_CLIPBOARD_COPY_FAILED,
        roomCode,
        error: error instanceof Error ? error : new Error("Clipboard copy failed."),
        context: {
          copied_field: field,
        },
      });
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss is supplementary to the X button
    <div
      className="ui-overlay"
      data-testid="room-code-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="ui-dialog relative w-full max-w-sm p-6"
        role="dialog"
        aria-modal="true"
        data-testid="room-code-modal"
      >
        <button
          type="button"
          onClick={onClose}
          data-testid="modal-close-button"
          className="absolute right-4 top-4 text-[var(--color-text-tertiary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="mb-5 text-lg tracking-[-0.03em] text-[var(--color-text-primary)]">
          Share Room
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-xs text-[var(--color-text-tertiary)]">Room Code</p>
            <div className="flex items-center gap-2">
              <span
                className="flex-1 border-b border-[var(--color-border-strong)] pb-3 font-[var(--font-family-mono)] text-lg tracking-[0.2em] text-[var(--color-text-primary)]"
                data-testid="modal-room-code"
              >
                {roomCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(roomCode, "code")}
                data-testid="copy-code-button"
                className="text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
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
                className="flex-1 truncate border-b border-[var(--color-border-strong)] pb-3 text-sm text-[var(--color-text-secondary)]"
                data-testid="modal-share-url"
              >
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(shareUrl, "url")}
                data-testid="copy-url-button"
                className="text-[var(--color-text-secondary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
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
