import type { ProblemListItem } from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEmit = vi.fn();

const mockProblems = vi.hoisted(() => ({
  problems: [] as ProblemListItem[],
  loading: false,
  error: null as string | null,
}));

vi.mock("../hooks/useProblems.ts", () => ({
  useProblems: () => mockProblems,
}));

vi.mock("../hooks/useSocket.ts", () => ({
  useSocket: () => ({ socket: { emit: mockEmit }, connected: true }),
}));

import { ProblemSelector } from "../components/ProblemSelector.tsx";

const PROBLEMS: ProblemListItem[] = [
  { id: "p1", slug: "two-sum", title: "Two Sum", difficulty: "easy", category: "Arrays & Hashing" },
  { id: "p2", slug: "3sum", title: "3Sum", difficulty: "medium", category: "Two Pointers" },
  {
    id: "p3",
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    category: "Two Pointers",
  },
  {
    id: "p4",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    category: "Stack",
  },
];

beforeEach(() => {
  mockProblems.problems = [...PROBLEMS];
  mockProblems.loading = false;
  mockProblems.error = null;
  mockEmit.mockReset();
});

describe("ProblemSelector", () => {
  it("renders all problems when no filters", () => {
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    expect(screen.getByText("Two Sum")).toBeDefined();
    expect(screen.getByText("3Sum")).toBeDefined();
    expect(screen.getByText("Trapping Rain Water")).toBeDefined();
    expect(screen.getByText("Valid Parentheses")).toBeDefined();
  });

  it("filters by category", () => {
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    const categoryTrigger = screen.getAllByRole("combobox")[0];
    fireEvent.click(categoryTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Two Pointers" }));

    expect(screen.getByText("3Sum")).toBeDefined();
    expect(screen.getByText("Trapping Rain Water")).toBeDefined();
    expect(screen.queryByText("Two Sum")).toBeNull();
    expect(screen.queryByText("Valid Parentheses")).toBeNull();
  });

  it("filters by difficulty", () => {
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    const diffTrigger = screen.getAllByRole("combobox")[1];
    fireEvent.click(diffTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Easy" }));

    expect(screen.getByText("Two Sum")).toBeDefined();
    expect(screen.getByText("Valid Parentheses")).toBeDefined();
    expect(screen.queryByText("3Sum")).toBeNull();
  });

  it("emits PROBLEM_SELECT on click when no current problem", () => {
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    fireEvent.click(screen.getByText("Two Sum"));
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.PROBLEM_SELECT, {
      problemId: "p1",
    });
  });

  it("shows an in-app confirmation dialog when switching from an existing problem", () => {
    render(<ProblemSelector currentProblemId="p1" executionInProgress={false} />);
    fireEvent.click(screen.getByText("3Sum"));

    expect(
      screen.getByText("Switching problems will reset your code and hints. Continue?"),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.PROBLEM_SELECT, { problemId: "p2" });
  });

  it("does not emit when the confirmation dialog is cancelled", () => {
    render(<ProblemSelector currentProblemId="p1" executionInProgress={false} />);
    fireEvent.click(screen.getByText("3Sum"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("does not emit a pending confirmation after execution starts", () => {
    const { rerender } = render(
      <ProblemSelector currentProblemId="p1" executionInProgress={false} />,
    );
    fireEvent.click(screen.getByText("3Sum"));

    rerender(<ProblemSelector currentProblemId="p1" executionInProgress={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("shows loading state", () => {
    mockProblems.problems = [];
    mockProblems.loading = true;
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    expect(screen.getByText("Loading problems...")).toBeDefined();
  });

  it("shows empty state for no matching filters", () => {
    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);
    const categoryTrigger = screen.getAllByRole("combobox")[0];
    fireEvent.click(categoryTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Stack" }));

    const diffTrigger = screen.getAllByRole("combobox")[1];
    fireEvent.click(diffTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Hard" }));

    expect(screen.getByText("No problems match filters.")).toBeDefined();
  });

  it("shows a fetch error when the problem list cannot be loaded", () => {
    mockProblems.error = "Failed to load problems.";
    mockProblems.problems = [];

    render(<ProblemSelector currentProblemId={null} executionInProgress={false} />);

    expect(screen.getByText("Failed to load problems.")).toBeDefined();
  });
});
