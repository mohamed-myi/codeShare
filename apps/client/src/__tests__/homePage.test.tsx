import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "../pages/HomePage.js";
import { server } from "./mocks/server.js";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  sessionStorage.clear();
});

describe("HomePage", () => {
  it("renders display name input and mode selector", () => {
    renderHomePage();

    expect(screen.getByPlaceholderText("Your display name")).toBeDefined();
    const combo = screen.getByRole("combobox");
    expect(combo).toBeDefined();
    expect(combo.textContent).toContain("Collaboration");

    fireEvent.click(combo);
    expect(screen.getByRole("option", { name: "Mock Interview" })).toBeDefined();
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
    renderHomePage();

    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Alice" } });

    const button = screen.getByRole("button", { name: "Create Room" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(sessionStorage.getItem("displayName")).toBe("Alice");
      expect(mockNavigate).toHaveBeenCalledWith("/room/abc-xyz/session");
    });
  });

  it("shows error message on API failure", async () => {
    server.use(
      http.post("*/api/rooms", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderHomePage();

    const input = screen.getByPlaceholderText("Your display name");
    fireEvent.change(input, { target: { value: "Alice" } });

    const button = screen.getByRole("button", { name: "Create Room" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Failed to create room. Please try again.")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: "Create Room" })).toHaveProperty("disabled", false);
  });
});
