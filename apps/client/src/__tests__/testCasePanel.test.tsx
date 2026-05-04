import type { CustomTestCase, TestCase } from "@codeshare/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestCasePanel } from "../components/TestCasePanel.tsx";

const mockTestCases: TestCase[] = [
  {
    id: "tc-1",
    problemId: "p1",
    input: { nums: [2, 7, 11, 15], target: 9 },
    expectedOutput: [0, 1],
    isVisible: true,
    orderIndex: 0,
  },
  {
    id: "tc-2",
    problemId: "p1",
    input: { nums: [3, 2, 4], target: 6 },
    expectedOutput: [1, 2],
    isVisible: true,
    orderIndex: 1,
  },
];

describe("TestCasePanel", () => {
  it("shows empty state when no test cases", () => {
    render(<TestCasePanel testCases={[]} />);
    expect(screen.getByText("No test cases yet.")).toBeDefined();
  });

  it("renders numbered case labels", () => {
    render(<TestCasePanel testCases={mockTestCases} />);
    expect(screen.getByText("Case 1")).toBeDefined();
    expect(screen.getByText("Case 2")).toBeDefined();
  });

  it("displays input parameter names and values", () => {
    render(<TestCasePanel testCases={[mockTestCases[0]]} />);
    expect(screen.getByText("nums:")).toBeDefined();
    expect(screen.getByText("target:")).toBeDefined();
    expect(screen.getByText("[2,7,11,15]")).toBeDefined();
    expect(screen.getByText("9")).toBeDefined();
  });

  it("displays expected output", () => {
    render(<TestCasePanel testCases={[mockTestCases[0]]} />);
    expect(screen.getByText("[0,1]")).toBeDefined();
  });

  it("renders multiple test cases", () => {
    render(<TestCasePanel testCases={mockTestCases} />);
    const expectedLabels = screen.getAllByText(/^Expected:$/);
    expect(expectedLabels).toHaveLength(2);
  });
});

describe("TestCasePanel - custom test cases", () => {
  const customCases: CustomTestCase[] = [
    { input: { nums: [1, 3], target: 4 }, expectedOutput: [0, 1] },
  ];

  it("custom test cases rendered in separate section", () => {
    render(
      <TestCasePanel
        testCases={mockTestCases}
        customTestCases={customCases}
        parameterNames={["nums", "target"]}
        onAddTestCase={vi.fn()}
        canAddMore={true}
      />,
    );
    expect(screen.getByText("Custom Test Cases")).toBeDefined();
  });

  it("renders duplicate custom test case inputs without duplicate key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const duplicateCustomCases: CustomTestCase[] = [
      { input: { nums: [1, 2], target: 3 }, expectedOutput: [0, 1] },
      { input: { nums: [1, 2], target: 3 }, expectedOutput: [0, 1] },
    ];

    try {
      render(<TestCasePanel testCases={[]} customTestCases={duplicateCustomCases} />);

      expect(screen.getByText("Custom 1")).toBeDefined();
      expect(screen.getByText("Custom 2")).toBeDefined();
      expect(
        consoleError.mock.calls.some((args) =>
          args.some((arg) => String(arg).includes("Encountered two children with the same key")),
        ),
      ).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("add form visible when parameterNames non-empty and canAddMore: true", () => {
    render(
      <TestCasePanel
        testCases={mockTestCases}
        parameterNames={["nums", "target"]}
        onAddTestCase={vi.fn()}
        canAddMore={true}
      />,
    );
    expect(screen.getByText("Add Test Case")).toBeDefined();
  });

  it("form hidden when limit reached (canAddMore: false)", () => {
    render(
      <TestCasePanel
        testCases={mockTestCases}
        parameterNames={["nums", "target"]}
        onAddTestCase={vi.fn()}
        canAddMore={false}
      />,
    );
    expect(screen.queryByText("Add Test Case")).toBeNull();
  });

  it("form fields generated from parameterNames", () => {
    render(
      <TestCasePanel
        testCases={mockTestCases}
        parameterNames={["nums", "target"]}
        onAddTestCase={vi.fn()}
        canAddMore={true}
      />,
    );
    expect(screen.getByLabelText("nums")).toBeDefined();
    expect(screen.getByLabelText("target")).toBeDefined();
    expect(screen.getByLabelText("Expected Output")).toBeDefined();
  });

  it("submitting form calls onAddTestCase with correct CustomTestCase", () => {
    const onAdd = vi.fn();
    render(
      <TestCasePanel
        testCases={[]}
        parameterNames={["nums", "target"]}
        onAddTestCase={onAdd}
        canAddMore={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("nums"), {
      target: { value: "[1, 2, 3]" },
    });
    fireEvent.change(screen.getByLabelText("target"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Expected Output"), {
      target: { value: "[0, 2]" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd).toHaveBeenCalledWith({
      input: { nums: [1, 2, 3], target: 5 },
      expectedOutput: [0, 2],
    });
  });

  it("surfaces invalid JSON instead of silently coercing it to a string", () => {
    const onAdd = vi.fn();
    render(
      <TestCasePanel
        testCases={[]}
        parameterNames={["nums"]}
        onAddTestCase={onAdd}
        canAddMore={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("nums"), {
      target: { value: "[1, 2" },
    });
    fireEvent.change(screen.getByLabelText("Expected Output"), {
      target: { value: "3" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("nums");
  });

  it("resets form state when parameter names change", () => {
    const { rerender } = render(
      <TestCasePanel
        testCases={[]}
        parameterNames={["nums"]}
        onAddTestCase={vi.fn()}
        canAddMore={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("nums"), {
      target: { value: "[1, 2, 3]" },
    });

    rerender(
      <TestCasePanel
        testCases={[]}
        parameterNames={["prices"]}
        onAddTestCase={vi.fn()}
        canAddMore={true}
      />,
    );

    expect(screen.queryByLabelText("nums")).toBeNull();
    expect(screen.getByLabelText("prices")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Expected Output")).toHaveProperty("value", "");
  });
});
