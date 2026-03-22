import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinPage } from "../pages/JoinPage.js";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCheckRoom = vi.fn();
vi.mock("../lib/api.js", () => ({
  checkRoom: (...args: unknown[]) => mockCheckRoom(...args),
}));

function renderJoinPage(roomCode = "abc-xyz") {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomCode}`]}>
      <Routes>
        <Route path="/room/:roomCode" element={<JoinPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockCheckRoom.mockReset();
  sessionStorage.clear();
});

describe("JoinPage", () => {
  it("shows room info when room exists", async () => {
    mockCheckRoom.mockResolvedValueOnce({
      exists: true,
      mode: "collaboration",
      userCount: 1,
      maxUsers: 2,
    });

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getByText(/Collaboration room/)).toBeDefined();
      expect(screen.getByText(/1\/2 users/)).toBeDefined();
    });
  });

  it("shows assigned role in interview mode", async () => {
    mockCheckRoom.mockResolvedValueOnce({
      exists: true,
      mode: "interview",
      userCount: 1,
      maxUsers: 2,
    });

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getByText(/Candidate/)).toBeDefined();
    });
  });

  it("shows error when room does not exist", async () => {
    mockCheckRoom.mockResolvedValueOnce({ exists: false });

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getByText("Room not found")).toBeDefined();
    });

    expect(screen.queryByPlaceholderText("Your display name")).toBeNull();
  });

  it("shows full message when room has 2 users", async () => {
    mockCheckRoom.mockResolvedValueOnce({
      exists: true,
      mode: "collaboration",
      userCount: 2,
      maxUsers: 2,
    });

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getByText("This room is full")).toBeDefined();
    });
  });

  it("navigates to session on Join click", async () => {
    mockCheckRoom.mockResolvedValueOnce({
      exists: true,
      mode: "collaboration",
      userCount: 0,
      maxUsers: 2,
    });

    renderJoinPage("abc-xyz");

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your display name")).toBeDefined();
    });

    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Bob" } });

    const button = screen.getByRole("button", { name: "Join" });
    fireEvent.click(button);

    expect(sessionStorage.getItem("displayName")).toBe("Bob");
    expect(mockNavigate).toHaveBeenCalledWith("/room/abc-xyz/session");
  });
});
