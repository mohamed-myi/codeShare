import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { problemRoutes } from "../../routes/problems.js";

const mockList = vi.fn();
const mockGetById = vi.fn();

vi.mock("../../services/ProblemService.js", () => ({
  problemService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

function buildApp() {
  const app = Fastify();
  app.register(problemRoutes, { prefix: "/api" });
  return app;
}

const MOCK_PROBLEMS = [
  {
    id: "uuid-1",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    category: "Arrays & Hashing",
  },
  {
    id: "uuid-2",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    category: "Stack",
  },
];

const MOCK_DETAIL = {
  id: "uuid-1",
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  category: "Arrays & Hashing",
  description: "Given an array...",
  constraints: ["2 <= nums.length <= 10^4"],
  solution: "Use a hash map",
  timeLimitMs: 5000,
  source: "curated",
  sourceUrl: "https://leetcode.com/problems/two-sum/",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  visibleTestCases: [
    {
      id: "tc-1",
      problemId: "uuid-1",
      input: { nums: [2, 7, 11, 15], target: 9 },
      expectedOutput: [0, 1],
      isVisible: true,
      orderIndex: 0,
    },
  ],
  boilerplate: {
    id: "bp-1",
    problemId: "uuid-1",
    language: "python",
    template:
      "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
    methodName: "twoSum",
    parameterNames: ["nums", "target"],
  },
};

beforeEach(() => {
  mockList.mockReset();
  mockGetById.mockReset();
});

describe("GET /api/problems", () => {
  it("returns { problems: [...] } from service", async () => {
    mockList.mockResolvedValue(MOCK_PROBLEMS);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.problems).toEqual(MOCK_PROBLEMS);
    expect(mockList).toHaveBeenCalledWith({});
  });

  it("passes category filter to service", async () => {
    mockList.mockResolvedValue([MOCK_PROBLEMS[1]]);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems?category=Stack",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.problems).toEqual([MOCK_PROBLEMS[1]]);
    expect(mockList).toHaveBeenCalledWith({ category: "Stack" });
  });

  it("passes difficulty filter to service", async () => {
    mockList.mockResolvedValue(MOCK_PROBLEMS);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems?difficulty=easy",
    });

    expect(res.statusCode).toBe(200);
    expect(mockList).toHaveBeenCalledWith({ difficulty: "easy" });
  });

  it("returns 400 for invalid difficulty value", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems?difficulty=invalid",
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("GET /api/problems/:id", () => {
  it("returns problem detail from service", async () => {
    mockGetById.mockResolvedValue(MOCK_DETAIL);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems/uuid-1",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("uuid-1");
    expect(body.title).toBe("Two Sum");
    expect(body.visibleTestCases).toHaveLength(1);
    expect(body.boilerplate.methodName).toBe("twoSum");
    expect(mockGetById).toHaveBeenCalledWith("uuid-1");
  });

  it("returns 404 when service returns null", async () => {
    mockGetById.mockResolvedValue(null);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/problems/nonexistent-id",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe("Problem not found");
    expect(mockGetById).toHaveBeenCalledWith("nonexistent-id");
  });
});
