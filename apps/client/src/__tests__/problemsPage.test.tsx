import type { PendingHintRequest, ProblemListItem } from "@codeshare/shared";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());

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
    currentProblem: null,
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

const mockProblems = vi.hoisted(() => ({
  problems: [] as ProblemListItem[],
  loading: false,
  error: null as string | null,
}));

const mockSocket = vi.hoisted(() => ({
  emit: vi.fn(),
}));

vi.mock("../hooks/useRoom.ts", () => ({
  useRoom: () => mockRoomState,
}));

vi.mock("../hooks/useSocket.ts", () => ({
  useSocket: () => ({ socket: mockSocket, connected: true }),
}));

vi.mock("../hooks/useProblems.ts", () => ({
  useProblems: () => mockProblems,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ roomCode: "abc-xyz" }),
  };
});

import { ProblemsPage } from "../pages/ProblemsPage.tsx";

describe("ProblemsPage", () => {
  beforeEach(() => {
    mockRoomState.state.importStatus = null;
    mockRoomState.dispatch.mockClear();
    mockNavigate.mockClear();
  });

  it("renders a scrolling title block with a persistent controls row", () => {
    render(<ProblemsPage />);

    expect(screen.getByText("CodeShare")).toBeInTheDocument();
    expect(screen.getByTestId("problems-filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("open-import-dialog")).toBeInTheDocument();
  });

  it("closes import dialog when importStatus becomes saved", () => {
    const { rerender } = render(<ProblemsPage />);

    mockRoomState.state.importStatus = { status: "saved" };
    rerender(<ProblemsPage />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId("import-dialog")).toBeNull();
  });
});
