import type { Problem } from "@codeshare/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProblemPanel } from "../components/ProblemPanel.tsx";

const mockProblem: Problem = {
  id: "p1",
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays & Hashing",
  description:
    "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
  constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  solution: "Use a hash map",
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const baseHintProps = {
  hintsUsed: 0,
  hintLimit: 2,
  pendingHintRequest: null,
  isHintStreaming: false,
  hintText: "",
  currentUserId: "user1",
  mode: "collaboration" as const,
  executionInProgress: false,
  onRequestHint: vi.fn(),
  onApproveHint: vi.fn(),
  onDenyHint: vi.fn(),
};

describe("ProblemPanel", () => {
  it("shows empty state when no problem selected", () => {
    render(<ProblemPanel problem={null} />);
    expect(screen.getByText("Select a problem to begin.")).toBeDefined();
  });

  it("displays problem title and difficulty badge", () => {
    render(<ProblemPanel problem={mockProblem} />);
    expect(screen.getByText("Two Sum")).toBeDefined();
    expect(screen.getByText("easy")).toBeDefined();
  });

  it("displays category", () => {
    render(<ProblemPanel problem={mockProblem} />);
    expect(screen.getByText("Arrays & Hashing")).toBeDefined();
  });

  it("renders inline code in description", () => {
    render(<ProblemPanel problem={mockProblem} />);
    const codeElements = document.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThan(0);
    const codeTexts = [...codeElements].map((el) => el.textContent);
    expect(codeTexts).toContain("nums");
    expect(codeTexts).toContain("target");
  });

  it("displays constraints as a list", () => {
    render(<ProblemPanel problem={mockProblem} />);
    expect(screen.getByText("Constraints:")).toBeDefined();
    expect(screen.getByText("2 <= nums.length <= 10^4")).toBeDefined();
  });

  it("shows attribution for user_submitted problems with sourceUrl", () => {
    const imported: Problem = {
      ...mockProblem,
      source: "user_submitted",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
    };
    render(<ProblemPanel problem={imported} />);
    expect(screen.getByText("LeetCode")).toBeDefined();
  });

  it("does not show attribution for curated problems", () => {
    render(<ProblemPanel problem={mockProblem} />);
    expect(screen.queryByText("LeetCode")).toBeNull();
  });
});

describe("ProblemPanel - Hint integration", () => {
  it("does not show hint button in interview mode", () => {
    render(<ProblemPanel problem={mockProblem} hint={{ ...baseHintProps, mode: "interview" }} />);
    expect(screen.queryByText(/Get Hint/)).toBeNull();
  });

  it("does not show hint button when no hint props", () => {
    render(<ProblemPanel problem={mockProblem} />);
    expect(screen.queryByText(/Get Hint/)).toBeNull();
  });

  it("shows request hint button and calls onRequestHint when available", () => {
    const onRequestHint = vi.fn();
    render(<ProblemPanel problem={mockProblem} hint={{ ...baseHintProps, onRequestHint }} />);

    fireEvent.click(screen.getByTestId("request-hint-button"));
    expect(onRequestHint).toHaveBeenCalledOnce();
  });

  it("does not show hint button when hints exhausted", () => {
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{ ...baseHintProps, hintsUsed: 2, hintLimit: 2 }}
      />,
    );
    expect(screen.queryByText(/Get Hint/)).toBeNull();
    expect(screen.getByText("All hints used")).toBeDefined();
  });

  it("shows waiting message for requester", () => {
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          pendingHintRequest: {
            requestedBy: "user1",
            requestedAt: "2024-01-01T00:00:00.000Z",
          },
        }}
      />,
    );
    expect(screen.getByText("Waiting for partner's approval...")).toBeDefined();
  });

  it("shows approve/deny for partner", () => {
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          pendingHintRequest: {
            requestedBy: "other-user",
            requestedAt: "2024-01-01T00:00:00.000Z",
          },
        }}
      />,
    );
    expect(screen.getByText("Your partner wants a hint.")).toBeDefined();
    expect(screen.getByText("Approve")).toBeDefined();
    expect(screen.getByText("Deny")).toBeDefined();
  });

  it("approve button calls onApproveHint", () => {
    const onApproveHint = vi.fn();
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          onApproveHint,
          pendingHintRequest: {
            requestedBy: "other-user",
            requestedAt: "2024-01-01T00:00:00.000Z",
          },
        }}
      />,
    );
    fireEvent.click(screen.getByText("Approve"));
    expect(onApproveHint).toHaveBeenCalledOnce();
  });

  it("deny button calls onDenyHint", () => {
    const onDenyHint = vi.fn();
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          onDenyHint,
          pendingHintRequest: {
            requestedBy: "other-user",
            requestedAt: "2024-01-01T00:00:00.000Z",
          },
        }}
      />,
    );
    fireEvent.click(screen.getByText("Deny"));
    expect(onDenyHint).toHaveBeenCalledOnce();
  });

  it("shows streaming hint text with cursor", () => {
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          isHintStreaming: true,
          hintText: "Consider using",
        }}
      />,
    );
    expect(screen.getByText(/Consider using/)).toBeDefined();
    const cursor = document.querySelector(".animate-pulse");
    expect(cursor).not.toBeNull();
  });

  it("shows completed hint text", () => {
    render(
      <ProblemPanel
        problem={mockProblem}
        hint={{
          ...baseHintProps,
          hintText: "Use a hash map approach",
          hintsUsed: 1,
          hintLimit: 2,
        }}
      />,
    );
    expect(screen.getByText("Use a hash map approach")).toBeDefined();
  });

  it("blocks hint button while execution is running", () => {
    render(
      <ProblemPanel problem={mockProblem} hint={{ ...baseHintProps, executionInProgress: true }} />,
    );
    expect(screen.queryByText("Get Hint (2 remaining)")).toBeNull();
    expect(screen.getByText(/Finish the current execution/i)).toBeDefined();
  });
});
