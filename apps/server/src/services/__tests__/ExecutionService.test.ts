import { describe, it, expect } from "vitest";
import { executionService, type HarnessCase } from "../ExecutionService.js";
import type { TestCase } from "@codeshare/shared";

const makeTestCase = (
  input: Record<string, unknown>,
  expectedOutput: unknown,
  overrides?: Partial<TestCase>,
): TestCase => ({
  id: "tc-1",
  problemId: "p1",
  input,
  expectedOutput,
  isVisible: true,
  orderIndex: 0,
  ...overrides,
});

describe("parseResult", () => {
  it("parses the final harness payload when stdout contains earlier marker-shaped text", () => {
    const spoofedPayload = JSON.stringify({
      results: [{ index: 99, passed: true }],
      userStdout: "spoofed",
    });
    const realPayload = JSON.stringify({
      results: [{ index: 0, passed: false, got: "1", expected: "2" }],
      userStdout: "actual",
    });

    const stdout = [
      "===HARNESS_RESULT===",
      spoofedPayload,
      "===END_HARNESS_RESULT===",
      "user noise",
      "===HARNESS_RESULT===",
      realPayload,
      "===END_HARNESS_RESULT===",
    ].join("\n");

    expect(executionService.parseResult(stdout)).toEqual(JSON.parse(realPayload));
  });

  it("returns null for empty stdout", () => {
    expect(executionService.parseResult("")).toBeNull();
  });

  it("returns null when start marker present but end marker missing", () => {
    const stdout = "===HARNESS_RESULT===\n{\"results\":[]}\nno end marker";
    expect(executionService.parseResult(stdout)).toBeNull();
  });

  it("returns null when JSON between markers is malformed", () => {
    const stdout = "===HARNESS_RESULT===\n{not valid json}\n===END_HARNESS_RESULT===";
    expect(executionService.parseResult(stdout)).toBeNull();
  });
});

describe("buildHarness", () => {
  it("embeds user code, test cases JSON, and method name", () => {
    const testCases = [makeTestCase({ n: 5 }, 10)];
    const harness = executionService.buildHarness(
      "class Solution:\n  def solve(self, n): return n * 2",
      testCases,
      "solve",
    );
    expect(harness).toContain("class Solution:");
    expect(harness).toContain(".solve(");
    expect(harness).toContain("===HARNESS_RESULT===");
    expect(harness).toContain("===END_HARNESS_RESULT===");
    expect(harness).toContain('"expectedOutput"');
  });
});

describe("buildRunResult", () => {
  it("all cases pass: correct type, passed/total, each case has passed + elapsedMs", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 12, got: null, expected: null },
      { index: 1, passed: true, elapsed_ms: 8, got: null, expected: null },
    ];
    const testCases = [
      makeTestCase({ nums: [2, 7], target: 9 }, [0, 1]),
      makeTestCase({ nums: [3, 2, 4], target: 6 }, [1, 2], { id: "tc-2", orderIndex: 1 }),
    ];

    const result = executionService.buildRunResult(parsed, "", testCases);

    expect(result.type).toBe("run");
    expect(result.passed).toBe(2);
    expect(result.total).toBe(2);
    expect(result.cases).toHaveLength(2);
    expect(result.cases[0].passed).toBe(true);
    expect(result.cases[0].elapsedMs).toBe(12);
    expect(result.cases[1].passed).toBe(true);
    expect(result.cases[1].elapsedMs).toBe(8);
  });

  it("failed case: got and expected strings populated, input populated", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: false, elapsed_ms: 15, got: "[1, 0]", expected: "[0, 1]" },
    ];
    const testCases = [
      makeTestCase({ nums: [2, 7], target: 9 }, [0, 1]),
    ];

    const result = executionService.buildRunResult(parsed, "", testCases);

    expect(result.passed).toBe(0);
    expect(result.total).toBe(1);
    expect(result.cases[0].passed).toBe(false);
    expect(result.cases[0].got).toBe("[1, 0]");
    expect(result.cases[0].expected).toBe("[0, 1]");
    expect(result.cases[0].input).toBe(JSON.stringify({ nums: [2, 7], target: 9 }));
  });

  it("error case: error string populated, no got/expected", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: false, error: "NameError: name 'x' is not defined" },
    ];
    const testCases = [makeTestCase({ x: 1 }, 2)];

    const result = executionService.buildRunResult(parsed, "", testCases);

    expect(result.cases[0].passed).toBe(false);
    expect(result.cases[0].error).toBe("NameError: name 'x' is not defined");
    expect(result.cases[0].got).toBeUndefined();
    expect(result.cases[0].expected).toBeUndefined();
  });

  it("slow case flagged: elapsed_ms > 500 sets slow: true", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 600, got: null, expected: null },
      { index: 1, passed: true, elapsed_ms: 100, got: null, expected: null },
    ];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = executionService.buildRunResult(parsed, "", testCases);

    expect(result.cases[0].slow).toBe(true);
    expect(result.cases[1].slow).toBeFalsy();
  });

  it("userStdout passed through", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 5, got: null, expected: null },
    ];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = executionService.buildRunResult(parsed, "debug output\nline 2", testCases);

    expect(result.userStdout).toBe("debug output\nline 2");
  });

  it("custom test cases appended after visible (correct indexing)", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 5, got: null, expected: null },
      { index: 1, passed: false, elapsed_ms: 10, got: "99", expected: "42" },
    ];
    const allTestCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 42, { id: "custom-1", orderIndex: 1 }),
    ];

    const result = executionService.buildRunResult(parsed, "", allTestCases);

    expect(result.total).toBe(2);
    expect(result.cases[1].input).toBe(JSON.stringify({ n: 2 }));
    expect(result.cases[1].got).toBe("99");
    expect(result.cases[1].expected).toBe("42");
  });

  it("missing elapsed_ms defaults to 0", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, got: null, expected: null },
    ];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = executionService.buildRunResult(parsed, "", testCases);

    expect(result.cases[0].elapsedMs).toBe(0);
  });
});

