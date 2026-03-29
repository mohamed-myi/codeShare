import { describe, expect, it } from "vitest";
import {
  type BoilerplateRow,
  type HintRow,
  type ProblemRow,
  type TestCaseRow,
  toBoilerplate,
  toHint,
  toProblem,
  toTestCase,
} from "../types.js";

describe("toProblem", () => {
  it("maps snake_case row to camelCase type", () => {
    const row: ProblemRow = {
      id: "abc",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["2 <= nums.length"],
      solution: "Use a hash map",
      time_limit_ms: 5000,
      source: "curated",
      source_url: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const result = toProblem(row);
    expect(result).toEqual({
      id: "abc",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["2 <= nums.length"],
      solution: "Use a hash map",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });
});

describe("toTestCase", () => {
  it("maps snake_case testcase fields", () => {
    const row: TestCaseRow = {
      id: "tc-1",
      problem_id: "abc",
      input: { nums: [2, 7], target: 9 },
      expected_output: [0, 1],
      is_visible: true,
      order_index: 3,
    };

    expect(toTestCase(row)).toEqual({
      id: "tc-1",
      problemId: "abc",
      input: { nums: [2, 7], target: 9 },
      expectedOutput: [0, 1],
      isVisible: true,
      orderIndex: 3,
    });
  });
});

describe("toBoilerplate", () => {
  it("maps snake_case boilerplate fields", () => {
    const row: BoilerplateRow = {
      id: "bp-1",
      problem_id: "abc",
      language: "python",
      template: "class Solution:\n    pass",
      method_name: "twoSum",
      parameter_names: ["nums", "target"],
    };

    expect(toBoilerplate(row)).toEqual({
      id: "bp-1",
      problemId: "abc",
      language: "python",
      template: "class Solution:\n    pass",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    });
  });
});

describe("toHint", () => {
  it("maps snake_case hint fields", () => {
    const row: HintRow = {
      id: "hint-1",
      problem_id: "abc",
      hint_text: "Use a hash map.",
      order_index: 2,
    };

    expect(toHint(row)).toEqual({
      id: "hint-1",
      problemId: "abc",
      hintText: "Use a hash map.",
      orderIndex: 2,
    });
  });
});
