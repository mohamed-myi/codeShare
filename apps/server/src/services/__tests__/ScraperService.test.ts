import type { Problem } from "@codeshare/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createScraperService } from "../ScraperService.js";

const createdProblem: Problem = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Algorithms",
  description: "placeholder",
  constraints: [],
  solution: null,
  timeLimitMs: 5000,
  source: "user_submitted",
  sourceUrl: "https://leetcode.com/problems/two-sum/",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function buildQuestionResponse() {
  return {
    data: {
      question: {
        title: "Two Sum",
        difficulty: "Easy",
        categoryTitle: "Algorithms",
        content: `
          <p>Return indices that add to the target.</p>
          <p><strong class="example">Example 1:</strong></p>
          <pre>
            <strong>Input:</strong> nums = [2,7,11,15], target = 9
            <strong>Output:</strong> [0,1]
          </pre>
          <p><strong class="example">Example 2:</strong></p>
          <pre>
            <strong>Input:</strong> nums = [3,2,4], target = 6
            <strong>Output:</strong> [1,2]
          </pre>
          <p><strong>Constraints:</strong></p>
          <ul>
            <li><code>2 &lt;= nums.length &lt;= 10^4</code></li>
            <li><code>-10^9 &lt;= target &lt;= 10^9</code></li>
          </ul>
        `,
        metaData: JSON.stringify({
          name: "twoSum",
          params: [
            { name: "nums", type: "integer[]" },
            { name: "target", type: "integer" },
          ],
        }),
        codeSnippets: [
          {
            langSlug: "python3",
            code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass\n",
          },
        ],
      },
    },
  };
}

describe("ScraperService", () => {
  const fetchImpl = vi.fn();
  const findBySourceUrl = vi.fn();
  const findBySlug = vi.fn();
  const createProblem = vi.fn();
  const createTestCase = vi.fn();
  const createBoilerplate = vi.fn();
  const deleteProblem = vi.fn();

  beforeEach(() => {
    fetchImpl.mockReset();
    findBySourceUrl.mockReset();
    findBySlug.mockReset();
    createProblem.mockReset();
    createTestCase.mockReset();
    createBoilerplate.mockReset();
    deleteProblem.mockReset();

    findBySourceUrl.mockResolvedValue(null);
    findBySlug.mockResolvedValue(null);
    createProblem.mockResolvedValue(createdProblem);
    createTestCase.mockResolvedValue(null);
    createBoilerplate.mockResolvedValue(null);
    deleteProblem.mockResolvedValue(undefined);
  });

  it("imports a LeetCode problem through GraphQL and persists canonical records", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => buildQuestionResponse(),
    });

    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
    });

    const result = await service.importFromUrl("https://leetcode.com/problems/two-sum/");

    expect(result).toEqual(createdProblem);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://leetcode.com/graphql",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(createProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        source: "user_submitted",
        sourceUrl: "https://leetcode.com/problems/two-sum/",
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= target <= 10^9"],
      }),
    );
    expect(createTestCase).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        problemId: createdProblem.id,
        input: { nums: [2, 7, 11, 15], target: 9 },
        expectedOutput: [0, 1],
        isVisible: true,
        orderIndex: 0,
      }),
    );
    expect(createTestCase).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: { nums: [3, 2, 4], target: 6 },
        expectedOutput: [1, 2],
        orderIndex: 1,
      }),
    );
    expect(createBoilerplate).toHaveBeenCalledWith({
      problemId: createdProblem.id,
      language: "python",
      template:
        "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass\n",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    });
  });

  it("returns an existing problem without fetching when sourceUrl already exists", async () => {
    findBySourceUrl.mockResolvedValue(createdProblem);

    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
    });

    const result = await service.importFromUrl("https://leetcode.com/problems/two-sum/");

    expect(result).toEqual(createdProblem);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(createProblem).not.toHaveBeenCalled();
  });

  it("rejects invalid LeetCode URLs", async () => {
    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
    });

    await expect(service.importFromUrl("https://example.com/problems/two-sum/")).rejects.toThrow(
      "URL must match https://leetcode.com/problems/<slug>/",
    );
  });

  it("fails when example inputs cannot be transformed into canonical test cases", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          question: {
            ...buildQuestionResponse().data.question,
            content: `
              <p><strong class="example">Example 1:</strong></p>
              <pre>
                <strong>Input:</strong> nums, target
                <strong>Output:</strong> [0,1]
              </pre>
            `,
          },
        },
      }),
    });

    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
    });

    await expect(service.importFromUrl("https://leetcode.com/problems/two-sum/")).rejects.toThrow(
      "Failed to parse imported example inputs.",
    );
    expect(createProblem).not.toHaveBeenCalled();
    expect(createTestCase).not.toHaveBeenCalled();
  });

  it("rolls back the created problem when a later write fails", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => buildQuestionResponse(),
    });
    createTestCase
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("insert test case failed"));

    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
    });

    await expect(service.importFromUrl("https://leetcode.com/problems/two-sum/")).rejects.toThrow(
      "insert test case failed",
    );

    expect(deleteProblem).toHaveBeenCalledWith(createdProblem.id);
  });

  it("supports overriding the LeetCode GraphQL URL for local E2E stubs", async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      json: async () => buildQuestionResponse(),
    });

    const service = createScraperService({
      fetchImpl,
      findBySourceUrl,
      findBySlug,
      createProblem,
      createTestCase,
      createBoilerplate,
      deleteProblem,
      graphQlUrl: "http://127.0.0.1:4100/graphql",
    });

    await service.importFromUrl("https://leetcode.com/problems/two-sum/");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:4100/graphql",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