describe("buildSubmitResult", () => {
  it("all pass: firstFailure is null", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 5, got: null, expected: null },
      { index: 1, passed: true, elapsed_ms: 3, got: null, expected: null },
      { index: 2, passed: true, elapsed_ms: 7, got: null, expected: null },
    ];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
      makeTestCase({ n: 3 }, 3, { id: "tc-3", orderIndex: 2 }),
    ];

    const result = executionService.buildSubmitResult(parsed, testCases);

    expect(result.type).toBe("submit");
    expect(result.passed).toBe(3);
    expect(result.total).toBe(3);
    expect(result.firstFailure).toBeNull();
  });

  it("first failure captured with correct index, got, expected, input", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 5, got: null, expected: null },
      { index: 1, passed: false, elapsed_ms: 10, got: "[2, 1]", expected: "[1, 2]" },
      { index: 2, passed: false, elapsed_ms: 8, got: "[3, 0]", expected: "[0, 3]" },
    ];
    const testCases = [
      makeTestCase({ nums: [1], target: 1 }, [0], { id: "tc-1", orderIndex: 0 }),
      makeTestCase({ nums: [3, 2], target: 5 }, [1, 2], { id: "tc-2", orderIndex: 1 }),
      makeTestCase({ nums: [5, 3], target: 8 }, [0, 3], { id: "tc-3", orderIndex: 2 }),
    ];

    const result = executionService.buildSubmitResult(parsed, testCases);

    expect(result.passed).toBe(1);
    expect(result.total).toBe(3);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure!.index).toBe(1);
    expect(result.firstFailure!.got).toBe("[2, 1]");
    expect(result.firstFailure!.expected).toBe("[1, 2]");
    expect(result.firstFailure!.input).toBe(JSON.stringify({ nums: [3, 2], target: 5 }));
  });

  it("multiple failures: only first captured", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: false, elapsed_ms: 5, got: "wrong0", expected: "right0" },
      { index: 1, passed: false, elapsed_ms: 3, got: "wrong1", expected: "right1" },
    ];
    const testCases = [
      makeTestCase({ a: 1 }, 10),
      makeTestCase({ a: 2 }, 20, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = executionService.buildSubmitResult(parsed, testCases);

    expect(result.firstFailure!.index).toBe(0);
    expect(result.firstFailure!.got).toBe("wrong0");
  });

  it("error case counts as failure", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: true, elapsed_ms: 5, got: null, expected: null },
      { index: 1, passed: false, error: "RuntimeError: division by zero" },
    ];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 0 }, 0, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = executionService.buildSubmitResult(parsed, testCases);

    expect(result.passed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure!.index).toBe(1);
  });

  it("redacts hidden test case details in firstFailure", () => {
    const parsed: HarnessCase[] = [
      { index: 0, passed: false, got: "[1, 0]", expected: "[0, 1]" },
    ];
    const testCases = [
      makeTestCase({ nums: [2, 7] }, [0, 1], { isVisible: false }),
    ];
    const result = executionService.buildSubmitResult(parsed, testCases);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure!.input).toBe("");
    expect(result.firstFailure!.got).toContain("hidden");
    expect(result.firstFailure!.expected).toContain("Hidden");
  });
});
