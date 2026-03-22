import { type PendingHintRequest, SocketEvents } from "@codeshare/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRoomState = vi.hoisted(() => ({
  state: {
    roomCode: "abc-xyz",
    mode: "collaboration" as "collaboration" | "interview",
    maxUsers: 2,
    users: [] as Array<{ id: string; displayName: string; role: string; connected: boolean }>,
    problemId: null as string | null,
    language: "python",
    hintsUsed: 0,
    hintLimit: 2,
    pendingHintRequest: null as PendingHintRequest | null,
    customTestCases: [],
    submissionsUsed: 0,
    submissionLimit: 20,
    executionInProgress: false,
    createdAt: "",
    lastActivityAt: "",
    currentUserId: null as string | null,
    currentProblem: null as {
      id: string;
      slug: string;
      title: string;
      difficulty: string;
      category: string;
      description: string;
      constraints: string[];
      solution: string | null;
      timeLimitMs: number;
      source: string;
      sourceUrl: string | null;
      createdAt: string;
      updatedAt: string;
    } | null,
    visibleTestCases: [],
    parameterNames: [],
    lastError: null as string | null,
    executionResult: null,
    importStatus: null as { status: string; message?: string } | null,
    hintText: "",
    solution: null as string | null,
    isHintStreaming: false,
  },
  dispatch: vi.fn(),
}));

const mockHints = vi.hoisted(() => ({
  requestHint: vi.fn(),
  approveHint: vi.fn(),
  denyHint: vi.fn(),
}));

const mockSocket = vi.hoisted(() => ({
  emit: vi.fn(),
}));

const mockConnected = vi.hoisted(() => ({
  value: true,
}));

vi.mock("../hooks/useRoom.ts", () => ({
  useRoom: () => mockRoomState,
}));

vi.mock("../hooks/useSocket.ts", () => ({
  useSocket: () => ({ socket: mockSocket, connected: mockConnected.value }),
}));

vi.mock("../hooks/useHints.ts", () => ({
  useHints: () => mockHints,
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

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid={`panel-${props.id ?? "unknown"}`}>{children}</div>
  ),
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: () => <div data-testid="resize-handle" />,
}));

import { SolverPage } from "../pages/SolverPage.tsx";

afterEach(() => {
  mockRoomState.state.users = [];
  mockRoomState.state.roomCode = "abc-xyz";
  mockRoomState.state.mode = "collaboration";
  mockRoomState.state.currentUserId = null;
  mockRoomState.state.problemId = null;
  mockRoomState.state.solution = null;
  mockRoomState.state.hintText = "";
  mockRoomState.state.pendingHintRequest = null;
  mockRoomState.state.isHintStreaming = false;
  mockRoomState.state.currentProblem = null;
  mockRoomState.state.importStatus = null;
  mockRoomState.state.lastError = null;
  mockRoomState.state.executionInProgress = false;
  mockConnected.value = true;
  mockHints.requestHint.mockReset();
  mockHints.approveHint.mockReset();
  mockHints.denyHint.mockReset();
  mockSocket.emit.mockReset();
});

describe("SolverPage", () => {
  it("renders three panels (problem, editor, results)", () => {
    render(<SolverPage />);

    expect(screen.getByTestId("panel-problem")).toBeDefined();
    expect(screen.getByTestId("panel-editor")).toBeDefined();
    expect(screen.getByTestId("panel-results")).toBeDefined();
  });

  it("renders Run and Submit buttons", () => {
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
      { id: "u2", displayName: "Bob", role: "peer", connected: true },
    ];

    render(<SolverPage />);

    expect(screen.getByText("Run")).toBeDefined();
    expect(screen.getByText("Submit")).toBeDefined();
  });

  it("Run button emits CODE_RUN", () => {
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.currentUserId = "u1";
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
      { id: "u2", displayName: "Bob", role: "peer", connected: true },
    ];

    render(<SolverPage />);

    fireEvent.click(screen.getByText("Run"));
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.CODE_RUN);
  });

  it("Submit button emits CODE_SUBMIT", () => {
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.currentUserId = "u1";
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
      { id: "u2", displayName: "Bob", role: "peer", connected: true },
    ];

    render(<SolverPage />);

    fireEvent.click(screen.getByText("Submit"));
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.CODE_SUBMIT);
  });

  it("disables Run/Submit when no problem selected", () => {
    mockRoomState.state.problemId = null;

    render(<SolverPage />);

    expect(screen.getByText("Run").closest("button")?.disabled).toBe(true);
    expect(screen.getByText("Submit").closest("button")?.disabled).toBe(true);
  });

  it("shows pending hint request when problem selected", () => {
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.currentUserId = "u1";
    mockRoomState.state.pendingHintRequest = {
      requestedBy: "u1",
      requestedAt: "2026-01-01T00:00:00Z",
    };
    mockRoomState.state.currentProblem = {
      id: "p1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Find two numbers.",
      constraints: [],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    mockRoomState.state.users = [{ id: "u1", displayName: "Alice", role: "peer", connected: true }];

    render(<SolverPage />);

    expect(screen.getByText("Waiting for partner's approval...")).toBeDefined();
  });

  it("shows Reveal button for interviewer in interview mode", () => {
    mockRoomState.state.mode = "interview";
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.currentUserId = "u1";
    mockRoomState.state.currentProblem = {
      id: "p1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Find two numbers.",
      constraints: [],
      solution: "Use a hash map.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    mockRoomState.state.users = [
      { id: "u1", displayName: "Interviewer", role: "interviewer", connected: true },
      { id: "u2", displayName: "Candidate", role: "candidate", connected: true },
    ];

    render(<SolverPage />);

    fireEvent.click(screen.getByText("Reveal"));
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.SOLUTION_REVEAL);
  });

  it("renders revealed solution content", () => {
    mockRoomState.state.mode = "interview";
    mockRoomState.state.problemId = "p1";
    mockRoomState.state.currentUserId = "u2";
    mockRoomState.state.solution = "Walk the array once and store complements.";
    mockRoomState.state.users = [
      { id: "u1", displayName: "Interviewer", role: "interviewer", connected: true },
      { id: "u2", displayName: "Candidate", role: "candidate", connected: true },
    ];

    render(<SolverPage />);

    expect(screen.getByText("Solution")).toBeDefined();
    expect(screen.getByText("Walk the array once and store complements.")).toBeDefined();
  });

  it("shows tab bar with Test Cases and Results tabs", () => {
    render(<SolverPage />);

    expect(screen.getByText("Test Cases")).toBeDefined();
    expect(screen.getByText("Results")).toBeDefined();
  });

  it("switches tabs when clicked", () => {
    render(<SolverPage />);

    fireEvent.click(screen.getByText("Results"));
    expect(screen.getByText("No results yet. Run or submit your code.")).toBeDefined();
  });

  it("shows problem empty message when no problem selected", () => {
    render(<SolverPage />);

    expect(screen.getByText("Select a problem to begin.")).toBeDefined();
  });

  it("opens import dialog and emits problem:import", () => {
    mockRoomState.state.currentUserId = "u1";
    mockRoomState.state.users = [
      { id: "u1", displayName: "Alice", role: "peer", connected: true },
      { id: "u2", displayName: "Bob", role: "peer", connected: true },
    ];

    render(<SolverPage />);

    fireEvent.click(screen.getByText("Import"));
    fireEvent.change(screen.getByLabelText("LeetCode URL"), {
      target: { value: "https://leetcode.com/problems/two-sum/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Problem" }));

    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.PROBLEM_IMPORT, {
      leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    });
  });
});
