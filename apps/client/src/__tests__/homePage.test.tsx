import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../pages/HomePage.js";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCreateRoom = vi.fn();
vi.mock("../lib/api.js", () => ({
  createRoom: (...args: unknown[]) => mockCreateRoom(...args),
}));

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockCreateRoom.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("HomePage", () => {
  it("renders display name input and mode selector", () => {
    renderHomePage();

    expect(screen.getByPlaceholderText("Your display name")).toBeDefined();
    expect(screen.getByRole("combobox")).toBeDefined();
    expect(screen.getByText("Collaboration")).toBeDefined();
    expect(screen.getByText("Mock Interview")).toBeDefined();
  });

  it("Create Room button is disabled when name is empty", () => {
    renderHomePage();
    const button = screen.getByRole("button", { name: "Create Room" });
    expect(button).toHaveProperty("disabled", true);
  });

  it("Create Room button is enabled when name is entered", () => {
    renderHomePage();
    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Alice" } });
    const button = screen.getByRole("button", { name: "Create Room" });
    expect(button).toHaveProperty("disabled", false);
  });

  it("calls createRoom and navigates on success", async () => {
    mockCreateRoom.mockResolvedValueOnce({ roomCode: "abc-xyz" });
    renderHomePage();

    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Alice" } });

    const button = screen.getByRole("button", { name: "Create Room" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith("collaboration");
      expect(sessionStorage.getItem("displayName")).toBe("Alice");
      expect(mockNavigate).toHaveBeenCalledWith("/room/abc-xyz/session");
    });
  });

  it("shows error message on API failure", async () => {
    mockCreateRoom.mockRejectedValueOnce(new Error("Server error"));
    renderHomePage();

    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Alice" } });

    const button = screen.getByRole("button", { name: "Create Room" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to create room. Please try again."),
      ).toBeDefined();
    });

    // Button should be re-enabled
    expect(
      screen.getByRole("button", { name: "Create Room" }),
    ).toHaveProperty("disabled", false);
  });
});
