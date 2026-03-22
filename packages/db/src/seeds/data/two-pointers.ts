import type { ProblemFixture } from "./types.js";

export const twoPointersProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "valid-palindrome",
      title: "Valid Palindrome",
      difficulty: "easy",
      category: "Two Pointers",
      description:
        "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
      constraints: ["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters."],
      solution:
        "Use two pointers starting from both ends. Skip non-alphanumeric characters. Compare characters (case-insensitive) moving inward. If all comparisons match, it's a palindrome.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/valid-palindrome/",
    },
    testCases: [
      {
        input: { s: "A man, a plan, a canal: Panama" },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { s: "race a car" }, expectedOutput: false, isVisible: true, orderIndex: 1 },
      { input: { s: " " }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { s: "a" }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      { input: { s: "ab" }, expectedOutput: false, isVisible: false, orderIndex: 4 },
      { input: { s: "0P" }, expectedOutput: false, isVisible: false, orderIndex: 5 },
      { input: { s: ".,!" }, expectedOutput: true, isVisible: false, orderIndex: 6 },
      { input: { s: "abcba" }, expectedOutput: true, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        pass",
      methodName: "isPalindrome",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "Use two pointers, one at the start and one at the end. Skip non-alphanumeric characters and compare in a case-insensitive manner.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "two-sum-ii-input-array-is-sorted",
      title: "Two Sum II - Input Array Is Sorted",
      difficulty: "medium",
      category: "Two Pointers",
      description:
        "Given a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number.\n\nReturn the indices of the two numbers, `index1` and `index2`, added by one as an integer array `[index1, index2]` of length 2.\n\nYou may not use the same element twice. Your solution must use only constant extra space.",
      constraints: [
        "2 <= numbers.length <= 3 * 10^4",
        "-1000 <= numbers[i] <= 1000",
        "numbers is sorted in non-decreasing order.",
        "-1000 <= target <= 1000",
        "The tests are generated such that there is exactly one solution.",
      ],
      solution:
        "Use two pointers at the start and end. If the sum is too large, move the right pointer left. If too small, move the left pointer right. Return when the sum matches the target.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
    },
    testCases: [
      {
        input: { numbers: [2, 7, 11, 15], target: 9 },
        expectedOutput: [1, 2],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { numbers: [2, 3, 4], target: 6 },
        expectedOutput: [1, 3],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { numbers: [-1, 0], target: -1 },
        expectedOutput: [1, 2],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { numbers: [1, 2, 3, 4, 5], target: 9 },
        expectedOutput: [4, 5],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { numbers: [1, 3, 5, 7, 9], target: 10 },
        expectedOutput: [1, 5],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { numbers: [-5, -3, 0, 2, 8], target: -3 },
        expectedOutput: [1, 4],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { numbers: [1, 1], target: 2 },
        expectedOutput: [1, 2],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { numbers: [5, 25, 75], target: 100 },
        expectedOutput: [2, 3],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def twoSum(self, numbers: List[int], target: int) -> List[int]:\n        pass",
      methodName: "twoSum",
      parameterNames: ["numbers", "target"],
    },
    hints: [
      {
        hintText:
          "Since the array is sorted, you can use two pointers. Start one at the beginning and one at the end.",
        orderIndex: 0,
      },
      {
        hintText:
          "If the sum of the two pointed-to values is less than the target, move the left pointer right. If greater, move the right pointer left.",
        orderIndex: 1,
      },
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
      constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
      solution:
        "Sort the array. For each element, use two pointers on the remaining array to find pairs that sum to the negation of the current element. Skip duplicates at each level to avoid duplicate triplets.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/3sum/",
    },
    testCases: [
      {
        input: { nums: [-1, 0, 1, 2, -1, -4] },
        expectedOutput: [
          [-1, -1, 2],
          [-1, 0, 1],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [0, 1, 1] }, expectedOutput: [], isVisible: true, orderIndex: 1 },
      { input: { nums: [0, 0, 0] }, expectedOutput: [[0, 0, 0]], isVisible: true, orderIndex: 2 },
      {
        input: { nums: [-2, 0, 1, 1, 2] },
        expectedOutput: [
          [-2, 0, 2],
          [-2, 1, 1],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      { input: { nums: [1, 2, -2, -1] }, expectedOutput: [], isVisible: false, orderIndex: 4 },
      {
        input: { nums: [-1, 0, 1, 0] },
        expectedOutput: [[-1, 0, 1]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { nums: [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6] },
        expectedOutput: [
          [-4, -2, 6],
          [-4, 0, 4],
          [-4, 1, 3],
          [-4, 2, 2],
          [-2, -2, 4],
          [-2, 0, 2],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [3, -2, 1, 0] }, expectedOutput: [], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
      methodName: "threeSum",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Sort the array first. Then for each element, use a two-pointer approach on the remaining elements to find pairs that sum to the negation of the current element.",
        orderIndex: 0,
      },
      {
        hintText:
          "To avoid duplicates, skip elements that are the same as the previous one during iteration, and do the same for the left and right pointers.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "container-with-most-water",
      title: "Container With Most Water",
      difficulty: "medium",
      category: "Two Pointers",
      description:
        "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `ith` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.\n\nNotice that you may not slant the container.",
      constraints: ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
      solution:
        "Use two pointers at both ends. Calculate the area as min(height[left], height[right]) * (right - left). Move the pointer with the smaller height inward, since moving the taller one can only decrease or maintain the area.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/container-with-most-water/",
    },
    testCases: [
      {
        input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
        expectedOutput: 49,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { height: [1, 1] }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { height: [4, 3, 2, 1, 4] }, expectedOutput: 16, isVisible: true, orderIndex: 2 },
      { input: { height: [1, 2, 1] }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      {
        input: { height: [2, 3, 4, 5, 18, 17, 6] },
        expectedOutput: 17,
        isVisible: false,
        orderIndex: 4,
      },
      { input: { height: [1, 2, 3, 4, 5] }, expectedOutput: 6, isVisible: false, orderIndex: 5 },
      { input: { height: [5, 4, 3, 2, 1] }, expectedOutput: 6, isVisible: false, orderIndex: 6 },
      { input: { height: [10000, 10000] }, expectedOutput: 10000, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        pass",
      methodName: "maxArea",
      parameterNames: ["height"],
    },
    hints: [
      {
        hintText:
          "Start with two pointers at both ends of the array. The area is limited by the shorter line.",
        orderIndex: 0,
      },
      {
        hintText:
          "Always move the pointer pointing to the shorter line inward. Moving the taller line's pointer can never increase the area since the width decreases and the height is capped by the shorter line.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "trapping-rain-water",
      title: "Trapping Rain Water",
      difficulty: "hard",
      category: "Two Pointers",
      description:
        "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
      constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
      solution:
        "Use two pointers from both ends with leftMax and rightMax trackers. At each step, process the side with the smaller max. Water at each position equals max - height[i]. This works because the water level at any position is determined by the minimum of the maximum heights on both sides.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/trapping-rain-water/",
    },
    testCases: [
      {
        input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { height: [4, 2, 0, 3, 2, 5] }, expectedOutput: 9, isVisible: true, orderIndex: 1 },
      { input: { height: [1, 0, 1] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      {
        input: { height: [3, 0, 0, 2, 0, 4] },
        expectedOutput: 10,
        isVisible: false,
        orderIndex: 3,
      },
      { input: { height: [0] }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      { input: { height: [1, 2, 3, 4, 5] }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      { input: { height: [5, 4, 3, 2, 1] }, expectedOutput: 0, isVisible: false, orderIndex: 6 },
      {
        input: { height: [5, 2, 1, 2, 1, 5] },
        expectedOutput: 14,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass",
      methodName: "trap",
      parameterNames: ["height"],
    },
    hints: [
      {
        hintText:
          "The water trapped at each index depends on the minimum of the maximum heights to its left and right.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use two pointers from both ends. Track the maximum height seen from each side. Process the side with the smaller maximum.",
        orderIndex: 1,
      },
      {
        hintText:
          "At each position, the water trapped is max_height_from_that_side - height[i]. Always advance the pointer on the side with the smaller max, since that side determines the water level.",
        orderIndex: 2,
      },
    ],
  },
];
