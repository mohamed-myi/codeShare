import type {
  Difficulty,
  ProblemSource,
  SupportedLanguage,
} from "@codeshare/shared";

interface TestCaseFixture {
  input: Record<string, unknown>;
  expectedOutput: unknown;
  isVisible: boolean;
  orderIndex: number;
}

interface BoilerplateFixture {
  language: SupportedLanguage;
  template: string;
  methodName: string;
  parameterNames: string[];
}

interface HintFixture {
  hintText: string;
  orderIndex: number;
}

export interface ProblemFixture {
  problem: {
    slug: string;
    title: string;
    difficulty: Difficulty;
    category: string;
    description: string;
    constraints: string[];
    solution: string | null;
    timeLimitMs: number;
    source: ProblemSource;
    sourceUrl: string | null;
  };
  testCases: TestCaseFixture[];
  boilerplate: BoilerplateFixture;
  hints: HintFixture[];
}

export const fixtures: ProblemFixture[] = [
  {
    problem: {
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays & Hashing",
      description:
        "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
      constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9",
        "Only one valid answer exists.",
      ],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
    },
    testCases: [
      // Visible
      { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], isVisible: true, orderIndex: 0 },
      { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], isVisible: true, orderIndex: 1 },
      { input: { nums: [3, 3], target: 6 }, expectedOutput: [0, 1], isVisible: true, orderIndex: 2 },
      // Hidden
      { input: { nums: [1, 5, 3, 7], target: 8 }, expectedOutput: [1, 2], isVisible: false, orderIndex: 3 },
      { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expectedOutput: [2, 4], isVisible: false, orderIndex: 4 },
      { input: { nums: [0, 4, 3, 0], target: 0 }, expectedOutput: [0, 3], isVisible: false, orderIndex: 5 },
      { input: { nums: [1, 2], target: 3 }, expectedOutput: [0, 1], isVisible: false, orderIndex: 6 },
      { input: { nums: [5, 75, 25], target: 100 }, expectedOutput: [1, 2], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      methodName: "twoSum",
      parameterNames: ["nums", "target"],
    },
    hints: [
      { hintText: "Try using a hash map to store each number's index as you iterate. For each number, check if `target - num` already exists in the map.", orderIndex: 0 },
    ],
  },
  {
    problem: {
      slug: "valid-parentheses",
      title: "Valid Parentheses",
      difficulty: "easy",
      category: "Stack",
      description:
        "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
      constraints: [
        "1 <= s.length <= 10^4",
        "s consists of parentheses only '()[]{}'.",
      ],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/valid-parentheses/",
    },
    testCases: [
      // Visible
      { input: { s: "()" }, expectedOutput: true, isVisible: true, orderIndex: 0 },
      { input: { s: "()[]{}" }, expectedOutput: true, isVisible: true, orderIndex: 1 },
      { input: { s: "(]" }, expectedOutput: false, isVisible: true, orderIndex: 2 },
      // Hidden
      { input: { s: "([)]" }, expectedOutput: false, isVisible: false, orderIndex: 3 },
      { input: { s: "{[]}" }, expectedOutput: true, isVisible: false, orderIndex: 4 },
      { input: { s: "" }, expectedOutput: true, isVisible: false, orderIndex: 5 },
      { input: { s: "(((" }, expectedOutput: false, isVisible: false, orderIndex: 6 },
      { input: { s: "(({[()]}))" }, expectedOutput: true, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
      methodName: "isValid",
      parameterNames: ["s"],
    },
    hints: [
      { hintText: "Use a stack. Push opening brackets and pop when you see a closing bracket. If the popped bracket doesn't match, the string is invalid.", orderIndex: 0 },
    ],
  },
  {
    problem: {
      slug: "3sum",
      title: "3Sum",
      difficulty: "medium",
      category: "Two Pointers",
      description:
        "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
      constraints: [
        "3 <= nums.length <= 3000",
        "-10^5 <= nums[i] <= 10^5",
      ],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/3sum/",
    },
    testCases: [
      // Visible
      { input: { nums: [-1, 0, 1, 2, -1, -4] }, expectedOutput: [[-1, -1, 2], [-1, 0, 1]], isVisible: true, orderIndex: 0 },
      { input: { nums: [0, 1, 1] }, expectedOutput: [], isVisible: true, orderIndex: 1 },
      // Hidden
      { input: { nums: [0, 0, 0] }, expectedOutput: [[0, 0, 0]], isVisible: false, orderIndex: 2 },
      { input: { nums: [-2, 0, 1, 1, 2] }, expectedOutput: [[-2, 0, 2], [-2, 1, 1]], isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 2, -2, -1] }, expectedOutput: [], isVisible: false, orderIndex: 4 },
      { input: { nums: [-1, 0, 1, 0] }, expectedOutput: [[-1, 0, 1]], isVisible: false, orderIndex: 5 },
      { input: { nums: [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6] }, expectedOutput: [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]], isVisible: false, orderIndex: 6 },
      { input: { nums: [3, -2, 1, 0] }, expectedOutput: [], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
      methodName: "threeSum",
      parameterNames: ["nums"],
    },
    hints: [
      { hintText: "Sort the array first. Then for each element, use a two-pointer approach on the remaining elements to find pairs that sum to the negation of the current element.", orderIndex: 0 },
      { hintText: "To avoid duplicates, skip elements that are the same as the previous one during iteration, and do the same for the left and right pointers.", orderIndex: 1 },
    ],
  },
];
