import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBrowserLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../lib/logger.ts", () => ({
  getBrowserLogger: () => mockBrowserLogger,
}));

import { RoomCodeModal } from "../components/RoomCodeModal.js";

const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.restoreAllMocks();
  mockBrowserLogger.info.mockReset();
  mockBrowserLogger.warn.mockReset();
  mockBrowserLogger.error.mockReset();
  Object.assign(navigator, {
    clipboard: { writeText: mockWriteText },
  });
});

function renderModal(isOpen = true, onClose = vi.fn()) {
  return {
    onClose,
    ...render(<RoomCodeModal isOpen={isOpen} onClose={onClose} roomCode="abc-xyz" />),
  };
}

describe("RoomCodeModal", () => {
  it("renders nothing when closed", () => {
    renderModal(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("displays room code and shareable URL when open", () => {
    renderModal();
    expect(screen.getByTestId("modal-room-code").textContent).toBe("abc-xyz");
    expect(screen.getByTestId("modal-share-url").textContent).toContain("/room/abc-xyz");
  });

  it("has accessible dialog role and aria-modal", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("copies room code to clipboard on code copy click", async () => {
    renderModal();
    fireEvent.click(screen.getByTestId("copy-code-button"));
    expect(mockWriteText).toHaveBeenCalledWith("abc-xyz");
  });

  it("copies shareable URL to clipboard on URL copy click", async () => {
    renderModal();
    fireEvent.click(screen.getByTestId("copy-url-button"));
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("/room/abc-xyz"));
  });

  it("logs clipboard failures", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("clipboard denied"));

    renderModal();
    fireEvent.click(screen.getByTestId("copy-code-button"));

    await waitFor(() => {
      expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_clipboard_copy_failed",
          error: expect.objectContaining({ message: "clipboard denied" }),
        }),
      );
    });
  });

  it("closes when X button is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId("modal-close-button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when backdrop is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId("room-code-modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when inner dialog is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId("room-code-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
