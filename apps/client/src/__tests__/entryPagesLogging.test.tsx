import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockBrowserLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const mockCreateRoom = vi.hoisted(() => vi.fn());
const mockCheckRoom = vi.hoisted(() => vi.fn());

vi.mock("../lib/logger.ts", () => ({
  getBrowserLogger: () => mockBrowserLogger,
}));

vi.mock("../lib/api.ts", () => ({
  createRoom: (...args: unknown[]) => mockCreateRoom(...args),
  checkRoom: (...args: unknown[]) => mockCheckRoom(...args),
}));

import { HomePage } from "../pages/HomePage.tsx";
import { JoinPage } from "../pages/JoinPage.tsx";

describe("entry page logging", () => {
  afterEach(() => {
    sessionStorage.clear();
    mockCreateRoom.mockReset();
    mockCheckRoom.mockReset();
    mockBrowserLogger.info.mockReset();
    mockBrowserLogger.warn.mockReset();
    mockBrowserLogger.error.mockReset();
    vi.restoreAllMocks();
  });

  it("logs session persistence failures when home page room creation cannot store the display name", async () => {
    mockCreateRoom.mockResolvedValue({ roomCode: "abc-xyz" });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Alice" },
    });
    const originalSessionStorage = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        ...originalSessionStorage,
        getItem: (key: string) => originalSessionStorage.getItem(key),
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    });

    fireEvent.click(screen.getByTestId("create-room-button"));

    await waitFor(() => {
      expect(mockBrowserLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_session_persist_failed",
          error: expect.objectContaining({ message: "quota exceeded" }),
        }),
      );
    });

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: originalSessionStorage,
    });
  });

  it("logs session persistence failures when join page cannot store the display name", async () => {
    mockCheckRoom.mockResolvedValue({
      exists: true,
      mode: "collaboration",
      userCount: 1,
      maxUsers: 2,
    });

    render(
      <MemoryRouter initialEntries={["/join/abc-xyz"]}>
        <Routes>
          <Route path="/join/:roomCode" element={<JoinPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Join Room");
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Alice" },
    });
    const originalSessionStorage = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: {
        ...originalSessionStorage,
        getItem: (key: string) => originalSessionStorage.getItem(key),
        setItem: () => {
          throw new Error("storage denied");
        },
      },
    });

    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(mockBrowserLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_session_persist_failed",
          error: expect.objectContaining({ message: "storage denied" }),
        }),
      );
    });

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: originalSessionStorage,
    });
  });
});
