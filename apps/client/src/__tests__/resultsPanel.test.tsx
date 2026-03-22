import type { RunResult, SubmitResult } from "@codeshare/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsPanel } from "../components/ResultsPanel.tsx";

describe("ResultsPanel", () => {
  it("shows placeholder when no result and not executing", () => {
    render(<ResultsPanel executionResult={null} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/no results/i)).toBeDefined();
  });

  it("shows executing indicator when in progress", () => {
    render(<ResultsPanel executionResult={null} executionInProgress={true} lastError={null} />);
    expect(screen.getByText(/running/i)).toBeDefined();
  });

  it("RunResult all pass: shows passed count and green indicators", () => {
    const result: RunResult = {
      type: "run",
      passed: 3,
      total: 3,
      cases: [
        { index: 0, passed: true, elapsedMs: 10 },
        { index: 1, passed: true, elapsedMs: 8 },
        { index: 2, passed: true, elapsedMs: 12 },
      ],
      userStdout: "",
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/3\/3/)).toBeDefined();
  });

  it("RunResult failure: shows Got/Expected for failed case", () => {
    const result: RunResult = {
      type: "run",
      passed: 1,
      total: 2,
      cases: [
        { index: 0, passed: true, elapsedMs: 10 },
        {
          index: 1,
          passed: false,
          elapsedMs: 15,
          got: "[1, 0]",
          expected: "[0, 1]",
          input: '{"nums":[2,7],"target":9}',
        },
      ],
      userStdout: "",
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/1\/2/)).toBeDefined();
    expect(screen.getByText("[1, 0]")).toBeDefined();
    expect(screen.getByText("[0, 1]")).toBeDefined();
  });

  it("RunResult error case: shows error text", () => {
    const result: RunResult = {
      type: "run",
      passed: 0,
      total: 1,
      cases: [
        {
          index: 0,
          passed: false,
          elapsedMs: 0,
          error: "NameError: name 'x' is not defined",
        },
      ],
      userStdout: "",
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/NameError/)).toBeDefined();
  });

  it("RunResult slow case: shows slow warning", () => {
    const result: RunResult = {
      type: "run",
      passed: 1,
      total: 1,
      cases: [{ index: 0, passed: true, elapsedMs: 600, slow: true }],
      userStdout: "",
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/slow/i)).toBeDefined();
  });

  it("RunResult userStdout: shows console output", () => {
    const result: RunResult = {
      type: "run",
      passed: 1,
      total: 1,
      cases: [{ index: 0, passed: true, elapsedMs: 10 }],
      userStdout: "debug line 1\nline 2",
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/debug line 1/)).toBeDefined();
  });

  it("SubmitResult all pass: shows passed count and success", () => {
    const result: SubmitResult = {
      type: "submit",
      passed: 50,
      total: 50,
      firstFailure: null,
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/50\/50/)).toBeDefined();
  });

  it("SubmitResult partial: shows first failure details", () => {
    const result: SubmitResult = {
      type: "submit",
      passed: 42,
      total: 50,
      firstFailure: {
        index: 5,
        input: '{"nums":[1,2],"target":3}',
        got: "[0, 0]",
        expected: "[0, 1]",
      },
    };
    render(<ResultsPanel executionResult={result} executionInProgress={false} lastError={null} />);
    expect(screen.getByText(/42\/50/)).toBeDefined();
    expect(screen.getByText("[0, 0]")).toBeDefined();
    expect(screen.getByText("[0, 1]")).toBeDefined();
  });

  it("shows error message from lastError", () => {
    render(
      <ResultsPanel
        executionResult={null}
        executionInProgress={false}
        lastError="Compilation error: SyntaxError"
      />,
    );
    expect(screen.getByText(/SyntaxError/)).toBeDefined();
  });
});
