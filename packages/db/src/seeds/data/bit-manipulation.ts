import type { ProblemFixture } from "./types.js";

export const bitManipulationProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "single-number",
      title: "Single Number",
      difficulty: "easy",
      category: "Bit Manipulation",
      description:
        "Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.",
      constraints: [
        "1 <= nums.length <= 3 * 10^4",
        "-3 * 10^4 <= nums[i] <= 3 * 10^4",
        "Each element in the array appears twice except for one element which appears only once.",
      ],
      solution:
        "XOR all elements together. Since a XOR a = 0 and a XOR 0 = a, all duplicate pairs cancel out, leaving only the single number.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [2, 2, 1] }, expectedOutput: 1, isVisible: true, orderIndex: 0 },
      { input: { nums: [4, 1, 2, 1, 2] }, expectedOutput: 4, isVisible: true, orderIndex: 1 },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { nums: [-1, -1, 2] }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      { input: { nums: [0, 1, 0] }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { nums: [5, 3, 5] }, expectedOutput: 3, isVisible: false, orderIndex: 5 },
      { input: { nums: [100, 200, 100] }, expectedOutput: 200, isVisible: false, orderIndex: 6 },
      {
        input: { nums: [-30000, 30000, -30000] },
        expectedOutput: 30000,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def singleNumber(self, nums: List[int]) -> int:\n        pass",
      methodName: "singleNumber",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "XOR has the property that a ^ a = 0 and a ^ 0 = a. XOR all the numbers together and the duplicates will cancel out, leaving the single number.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "number-of-1-bits",
      title: "Number of 1 Bits",
      difficulty: "easy",
      category: "Bit Manipulation",
      description:
        "Write a function that takes the binary representation of a positive integer and returns the number of set bits it has (also known as the Hamming weight).",
      constraints: ["1 <= n <= 2^31 - 1"],
      solution:
        "Use the trick n & (n - 1) to clear the lowest set bit. Count how many times you can do this before n becomes 0. Each iteration removes exactly one set bit.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 11 }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { n: 128 }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { n: 2147483645 }, expectedOutput: 30, isVisible: true, orderIndex: 2 },
      { input: { n: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { n: 7 }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { n: 15 }, expectedOutput: 4, isVisible: false, orderIndex: 5 },
      { input: { n: 255 }, expectedOutput: 8, isVisible: false, orderIndex: 6 },
      { input: { n: 1023 }, expectedOutput: 10, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def hammingWeight(self, n: int) -> int:\n        pass",
      methodName: "hammingWeight",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "The operation n & (n - 1) clears the lowest set bit of n. Count how many times you can perform this operation before n becomes 0.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "counting-bits",
      title: "Counting Bits",
      difficulty: "easy",
      category: "Bit Manipulation",
      description:
        "Given an integer `n`, return an array `ans` of length `n + 1` such that for each `i` (`0 <= i <= n`), `ans[i]` is the number of `1`'s in the binary representation of `i`.",
      constraints: ["0 <= n <= 10^5"],
      solution:
        "Use the DP relation: the number of 1 bits in i equals the number of 1 bits in i >> 1 (right shift) plus i & 1 (the last bit). This builds the answer iteratively.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 2 }, expectedOutput: [0, 1, 1], isVisible: true, orderIndex: 0 },
      { input: { n: 5 }, expectedOutput: [0, 1, 1, 2, 1, 2], isVisible: true, orderIndex: 1 },
      { input: { n: 0 }, expectedOutput: [0], isVisible: true, orderIndex: 2 },
      { input: { n: 1 }, expectedOutput: [0, 1], isVisible: false, orderIndex: 3 },
      { input: { n: 3 }, expectedOutput: [0, 1, 1, 2], isVisible: false, orderIndex: 4 },
      {
        input: { n: 7 },
        expectedOutput: [0, 1, 1, 2, 1, 2, 2, 3],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { n: 8 },
        expectedOutput: [0, 1, 1, 2, 1, 2, 2, 3, 1],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { n: 10 },
        expectedOutput: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def countBits(self, n: int) -> List[int]:\n        pass",
      methodName: "countBits",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "Use the relation: countBits(i) = countBits(i >> 1) + (i & 1). The number of set bits in i is the same as i with its last bit removed, plus whether the last bit is set.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "reverse-bits",
      title: "Reverse Bits",
      difficulty: "easy",
      category: "Bit Manipulation",
      description:
        "Reverse bits of a given 32 bits unsigned integer.\n\nNote that in some languages, there is no unsigned integer type. The input will be given as a signed integer, but the output should still represent the unsigned integer's binary reversal.",
      constraints: ["The input must be a binary string of length 32."],
      solution:
        "Iterate through 32 bits. Shift the result left by 1 and add the least significant bit of n. Then right shift n by 1. Repeat 32 times.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 43261596 }, expectedOutput: 964176192, isVisible: true, orderIndex: 0 },
      { input: { n: 4294967293 }, expectedOutput: 3221225471, isVisible: true, orderIndex: 1 },
      { input: { n: 0 }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { n: 1 }, expectedOutput: 2147483648, isVisible: false, orderIndex: 3 },
      { input: { n: 2147483648 }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { n: 4294967295 }, expectedOutput: 4294967295, isVisible: false, orderIndex: 5 },
      { input: { n: 2 }, expectedOutput: 1073741824, isVisible: false, orderIndex: 6 },
      { input: { n: 3 }, expectedOutput: 3221225472, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def reverseBits(self, n: int) -> int:\n        pass",
      methodName: "reverseBits",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "Process one bit at a time. Extract the least significant bit of n, shift your result left to make room, and append the extracted bit. Do this 32 times.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "missing-number",
      title: "Missing Number",
      difficulty: "easy",
      category: "Bit Manipulation",
      description:
        "Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.",
      constraints: [
        "n == nums.length",
        "1 <= n <= 10^4",
        "0 <= nums[i] <= n",
        "All the numbers of nums are unique.",
      ],
      solution:
        "XOR all numbers from 0 to n with all elements in the array. Since XOR cancels out pairs, the remaining value is the missing number. Alternatively, use the sum formula n*(n+1)/2 minus the array sum.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [3, 0, 1] }, expectedOutput: 2, isVisible: true, orderIndex: 0 },
      { input: { nums: [0, 1] }, expectedOutput: 2, isVisible: true, orderIndex: 1 },
      {
        input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1] },
        expectedOutput: 8,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { nums: [0] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { nums: [1] }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      { input: { nums: [1, 2, 3] }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      {
        input: { nums: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        expectedOutput: 9,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [0, 2] }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def missingNumber(self, nums: List[int]) -> int:\n        pass",
      methodName: "missingNumber",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "XOR all indices 0..n with all array elements. Paired values cancel out (a ^ a = 0), leaving only the missing number. Alternatively, compute n*(n+1)/2 - sum(nums).",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "sum-of-two-integers",
      title: "Sum of Two Integers",
      difficulty: "medium",
      category: "Bit Manipulation",
      description:
        "Given two integers `a` and `b`, return the sum of the two integers without using the operators `+` and `-`.",
      constraints: ["-1000 <= a, b <= 1000"],
      solution:
        "Use bitwise operations: XOR gives the sum without carry, AND shifted left gives the carry. Repeat until carry is 0. In Python, use a 32-bit mask to handle negative numbers correctly.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { a: 1, b: 2 }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { a: 2, b: 3 }, expectedOutput: 5, isVisible: true, orderIndex: 1 },
      { input: { a: 0, b: 0 }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { a: -1, b: 1 }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { a: -1, b: -1 }, expectedOutput: -2, isVisible: false, orderIndex: 4 },
      { input: { a: 100, b: 200 }, expectedOutput: 300, isVisible: false, orderIndex: 5 },
      { input: { a: -500, b: 500 }, expectedOutput: 0, isVisible: false, orderIndex: 6 },
      { input: { a: 1000, b: -1000 }, expectedOutput: 0, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def getSum(self, a: int, b: int) -> int:\n        pass",
      methodName: "getSum",
      parameterNames: ["a", "b"],
    },
    hints: [
      {
        hintText:
          "XOR (^) computes the sum without considering carry. AND (&) shifted left by 1 computes the carry. Repeat this process until the carry is 0.",
        orderIndex: 0,
      },
      {
        hintText:
          "In Python, integers have arbitrary precision, so you need a 32-bit mask (0xFFFFFFFF) to simulate 32-bit overflow. After the loop, if the result exceeds 0x7FFFFFFF, convert it back to a negative number.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "reverse-integer",
      title: "Reverse Integer",
      difficulty: "medium",
      category: "Bit Manipulation",
      description:
        "Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-2^31, 2^31 - 1]`, then return `0`.\n\nAssume the environment does not allow you to store 64-bit integers (signed or unsigned).",
      constraints: ["-2^31 <= x <= 2^31 - 1"],
      solution:
        "Extract digits from the end using modulo and division. Build the reversed number digit by digit. Before each multiplication by 10, check for overflow against INT_MAX/10 and INT_MIN/10.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { x: 123 }, expectedOutput: 321, isVisible: true, orderIndex: 0 },
      { input: { x: -123 }, expectedOutput: -321, isVisible: true, orderIndex: 1 },
      { input: { x: 120 }, expectedOutput: 21, isVisible: true, orderIndex: 2 },
      { input: { x: 0 }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { x: 1534236469 }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      { input: { x: -2147483648 }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      { input: { x: 2147483647 }, expectedOutput: 0, isVisible: false, orderIndex: 6 },
      { input: { x: 10 }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def reverse(self, x: int) -> int:\n        pass",
      methodName: "reverse",
      parameterNames: ["x"],
    },
    hints: [
      {
        hintText:
          "Extract digits from the end using x % 10 and x // 10. Build the reversed number by multiplying by 10 and adding each digit.",
        orderIndex: 0,
      },
      {
        hintText:
          "Before appending each digit, check if the result would overflow the 32-bit signed integer range. If result > 2^31 / 10 (or the boundary case with remainder), return 0.",
        orderIndex: 1,
      },
    ],
  },
];
