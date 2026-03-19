import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockRoomState = vi.hoisted(() => ({
  state: {
    roomCode: "abc-xyz",
    mode: "collaboration" as const,
    maxUsers: 2,
    users: [] as Array<{ id: string; displayName: string; role: string; connected: boolean }>,
    problemId: null,
    language: "python",
    hintsUsed: 0,
    hintLimit: 0,
    pendingHintRequest: null,
    customTestCases: [],
    submissionsUsed: 0,
    submissionLimit: 20,
    executionInProgress: false,
    createdAt: "",
    lastActivityAt: "",
    currentUserId: null,
    lastError: null,
    executionResult: null,
    hintText: "",
    solution: null,
  },
  dispatch: vi.fn(),
}));

vi.mock("../hooks/useRoom.ts", () => ({
  useRoom: () => mockRoomState,
}));

vi.mock("../hooks/useSocket.ts", () => ({
  useSocket: () => ({ socket: null, connected: false }),
}));

vi.mock("../providers/YjsProvider.tsx", () => ({
  useYjsContext: () => ({ doc: null, provider: null }),
}));

vi.mock("y-monaco", () => ({
  MonacoBinding: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="mock-editor" />,
}));

import { RoomPage } from "../pages/RoomPage.tsx";

afterEach(() => {
  cleanup();
  mockRoomState.state.users = [];
  mockRoomState.state.roomCode = "abc-xyz";
  mockRoomState.state.mode = "collaboration";
});

describe("RoomPage", () => {
  it("renders UserPresence with users from room state", () => {
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
      { id: "u2", displayName: "Bob", role: "peer", connected: true },
    ];

    render(<RoomPage />);

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("displays room code in toolbar", () => {
    mockRoomState.state.roomCode = "xyz-abc";

    render(<RoomPage />);

    expect(screen.getByText("xyz-abc")).toBeDefined();
  });

  it("shows waiting message when only 1 user connected", () => {
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
    ];

    render(<RoomPage />);

    expect(screen.getByText(/waiting for partner/i)).toBeDefined();
  });
});
