import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindAll, mockFindById, mockFindVisible, mockFindByProblemAndLanguage } = vi.hoisted(
  () => ({
    mockFindAll: vi.fn(),
    mockFindById: vi.fn(),
    mockFindVisible: vi.fn(),
    mockFindByProblemAndLanguage: vi.fn(),
  }),
);

vi.mock("@codeshare/db", () => ({
  problemRepository: {
    findAll: mockFindAll,
    findById: mockFindById,
  },
  testCaseRepository: {
    findVisible: mockFindVisible,
  },
  boilerplateRepository: {
    findByProblemAndLanguage: mockFindByProblemAndLanguage,
  },
}));

import { problemService } from "../ProblemService.js";

describe("problemService", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
    mockFindById.mockReset();
    mockFindVisible.mockReset();
    mockFindByProblemAndLanguage.mockReset();
  });

  it("passes filters through to problemRepository.findAll", async () => {
    mockFindAll.mockResolvedValue([
      {
        id: "problem-1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        category: "Arrays",
      },
    ]);

    const result = await problemService.list({ category: "Arrays", difficulty: "easy" });

    expect(mockFindAll).toHaveBeenCalledWith({ category: "Arrays", difficulty: "easy" });
    expect(result).toHaveLength(1);
  });

  it("returns null without loading related data when the problem does not exist", async () => {
    mockFindById.mockResolvedValue(null);

    const result = await problemService.getById("missing");

    expect(result).toBeNull();
    expect(mockFindVisible).not.toHaveBeenCalled();
    expect(mockFindByProblemAndLanguage).not.toHaveBeenCalled();
  });

  it("returns problem detail with visible test cases and python boilerplate", async () => {
    mockFindById.mockResolvedValue({
      id: "problem-1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["1 <= n <= 10"],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mockFindVisible.mockResolvedValue([
      {
        id: "tc-1",
        problemId: "problem-1",
        input: { nums: [2, 7], target: 9 },
        expectedOutput: [0, 1],
        isVisible: true,
        orderIndex: 0,
      },
    ]);
    mockFindByProblemAndLanguage.mockResolvedValue({
      id: "bp-1",
      problemId: "problem-1",
      language: "python",
      template: "class Solution:\n    pass",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    });

    const result = await problemService.getById("problem-1");

    expect(mockFindVisible).toHaveBeenCalledWith("problem-1");
    expect(mockFindByProblemAndLanguage).toHaveBeenCalledWith("problem-1", "python");
    expect(result).toEqual({
      id: "problem-1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["1 <= n <= 10"],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      visibleTestCases: [
        {
          id: "tc-1",
          problemId: "problem-1",
          input: { nums: [2, 7], target: 9 },
          expectedOutput: [0, 1],
          isVisible: true,
          orderIndex: 0,
        },
      ],
      boilerplate: {
        id: "bp-1",
        problemId: "problem-1",
        language: "python",
        template: "class Solution:\n    pass",
        methodName: "twoSum",
        parameterNames: ["nums", "target"],
      },
    });
  });

  it("strips legacy leading future annotation imports before returning problem detail", async () => {
    mockFindById.mockResolvedValue({
      id: "problem-1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["1 <= n <= 10"],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mockFindVisible.mockResolvedValue([]);
    mockFindByProblemAndLanguage.mockResolvedValue({
      id: "bp-1",
      problemId: "problem-1",
      language: "python",
      template:
        "from __future__ import annotations\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    });

    const result = await problemService.getById("problem-1");

    expect(result?.boilerplate?.template).toBe(
      "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
    );
  });
});
