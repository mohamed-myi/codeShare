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

function switchToJoinTab() {
  fireEvent.click(screen.getByTestId("tab-join"));
}

beforeEach(() => {
  mockNavigate.mockReset();
  sessionStorage.clear();
});

describe("HomePage tabs", () => {
  it("renders both Create and Join tabs", () => {
    renderHomePage();
    expect(screen.getByTestId("tab-create")).toBeDefined();
    expect(screen.getByTestId("tab-join")).toBeDefined();
  });

  it("defaults to Create tab", () => {
    renderHomePage();
    expect(screen.getByTestId("tab-create").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("tab-join").getAttribute("aria-selected")).toBe("false");
    expect(screen.getByTestId("create-room-button")).toBeDefined();
  });

  it("switches to Join tab and shows room code input", () => {
    renderHomePage();
    switchToJoinTab();
    expect(screen.getByTestId("tab-join").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("room-code-input")).toBeDefined();
    expect(screen.getByTestId("join-room-button")).toBeDefined();
  });

  it("switching back to Create tab preserves display name", () => {
    renderHomePage();
    const nameInput = screen.getByPlaceholderText("Your display name");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    switchToJoinTab();
    const joinNameInput = screen.getByPlaceholderText("Your display name");
    expect((joinNameInput as HTMLInputElement).value).toBe("Alice");

    fireEvent.click(screen.getByTestId("tab-create"));
    const createNameInput = screen.getByPlaceholderText("Your display name");
    expect((createNameInput as HTMLInputElement).value).toBe("Alice");
  });

  it("clears error when switching tabs", async () => {
    server.use(http.post("*/api/rooms", () => new HttpResponse(null, { status: 500 })));

    renderHomePage();
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("create-room-button"));

    await waitFor(() => {
      expect(screen.getByText("Failed to create room. Please try again.")).toBeDefined();
    });

    switchToJoinTab();
    expect(screen.queryByText("Failed to create room. Please try again.")).toBeNull();
  });
});

describe("Join tab - room code input", () => {
  it("auto-formats room code with hyphen", () => {
    renderHomePage();
    switchToJoinTab();
    const input = screen.getByTestId("room-code-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abcx" } });
    expect(input.value).toBe("abc-x");
  });

  it("handles uppercase input", () => {
    renderHomePage();
    switchToJoinTab();
    const input = screen.getByTestId("room-code-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ABCXYZ" } });
    expect(input.value).toBe("abc-xyz");
  });

  it("strips invalid characters", () => {
    renderHomePage();
    switchToJoinTab();
    const input = screen.getByTestId("room-code-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "a0b1c" } });
    expect(input.value).toBe("abc");
  });
});

describe("Join tab - button states", () => {
  it("join button is disabled when room code is incomplete", () => {
    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abc" },
    });
    expect(screen.getByTestId("join-room-button")).toHaveProperty("disabled", true);
  });

  it("join button is disabled when display name is empty", () => {
    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    expect(screen.getByTestId("join-room-button")).toHaveProperty("disabled", true);
  });

  it("join button is enabled when code is complete and name is entered", () => {
    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    expect(screen.getByTestId("join-room-button")).toHaveProperty("disabled", false);
  });
});

describe("Join tab - join flow", () => {
  it("successful join navigates to session", async () => {
    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(sessionStorage.getItem("displayName")).toBe("Alice");
      expect(mockNavigate).toHaveBeenCalledWith("/room/abc-xyz/session");
    });
  });

  it("shows error when room not found", async () => {
    server.use(http.get("*/api/rooms/:roomCode", () => HttpResponse.json({ exists: false })));

    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(screen.getByText("Room not found. Check the code and try again.")).toBeDefined();
    });
  });

  it("shows error when room is full", async () => {
    server.use(
      http.get("*/api/rooms/:roomCode", () =>
        HttpResponse.json({ exists: true, mode: "collaboration", userCount: 2, maxUsers: 2 }),
      ),
    );

    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(screen.getByText("Room is full.")).toBeDefined();
    });
  });

  it("shows error on network failure", async () => {
    server.use(http.get("*/api/rooms/:roomCode", () => new HttpResponse(null, { status: 500 })));

    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(screen.getByText("Failed to join room. Please try again.")).toBeDefined();
    });
  });

  it("clears error on typing in room code input", async () => {
    server.use(http.get("*/api/rooms/:roomCode", () => HttpResponse.json({ exists: false })));

    renderHomePage();
    switchToJoinTab();
    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "abcxyz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your display name"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("join-room-button"));

    await waitFor(() => {
      expect(screen.getByText("Room not found. Check the code and try again.")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("room-code-input"), {
      target: { value: "xyz" },
    });
    expect(screen.queryByText("Room not found. Check the code and try again.")).toBeNull();
  });
});
