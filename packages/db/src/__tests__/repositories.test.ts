import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("../pool.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

import { boilerplateRepository } from "../repositories/boilerplateRepository.js";
import { hintRepository } from "../repositories/hintRepository.js";
import { testCaseRepository } from "../repositories/testCaseRepository.js";

describe("testCaseRepository", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("findVisible returns mapped visible test cases in order", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "tc-1",
          problem_id: "problem-1",
          input: { nums: [2, 7], target: 9 },
          expected_output: [0, 1],
          is_visible: true,
          order_index: 0,
        },
      ],
    });

    const result = await testCaseRepository.findVisible("problem-1");

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("is_visible = true"), [
      "problem-1",
    ]);
    expect(result).toEqual([
      {
        id: "tc-1",
        problemId: "problem-1",
        input: { nums: [2, 7], target: 9 },
        expectedOutput: [0, 1],
        isVisible: true,
        orderIndex: 0,
      },
    ]);
  });

  it("countHidden converts the database count to a number", async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: "3" }] });

    const result = await testCaseRepository.countHidden("problem-1");

    expect(result).toBe(3);
  });

  it("maxOrderIndex falls back to -1 when no rows exist", async () => {
    mockQuery.mockResolvedValue({ rows: [{ max: null }] });

    const result = await testCaseRepository.maxOrderIndex("problem-1");

    expect(result).toBe(-1);
  });

  it("createMany is a no-op for an empty batch", async () => {
    await testCaseRepository.createMany([]);

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("createMany serializes each case and uses conflict-safe inserts", async () => {
    await testCaseRepository.createMany([
      {
        problemId: "problem-1",
        input: { nums: [2, 7], target: 9 },
        expectedOutput: [0, 1],
        isVisible: true,
        orderIndex: 0,
      },
      {
        problemId: "problem-1",
        input: { nums: [3, 2, 4], target: 6 },
        expectedOutput: [1, 2],
        isVisible: false,
        orderIndex: 1,
      },
    ]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (problem_id, order_index) DO NOTHING"),
      [
        "problem-1",
        JSON.stringify({ nums: [2, 7], target: 9 }),
        JSON.stringify([0, 1]),
        true,
        0,
        "problem-1",
        JSON.stringify({ nums: [3, 2, 4], target: 6 }),
        JSON.stringify([1, 2]),
        false,
        1,
      ],
    );
  });
});

describe("boilerplateRepository", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("findByProblemAndLanguage returns the mapped boilerplate", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "bp-1",
          problem_id: "problem-1",
          language: "python",
          template: "class Solution:\n    pass",
          method_name: "twoSum",
          parameter_names: ["nums", "target"],
        },
      ],
    });

    const result = await boilerplateRepository.findByProblemAndLanguage("problem-1", "python");

    expect(result).toEqual({
      id: "bp-1",
      problemId: "problem-1",
      language: "python",
      template: "class Solution:\n    pass",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    });
  });

  it("findByProblemAndLanguage returns null when no boilerplate exists", async () => {
    const result = await boilerplateRepository.findByProblemAndLanguage("problem-1", "python");

    expect(result).toBeNull();
  });

  it("counts polluted python boilerplates with a leading future import", async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: "2" }] });

    const result = await boilerplateRepository.countLeadingFutureAnnotationsImports("python");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("template LIKE 'from __future__ import annotations%'"),
      ["python"],
    );
    expect(result).toBe(2);
  });

  it("cleans polluted python boilerplates by removing the leading future import", async () => {
    mockQuery.mockResolvedValue({ rows: [{ cleaned_boilerplate_count: "3" }] });

    const result = await boilerplateRepository.cleanLeadingFutureAnnotationsImports("python");

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("regexp_replace"), ["python"]);
    expect(result).toEqual({ cleanedBoilerplateCount: 3 });
  });
});

describe("hintRepository", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("findByProblemId returns mapped hints in order", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "hint-1",
          problem_id: "problem-1",
          hint_text: "Use a hash map.",
          order_index: 0,
        },
      ],
    });

    const result = await hintRepository.findByProblemId("problem-1");

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("ORDER BY order_index"), [
      "problem-1",
    ]);
    expect(result).toEqual([
      {
        id: "hint-1",
        problemId: "problem-1",
        hintText: "Use a hash map.",
        orderIndex: 0,
      },
    ]);
  });
});
