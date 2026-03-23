import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Header } from "../components/Header.tsx";

const headerProps = {
  roomCode: "abc-xyz",
  mode: "collaboration" as const,
  users: [] as Array<{
    id: string;
    displayName: string;
    role: "peer" | "interviewer" | "candidate";
    connected: boolean;
  }>,
  connected: true,
};

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={["/room/abc-xyz/session"]}>{ui}</MemoryRouter>);
}

describe("Header", () => {
  it("displays room code", () => {
    renderInRouter(<Header {...headerProps} roomCode="xyz-abc" />);
    expect(screen.getByText("xyz-abc")).toBeDefined();
  });

  it("shows CodeShare branding", () => {
    renderInRouter(<Header {...headerProps} />);
    expect(screen.getByText("CodeShare")).toBeDefined();
  });

  it("shows Collab label in collaboration mode", () => {
    renderInRouter(<Header {...headerProps} mode="collaboration" />);
    expect(screen.getByText("Collab")).toBeDefined();
  });

  it("shows Interview label in interview mode", () => {
    renderInRouter(<Header {...headerProps} mode="interview" />);
    expect(screen.getByText("Interview")).toBeDefined();
  });

  it("shows reconnecting message when disconnected", () => {
    renderInRouter(<Header {...headerProps} connected={false} />);
    expect(screen.getByText("Reconnecting...")).toBeDefined();
  });

  it("does not show reconnecting when connected", () => {
    renderInRouter(<Header {...headerProps} connected={true} />);
    expect(screen.queryByText("Reconnecting...")).toBeNull();
  });

  it("renders user display names", () => {
    renderInRouter(
      <Header
        {...headerProps}
        users={[
          { id: "u1", displayName: "Alice", role: "peer", connected: true },
          { id: "u2", displayName: "Bob", role: "peer", connected: false },
        ]}
      />,
    );

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("shows navigation button", () => {
    renderInRouter(<Header {...headerProps} />);
    expect(screen.getByText("Back to Solver")).toBeDefined();
  });

  it("shows role badges in interview mode", () => {
    renderInRouter(
      <Header
        {...headerProps}
        mode="interview"
        currentUserId="u1"
        users={[
          { id: "u1", displayName: "Alice", role: "interviewer", connected: true },
          { id: "u2", displayName: "Bob", role: "candidate", connected: true },
        ]}
      />,
    );

    expect(screen.getByTestId("role-badge-interviewer")).toBeDefined();
    expect(screen.getByTestId("role-badge-interviewer").textContent).toContain("Interviewer");
    expect(screen.getByTestId("role-badge-interviewer").textContent).toContain("(you)");
    expect(screen.getByTestId("role-badge-candidate")).toBeDefined();
    expect(screen.getByTestId("role-badge-candidate").textContent).toContain("Candidate");
  });

  it("does not show role badges in collaboration mode", () => {
    renderInRouter(
      <Header
        {...headerProps}
        mode="collaboration"
        users={[
          { id: "u1", displayName: "Alice", role: "peer", connected: true },
          { id: "u2", displayName: "Bob", role: "peer", connected: true },
        ]}
      />,
    );

    expect(screen.queryByTestId("role-badge-interviewer")).toBeNull();
    expect(screen.queryByTestId("role-badge-candidate")).toBeNull();
  });
});
