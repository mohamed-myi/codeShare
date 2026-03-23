import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Header } from "../components/Header.js";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderHeader(roomCode = "abc-xyz") {
  return render(
    <MemoryRouter initialEntries={["/room/abc-xyz/session"]}>
      <Header roomCode={roomCode} mode="collaboration" users={[]} connected={true} />
    </MemoryRouter>,
  );
}

describe("Header room code", () => {
  it("room code is rendered as a button", () => {
    renderHeader();
    const el = screen.getByTestId("room-code");
    expect(el.tagName).toBe("BUTTON");
  });

  it("clicking room code opens the share modal", () => {
    renderHeader();
    fireEvent.click(screen.getByTestId("room-code"));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByTestId("modal-room-code").textContent).toBe("abc-xyz");
  });

  it("closing modal removes the dialog", () => {
    renderHeader();
    fireEvent.click(screen.getByTestId("room-code"));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByTestId("modal-close-button"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("displays the correct room code in the modal", () => {
    renderHeader("xyz-abc");
    fireEvent.click(screen.getByTestId("room-code"));
    expect(screen.getByTestId("modal-room-code").textContent).toBe("xyz-abc");
  });
});
