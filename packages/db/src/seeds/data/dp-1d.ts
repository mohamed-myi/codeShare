import type { ProblemFixture } from "./types.js";

export const dp1dProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "climbing-stairs",
      title: "Climbing Stairs",
      difficulty: "easy",
      category: "1-D Dynamic Programming",
      description:
        "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
      constraints: ["1 <= n <= 45"],
      solution:
        "This is the Fibonacci sequence. dp[i] = dp[i-1] + dp[i-2]. Base cases: dp[1] = 1, dp[2] = 2. Can be optimized to O(1) space with two variables.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 2 }, expectedOutput: 2, isVisible: true, orderIndex: 0 },
      { input: { n: 3 }, expectedOutput: 3, isVisible: true, orderIndex: 1 },
      { input: { n: 1 }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { n: 4 }, expectedOutput: 5, isVisible: false, orderIndex: 3 },
      { input: { n: 5 }, expectedOutput: 8, isVisible: false, orderIndex: 4 },
      { input: { n: 10 }, expectedOutput: 89, isVisible: false, orderIndex: 5 },
      { input: { n: 20 }, expectedOutput: 10946, isVisible: false, orderIndex: 6 },
      { input: { n: 45 }, expectedOutput: 1836311903, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
      methodName: "climbStairs",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "To reach step n, you could have come from step n-1 (1 step) or step n-2 (2 steps). This gives you a recurrence relation similar to Fibonacci.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "min-cost-climbing-stairs",
      title: "Min Cost Climbing Stairs",
      difficulty: "easy",
      category: "1-D Dynamic Programming",
      description:
        "You are given an integer array `cost` where `cost[i]` is the cost of `i`th step on a staircase. Once you pay the cost, you can either climb one or two steps.\n\nYou can either start from the step with index `0`, or the step with index `1`.\n\nReturn the minimum cost to reach the top of the floor.",
      constraints: ["2 <= cost.length <= 1000", "0 <= cost[i] <= 999"],
      solution:
        "dp[i] = cost[i] + min(dp[i-1], dp[i-2]). The answer is min(dp[n-1], dp[n-2]) since you can reach the top from either of the last two steps.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { cost: [10, 15, 20] }, expectedOutput: 15, isVisible: true, orderIndex: 0 },
      {
        input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { cost: [0, 0] }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { cost: [1, 2] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { cost: [5, 5, 5, 5] }, expectedOutput: 10, isVisible: false, orderIndex: 4 },
      { input: { cost: [0, 1, 0, 1] }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      { input: { cost: [999, 999] }, expectedOutput: 999, isVisible: false, orderIndex: 6 },
      { input: { cost: [1, 2, 3] }, expectedOutput: 2, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def minCostClimbingStairs(self, cost: List[int]) -> int:\n        pass",
      methodName: "minCostClimbingStairs",
      parameterNames: ["cost"],
    },
    hints: [
      {
        hintText:
          "The minimum cost to reach step i is cost[i] + min(cost to reach step i-1, cost to reach step i-2). The top is one step past the last element.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "house-robber",
      title: "House Robber",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array `nums` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.",
      constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
      solution:
        "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). At each house, decide whether to rob it (skip previous) or skip it (keep previous best). Optimize to O(1) space with two variables.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [1, 2, 3, 1] }, expectedOutput: 4, isVisible: true, orderIndex: 0 },
      { input: { nums: [2, 7, 9, 3, 1] }, expectedOutput: 12, isVisible: true, orderIndex: 1 },
      { input: { nums: [2, 1, 1, 2] }, expectedOutput: 4, isVisible: true, orderIndex: 2 },
      { input: { nums: [0] }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { nums: [100] }, expectedOutput: 100, isVisible: false, orderIndex: 4 },
      { input: { nums: [1, 2] }, expectedOutput: 2, isVisible: false, orderIndex: 5 },
      { input: { nums: [1, 3, 1, 3, 100] }, expectedOutput: 103, isVisible: false, orderIndex: 6 },
      {
        input: { nums: [400, 1, 400, 1, 400] },
        expectedOutput: 1200,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      methodName: "rob",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "At each house, you have two choices: rob it or skip it. If you rob house i, you can't rob house i-1.",
        orderIndex: 0,
      },
      {
        hintText:
          "Define dp[i] as the max money you can rob from houses 0..i. The recurrence is dp[i] = max(dp[i-1], dp[i-2] + nums[i]).",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "house-robber-ii",
      title: "House Robber II",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array `nums` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.",
      constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 1000"],
      solution:
        "Since house 0 and house n-1 are adjacent in a circle, you can't rob both. Run House Robber on nums[0..n-2] and nums[1..n-1] separately, then return the maximum of the two results.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [2, 3, 2] }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { nums: [1, 2, 3, 1] }, expectedOutput: 4, isVisible: true, orderIndex: 1 },
      { input: { nums: [1, 2, 3] }, expectedOutput: 3, isVisible: true, orderIndex: 2 },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { nums: [0, 0] }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      {
        input: { nums: [200, 3, 140, 20, 10] },
        expectedOutput: 340,
        isVisible: false,
        orderIndex: 5,
      },
      { input: { nums: [1, 3, 1, 3, 100] }, expectedOutput: 103, isVisible: false, orderIndex: 6 },
      { input: { nums: [1, 1, 1, 1, 1] }, expectedOutput: 2, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      methodName: "rob",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "The houses form a circle, so you cannot rob both the first and last house. How can you reduce this to the non-circular House Robber problem?",
        orderIndex: 0,
      },
      {
        hintText:
          "Run the linear House Robber algorithm twice: once on houses[0..n-2] (excluding last) and once on houses[1..n-1] (excluding first). Return the maximum of both results.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "longest-palindromic-substring",
      title: "Longest Palindromic Substring",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description: "Given a string `s`, return the longest palindromic substring in `s`.",
      constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters."],
      solution:
        "Expand around each center. For each index (and each pair of adjacent indices for even-length palindromes), expand outward while characters match. Track the longest palindrome found.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "babad" }, expectedOutput: "bab", isVisible: true, orderIndex: 0 },
      { input: { s: "cbbd" }, expectedOutput: "bb", isVisible: true, orderIndex: 1 },
      { input: { s: "a" }, expectedOutput: "a", isVisible: true, orderIndex: 2 },
      { input: { s: "ac" }, expectedOutput: "a", isVisible: false, orderIndex: 3 },
      { input: { s: "racecar" }, expectedOutput: "racecar", isVisible: false, orderIndex: 4 },
      { input: { s: "aacabdkacaa" }, expectedOutput: "aca", isVisible: false, orderIndex: 5 },
      { input: { s: "aaaa" }, expectedOutput: "aaaa", isVisible: false, orderIndex: 6 },
      { input: { s: "abcde" }, expectedOutput: "a", isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass",
      methodName: "longestPalindrome",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "A palindrome mirrors around its center. There are 2n-1 possible centers (each character + each gap between characters).",
        orderIndex: 0,
      },
      {
        hintText:
          "For each center, expand outward while the characters on both sides match. Track the start and length of the longest palindrome found. Handle both odd-length and even-length palindromes.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "palindromic-substrings",
      title: "Palindromic Substrings",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "Given a string `s`, return the number of palindromic substrings in it.\n\nA string is a palindrome when it reads the same backward as forward.\n\nA substring is a contiguous sequence of characters within the string.",
      constraints: ["1 <= s.length <= 1000", "s consists of lowercase English letters."],
      solution:
        "Expand around each center (2n-1 centers for both odd and even length palindromes). For each center, count how many palindromes can be formed by expanding outward while characters match.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "abc" }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { s: "aaa" }, expectedOutput: 6, isVisible: true, orderIndex: 1 },
      { input: { s: "a" }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { s: "ab" }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      { input: { s: "aa" }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { s: "aba" }, expectedOutput: 4, isVisible: false, orderIndex: 5 },
      { input: { s: "abba" }, expectedOutput: 6, isVisible: false, orderIndex: 6 },
      { input: { s: "racecar" }, expectedOutput: 10, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def countSubstrings(self, s: str) -> int:\n        pass",
      methodName: "countSubstrings",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "Every single character is a palindrome. Now think about how to find longer palindromic substrings.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use the expand-around-center technique. For each possible center (both single characters and pairs), expand outward and count each expansion that forms a palindrome.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "decode-ways",
      title: "Decode Ways",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        'A message containing letters from `A-Z` can be encoded into numbers using the following mapping:\n\n- \'A\' -> "1"\n- \'B\' -> "2"\n- ...\n- \'Z\' -> "26"\n\nTo decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways). For example, `"11106"` can be mapped into: `"AAJF"` with the grouping `(1 1 10 6)` or `"KJF"` with the grouping `(11 10 6)`.\n\nNote that the grouping `(1 11 06)` is invalid because `"06"` cannot be mapped into `\'F\'` since `"6"` is different from `"06"`.\n\nGiven a string `s` containing only digits, return the number of ways to decode it.',
      constraints: [
        "1 <= s.length <= 100",
        "s contains only digits and may contain leading zeros.",
      ],
      solution:
        "dp[i] = number of ways to decode s[0..i-1]. If s[i-1] != '0', dp[i] += dp[i-1] (single digit). If s[i-2..i-1] forms a valid number 10-26, dp[i] += dp[i-2] (two digits).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "12" }, expectedOutput: 2, isVisible: true, orderIndex: 0 },
      { input: { s: "226" }, expectedOutput: 3, isVisible: true, orderIndex: 1 },
      { input: { s: "06" }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { s: "1" }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { s: "10" }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { s: "27" }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      { input: { s: "11106" }, expectedOutput: 2, isVisible: false, orderIndex: 6 },
      { input: { s: "111" }, expectedOutput: 3, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def numDecodings(self, s: str) -> int:\n        pass",
      methodName: "numDecodings",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "At each position, you can decode one digit or two digits. But '0' cannot be decoded alone, and two-digit numbers must be between 10 and 26.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use DP where dp[i] is the number of ways to decode the first i characters. If the current digit is non-zero, add dp[i-1]. If the last two digits form a valid number (10-26), add dp[i-2].",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "coin-change",
      title: "Coin Change",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
      constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
      solution:
        "Use bottom-up DP. dp[i] = minimum coins needed for amount i. For each amount from 1 to target, try each coin: dp[i] = min(dp[i], dp[i - coin] + 1) if i >= coin. Initialize dp[0] = 0 and all others to infinity.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { coins: [1, 5, 10], amount: 12 },
        expectedOutput: 3,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { coins: [2], amount: 3 }, expectedOutput: -1, isVisible: true, orderIndex: 1 },
      { input: { coins: [1], amount: 0 }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { coins: [1], amount: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { coins: [1], amount: 2 }, expectedOutput: 2, isVisible: false, orderIndex: 4 },
      {
        input: { coins: [1, 3, 4], amount: 6 },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { coins: [2, 5, 10, 1], amount: 27 },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { coins: [186, 419, 83, 408], amount: 6249 },
        expectedOutput: 20,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass",
      methodName: "coinChange",
      parameterNames: ["coins", "amount"],
    },
    hints: [
      {
        hintText:
          "Think about the subproblem: what is the minimum number of coins needed for each amount from 0 up to the target?",
        orderIndex: 0,
      },
      {
        hintText:
          "Build a DP array where dp[i] is the minimum coins for amount i. For each amount, try subtracting each coin denomination and take the minimum. If dp[amount] is still infinity, return -1.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "maximum-product-subarray",
      title: "Maximum Product Subarray",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "Given an integer array `nums`, find a subarray that has the largest product, and return the product.\n\nThe test cases are generated so that the answer will fit in a 32-bit integer.",
      constraints: [
        "1 <= nums.length <= 2 * 10^4",
        "-10 <= nums[i] <= 10",
        "The product of any subarray of nums is guaranteed to fit in a 32-bit integer.",
      ],
      solution:
        "Track both the current maximum and current minimum product at each position (since a negative times a negative can become the new maximum). At each element, update max and min considering the element itself, max*element, and min*element.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [2, 3, -2, 4] }, expectedOutput: 6, isVisible: true, orderIndex: 0 },
      { input: { nums: [-2, 0, -1] }, expectedOutput: 0, isVisible: true, orderIndex: 1 },
      { input: { nums: [-2, 3, -4] }, expectedOutput: 24, isVisible: true, orderIndex: 2 },
      { input: { nums: [0] }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { nums: [-2] }, expectedOutput: -2, isVisible: false, orderIndex: 4 },
      { input: { nums: [2, -5, -2, -4, 3] }, expectedOutput: 24, isVisible: false, orderIndex: 5 },
      { input: { nums: [-1, -2, -3, 0] }, expectedOutput: 6, isVisible: false, orderIndex: 6 },
      { input: { nums: [1, 2, 3, 4] }, expectedOutput: 24, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def maxProduct(self, nums: List[int]) -> int:\n        pass",
      methodName: "maxProduct",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Unlike maximum subarray sum, a negative number can flip the sign. A very negative product times a negative number becomes very positive.",
        orderIndex: 0,
      },
      {
        hintText:
          "Track both the current maximum product and current minimum product ending at each position. At each step, the new max is max(num, curMax*num, curMin*num) and similarly for min.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "word-break",
      title: "Word Break",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.",
      constraints: [
        "1 <= s.length <= 300",
        "1 <= wordDict.length <= 1000",
        "1 <= wordDict[i].length <= 20",
        "s and wordDict[i] consist of only lowercase English letters.",
        "All the strings of wordDict are unique.",
      ],
      solution:
        "Use DP where dp[i] indicates whether s[0..i-1] can be segmented. For each position i, check all positions j < i: if dp[j] is true and s[j..i] is in the dictionary, set dp[i] = true.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { s: "leetcode", wordDict: ["leet", "code"] },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { s: "applepenapple", wordDict: ["apple", "pen"] },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { s: "a", wordDict: ["a"] }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      {
        input: { s: "ab", wordDict: ["a"] },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { s: "cars", wordDict: ["car", "ca", "rs"] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { s: "aaaaaaa", wordDict: ["aaa", "aaaa"] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { s: "goalspecial", wordDict: ["go", "goal", "goals", "special"] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n        pass",
      methodName: "wordBreak",
      parameterNames: ["s", "wordDict"],
    },
    hints: [
      {
        hintText:
          "Think about the problem in terms of prefixes. If you know that s[0..j] can be segmented, then you just need to check if s[j..i] is a dictionary word.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a boolean DP array where dp[i] means s[0..i-1] can be segmented. For each i, check all j < i: if dp[j] is true and s[j:i] is in the word set, set dp[i] = true.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "longest-increasing-subsequence",
      title: "Longest Increasing Subsequence",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
      constraints: ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
      solution:
        "Use DP where dp[i] is the length of the longest increasing subsequence ending at index i. For each i, check all j < i: if nums[j] < nums[i], dp[i] = max(dp[i], dp[j] + 1). For O(n log n), use patience sorting with binary search.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [0, 1, 0, 3, 2, 3] }, expectedOutput: 4, isVisible: true, orderIndex: 1 },
      { input: { nums: [7, 7, 7, 7, 7, 7, 7] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 2, 3, 4, 5] }, expectedOutput: 5, isVisible: false, orderIndex: 4 },
      { input: { nums: [5, 4, 3, 2, 1] }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      {
        input: { nums: [3, 1, 4, 1, 5, 9, 2, 6] },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [-1, 0, 1, -1, 2] }, expectedOutput: 4, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def lengthOfLIS(self, nums: List[int]) -> int:\n        pass",
      methodName: "lengthOfLIS",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "For each element, consider all previous elements. If a previous element is smaller, the current element can extend that subsequence.",
        orderIndex: 0,
      },
      {
        hintText:
          "dp[i] = length of LIS ending at index i. For each i, dp[i] = max(dp[j] + 1) for all j < i where nums[j] < nums[i]. The answer is max(dp).",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "partition-equal-subset-sum",
      title: "Partition Equal Subset Sum",
      difficulty: "medium",
      category: "1-D Dynamic Programming",
      description:
        "Given an integer array `nums`, return `true` if you can partition the array into two subsets such that the sum of the elements in both subsets is equal or `false` otherwise.",
      constraints: ["1 <= nums.length <= 200", "1 <= nums[i] <= 100"],
      solution:
        "If the total sum is odd, return false. Otherwise, find if a subset sums to total/2. Use a boolean DP set: for each number, update which sums are reachable. This reduces to the 0/1 knapsack problem.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [1, 5, 11, 5] }, expectedOutput: true, isVisible: true, orderIndex: 0 },
      { input: { nums: [1, 2, 3, 5] }, expectedOutput: false, isVisible: true, orderIndex: 1 },
      { input: { nums: [1, 1] }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { nums: [1] }, expectedOutput: false, isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 2, 3] }, expectedOutput: true, isVisible: false, orderIndex: 4 },
      { input: { nums: [2, 2, 2, 2, 2] }, expectedOutput: false, isVisible: false, orderIndex: 5 },
      {
        input: { nums: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { nums: [100, 100, 100, 100, 100, 100, 100, 100] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def canPartition(self, nums: List[int]) -> bool:\n        pass",
      methodName: "canPartition",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "If the total sum is odd, it's impossible to split into two equal halves. If even, you need to find a subset that sums to total/2.",
        orderIndex: 0,
      },
      {
        hintText:
          "This is the subset sum problem, a variant of 0/1 knapsack. Use a DP set that tracks all achievable sums. For each number, update the set by adding the number to each existing sum (iterate in reverse to avoid reuse).",
        orderIndex: 1,
      },
    ],
  },
];
