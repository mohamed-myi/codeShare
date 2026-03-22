import type { ProblemFixture } from "./types.js";

export const dp2dProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "unique-paths",
      title: "Unique Paths",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        "There is a robot on an `m x n` grid. The robot is initially located at the top-left corner (i.e., `grid[0][0]`). The robot tries to move to the bottom-right corner (i.e., `grid[m - 1][n - 1]`). The robot can only move either down or right at any point in time.\n\nGiven the two integers `m` and `n`, return the number of possible unique paths that the robot can take to reach the bottom-right corner.",
      constraints: ["1 <= m, n <= 100"],
      solution:
        "Use a 2D DP table where dp[i][j] represents the number of ways to reach cell (i, j). Each cell is the sum of the cell above and to the left. The first row and first column are all 1s since there is only one way to reach them.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { m: 3, n: 7 }, expectedOutput: 28, isVisible: true, orderIndex: 0 },
      { input: { m: 3, n: 2 }, expectedOutput: 3, isVisible: true, orderIndex: 1 },
      { input: { m: 3, n: 3 }, expectedOutput: 6, isVisible: true, orderIndex: 2 },
      { input: { m: 1, n: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { m: 1, n: 5 }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { m: 5, n: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      { input: { m: 7, n: 3 }, expectedOutput: 28, isVisible: false, orderIndex: 6 },
      { input: { m: 10, n: 10 }, expectedOutput: 48620, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        pass",
      methodName: "uniquePaths",
      parameterNames: ["m", "n"],
    },
    hints: [
      {
        hintText:
          "Think about how many ways you can arrive at any given cell. You can only come from directly above or directly to the left.",
        orderIndex: 0,
      },
      {
        hintText:
          "Build a 2D DP table where dp[i][j] = dp[i-1][j] + dp[i][j-1]. Initialize the first row and first column to 1.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "longest-common-subsequence",
      title: "Longest Common Subsequence",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        'Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return `0`.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.\n\nFor example, `"ace"` is a subsequence of `"abcde"`.\n\nA common subsequence of two strings is a subsequence that is common to both strings.',
      constraints: [
        "1 <= text1.length, text2.length <= 1000",
        "text1 and text2 consist of only lowercase English characters.",
      ],
      solution:
        "Use a 2D DP table where dp[i][j] is the LCS length of text1[0..i-1] and text2[0..j-1]. If characters match, dp[i][j] = dp[i-1][j-1] + 1. Otherwise, dp[i][j] = max(dp[i-1][j], dp[i][j-1]).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { text1: "abcde", text2: "ace" },
        expectedOutput: 3,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { text1: "abc", text2: "abc" }, expectedOutput: 3, isVisible: true, orderIndex: 1 },
      { input: { text1: "abc", text2: "def" }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { text1: "a", text2: "a" }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { text1: "a", text2: "b" }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      {
        input: { text1: "oxcpqrsvwf", text2: "shmtulqrypy" },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { text1: "bsbininm", text2: "jmjkbkjkv" },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { text1: "abcba", text2: "abcbcba" },
        expectedOutput: 5,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n        pass",
      methodName: "longestCommonSubsequence",
      parameterNames: ["text1", "text2"],
    },
    hints: [
      {
        hintText:
          "Consider building the solution character by character. If the current characters of both strings match, what does that tell you about the LCS?",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a 2D DP table. When text1[i] == text2[j], dp[i][j] = dp[i-1][j-1] + 1. Otherwise take the max of dp[i-1][j] and dp[i][j-1].",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "best-time-to-buy-and-sell-stock-with-cooldown",
      title: "Best Time to Buy and Sell Stock with Cooldown",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nFind the maximum profit you can achieve. You may complete as many transactions as you like (i.e., buy one and sell one share of the stock multiple times) with the following restrictions:\n\nAfter you sell your stock, you cannot buy stock on the next day (i.e., cooldown one day).\n\nNote: You may not engage in multiple transactions simultaneously (i.e., you must sell the stock before you buy again).",
      constraints: ["1 <= prices.length <= 5000", "0 <= prices[i] <= 1000"],
      solution:
        "Use state machine DP with three states: holding stock, not holding (just sold), and cooldown. Transition between states at each day and track the maximum profit achievable in each state.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { prices: [1, 2, 3, 0, 2] }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { prices: [1] }, expectedOutput: 0, isVisible: true, orderIndex: 1 },
      { input: { prices: [1, 2, 4] }, expectedOutput: 3, isVisible: true, orderIndex: 2 },
      { input: { prices: [2, 1] }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { prices: [1, 2] }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { prices: [6, 1, 3, 2, 4, 7] }, expectedOutput: 6, isVisible: false, orderIndex: 5 },
      { input: { prices: [1, 4, 2] }, expectedOutput: 3, isVisible: false, orderIndex: 6 },
      { input: { prices: [1, 2, 3, 4, 5] }, expectedOutput: 4, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass",
      methodName: "maxProfit",
      parameterNames: ["prices"],
    },
    hints: [
      {
        hintText:
          "Think about the different states you can be in on each day: holding a stock, not holding (free to buy), or in a cooldown period after selling.",
        orderIndex: 0,
      },
      {
        hintText:
          "Model this as a state machine with transitions. At each day, update: hold = max(hold, cooldown - price), sold = hold + price, cooldown = max(cooldown, sold).",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "coin-change-ii",
      title: "Coin Change II",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the number of combinations that make up that amount. If that amount of money cannot be made up by any combination of the coins, return `0`.\n\nYou may assume that you have an infinite number of each kind of coin.\n\nThe answer is guaranteed to fit into a signed 32-bit integer.",
      constraints: [
        "1 <= coins.length <= 300",
        "1 <= coins[i] <= 5000",
        "All the values of coins are unique.",
        "0 <= amount <= 5000",
      ],
      solution:
        "Use DP where dp[j] represents the number of combinations to make amount j. For each coin, iterate through amounts and add dp[j - coin] to dp[j]. Processing coins in the outer loop avoids counting permutations as separate combinations.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { amount: 5, coins: [1, 2, 5] }, expectedOutput: 4, isVisible: true, orderIndex: 0 },
      { input: { amount: 3, coins: [2] }, expectedOutput: 0, isVisible: true, orderIndex: 1 },
      { input: { amount: 10, coins: [10] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      {
        input: { amount: 0, coins: [1, 2, 5] },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 3,
      },
      { input: { amount: 1, coins: [1] }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { amount: 5, coins: [1] }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      { input: { amount: 5, coins: [1, 2] }, expectedOutput: 3, isVisible: false, orderIndex: 6 },
      {
        input: { amount: 100, coins: [1, 5, 10, 25] },
        expectedOutput: 242,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def change(self, amount: int, coins: List[int]) -> int:\n        pass",
      methodName: "change",
      parameterNames: ["amount", "coins"],
    },
    hints: [
      {
        hintText:
          "This is similar to the unbounded knapsack problem. Think about building up the amount using one coin type at a time.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a 1D DP array where dp[j] = number of ways to make amount j. For each coin, update dp[j] += dp[j - coin] for j from coin to amount.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "target-sum",
      title: "Target Sum",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        "You are given an integer array `nums` and an integer `target`.\n\nYou want to build an expression out of nums by adding one of the symbols `'+'` and `'-'` before each integer in nums and then concatenate all the integers.\n\nFor example, if `nums = [2, 1]`, you can add a `'+'` before `2` and a `'-'` before `1` and concatenate them to build the expression `\"+2-1\"`.\n\nReturn the number of different expressions that you can build, which evaluates to `target`.",
      constraints: [
        "1 <= nums.length <= 20",
        "0 <= nums[i] <= 1000",
        "0 <= sum(nums[i]) <= 1000",
        "-1000 <= target <= 1000",
      ],
      solution:
        "Convert to a subset sum problem: find subsets P and N where P - N = target and P + N = totalSum. So P = (target + totalSum) / 2. Use DP to count subsets that sum to P.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [1, 1, 1, 1, 1], target: 3 },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [1], target: 1 }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { nums: [1, 0], target: 1 }, expectedOutput: 2, isVisible: true, orderIndex: 2 },
      { input: { nums: [1, 2, 1], target: 0 }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      {
        input: { nums: [0, 0, 0, 0, 0], target: 0 },
        expectedOutput: 32,
        isVisible: false,
        orderIndex: 4,
      },
      { input: { nums: [1, 1, 1], target: 1 }, expectedOutput: 3, isVisible: false, orderIndex: 5 },
      { input: { nums: [2, 3, 5], target: 0 }, expectedOutput: 0, isVisible: false, orderIndex: 6 },
      { input: { nums: [1, 2, 3], target: 6 }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def findTargetSumWays(self, nums: List[int], target: int) -> int:\n        pass",
      methodName: "findTargetSumWays",
      parameterNames: ["nums", "target"],
    },
    hints: [
      {
        hintText:
          "Think about splitting the numbers into two groups: those with '+' and those with '-'. Can you reformulate this as a subset sum problem?",
        orderIndex: 0,
      },
      {
        hintText:
          "If P is the sum of positive-signed numbers and N is the sum of negative-signed numbers, then P - N = target and P + N = totalSum. So P = (target + totalSum) / 2. Count subsets summing to P using DP.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "interleaving-string",
      title: "Interleaving String",
      difficulty: "medium",
      category: "2-D Dynamic Programming",
      description:
        "Given strings `s1`, `s2`, and `s3`, find whether `s3` is formed by an interleaving of `s1` and `s2`.\n\nAn interleaving of two strings `s` and `t` is a configuration where `s` and `t` are divided into `n` and `m` substrings respectively, such that:\n\n- `s = s1 + s2 + ... + sn`\n- `t = t1 + t2 + ... + tm`\n- `|n - m| <= 1`\n- The interleaving is `s1 + t1 + s2 + t2 + s3 + t3 + ...` or `t1 + s1 + t2 + s2 + t3 + s3 + ...`\n\nNote: `a + b` is the concatenation of strings `a` and `b`.",
      constraints: [
        "0 <= s1.length, s2.length <= 100",
        "0 <= s3.length <= 200",
        "s1, s2, and s3 consist of lowercase English letters.",
      ],
      solution:
        "Use 2D DP where dp[i][j] indicates whether s3[0..i+j-1] can be formed by interleaving s1[0..i-1] and s2[0..j-1]. Check if the current character of s3 matches s1[i-1] or s2[j-1] and the previous state was valid.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { s1: "aabcc", s2: "dbbca", s3: "aadbbcbcac" },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { s1: "aabcc", s2: "dbbca", s3: "aadbbbaccc" },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { s1: "", s2: "", s3: "" }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      {
        input: { s1: "a", s2: "", s3: "a" },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { s1: "", s2: "b", s3: "b" },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { s1: "a", s2: "b", s3: "ab" },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { s1: "a", s2: "b", s3: "c" },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { s1: "ab", s2: "bc", s3: "abbc" },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:\n        pass",
      methodName: "isInterleave",
      parameterNames: ["s1", "s2", "s3"],
    },
    hints: [
      {
        hintText:
          "First check if the lengths add up: len(s1) + len(s2) must equal len(s3). If not, it is impossible.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a 2D DP table where dp[i][j] = true means s3[0..i+j-1] is a valid interleaving of s1[0..i-1] and s2[0..j-1]. Transition by matching the next character of s3 with either s1[i] or s2[j].",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "longest-increasing-path-in-a-matrix",
      title: "Longest Increasing Path in a Matrix",
      difficulty: "hard",
      category: "2-D Dynamic Programming",
      description:
        "Given an `m x n` integers `matrix`, return the length of the longest increasing path in `matrix`.\n\nFrom each cell, you can either move in four directions: left, right, up, or down. You may not move diagonally or move outside of the boundary (i.e., wrap-around is not allowed).",
      constraints: [
        "m == matrix.length",
        "n == matrix[i].length",
        "1 <= m, n <= 200",
        "0 <= matrix[i][j] <= 2^31 - 1",
      ],
      solution:
        "Use DFS with memoization. For each cell, recursively explore all four neighbors that have a strictly larger value. Cache results in a memo table to avoid recomputation. The answer is the maximum value in the memo table.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          matrix: [
            [9, 9, 4],
            [6, 6, 8],
            [2, 1, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          matrix: [
            [3, 4, 5],
            [3, 2, 6],
            [2, 2, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { matrix: [[1]] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { matrix: [[1, 2]] }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      { input: { matrix: [[1], [2]] }, expectedOutput: 2, isVisible: false, orderIndex: 4 },
      {
        input: {
          matrix: [
            [7, 8, 9],
            [9, 7, 6],
            [7, 2, 3],
          ],
        },
        expectedOutput: 6,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          matrix: [
            [1, 2, 3],
            [6, 5, 4],
            [7, 8, 9],
          ],
        },
        expectedOutput: 9,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          matrix: [
            [5, 5, 5],
            [5, 5, 5],
            [5, 5, 5],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:\n        pass",
      methodName: "longestIncreasingPath",
      parameterNames: ["matrix"],
    },
    hints: [
      {
        hintText:
          "Consider starting a DFS from every cell. The longest increasing path from a cell only depends on its neighbors with strictly larger values.",
        orderIndex: 0,
      },
      {
        hintText:
          "Since the path is strictly increasing, there are no cycles. This means memoization will work -- cache the result for each cell.",
        orderIndex: 1,
      },
      {
        hintText:
          "Use a memo table the same size as the matrix. For each cell, recursively compute the longest path by checking all four directions. The answer is the maximum value across all cells in the memo table.",
        orderIndex: 2,
      },
    ],
  },
  {
    problem: {
      slug: "distinct-subsequences",
      title: "Distinct Subsequences",
      difficulty: "hard",
      category: "2-D Dynamic Programming",
      description:
        "Given two strings `s` and `t`, return the number of distinct subsequences of `s` which equals `t`.\n\nThe test cases are generated so that the answer fits on a 32-bit signed integer.",
      constraints: ["1 <= s.length, t.length <= 1000", "s and t consist of English letters."],
      solution:
        "Use 2D DP where dp[i][j] is the number of ways to form t[0..j-1] from s[0..i-1]. If s[i-1] == t[j-1], dp[i][j] = dp[i-1][j-1] + dp[i-1][j] (use or skip s[i-1]). Otherwise dp[i][j] = dp[i-1][j] (skip s[i-1]).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "rabbbit", t: "rabbit" }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      { input: { s: "babgbag", t: "bag" }, expectedOutput: 5, isVisible: true, orderIndex: 1 },
      { input: { s: "a", t: "a" }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { s: "a", t: "b" }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { s: "aaa", t: "a" }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { s: "aaa", t: "aa" }, expectedOutput: 3, isVisible: false, orderIndex: 5 },
      { input: { s: "abc", t: "abc" }, expectedOutput: 1, isVisible: false, orderIndex: 6 },
      { input: { s: "aabb", t: "ab" }, expectedOutput: 4, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def numDistinct(self, s: str, t: str) -> int:\n        pass",
      methodName: "numDistinct",
      parameterNames: ["s", "t"],
    },
    hints: [
      {
        hintText:
          "Think about the decision at each character of s: either include it in the subsequence (if it matches the current character of t) or skip it.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a 2D DP table where dp[i][j] counts the number of ways to form t[0..j-1] using s[0..i-1]. Base case: dp[i][0] = 1 for all i (empty t can always be formed).",
        orderIndex: 1,
      },
      {
        hintText:
          "Transition: if s[i-1] == t[j-1], dp[i][j] = dp[i-1][j-1] + dp[i-1][j]. Otherwise dp[i][j] = dp[i-1][j]. The answer is dp[len(s)][len(t)].",
        orderIndex: 2,
      },
    ],
  },
  {
    problem: {
      slug: "edit-distance",
      title: "Edit Distance",
      difficulty: "hard",
      category: "2-D Dynamic Programming",
      description:
        "Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.\n\nYou have the following three operations permitted on a word:\n\n- Insert a character\n- Delete a character\n- Replace a character",
      constraints: [
        "0 <= word1.length, word2.length <= 500",
        "word1 and word2 consist of lowercase English letters.",
      ],
      solution:
        "Use 2D DP where dp[i][j] is the minimum edit distance between word1[0..i-1] and word2[0..j-1]. If characters match, dp[i][j] = dp[i-1][j-1]. Otherwise, take 1 + min of insert (dp[i][j-1]), delete (dp[i-1][j]), or replace (dp[i-1][j-1]).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { word1: "horse", word2: "ros" },
        expectedOutput: 3,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { word1: "intention", word2: "execution" },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { word1: "", word2: "" }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { word1: "a", word2: "a" }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { word1: "", word2: "abc" }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { word1: "abc", word2: "" }, expectedOutput: 3, isVisible: false, orderIndex: 5 },
      { input: { word1: "abc", word2: "abc" }, expectedOutput: 0, isVisible: false, orderIndex: 6 },
      {
        input: { word1: "kitten", word2: "sitting" },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def minDistance(self, word1: str, word2: str) -> int:\n        pass",
      methodName: "minDistance",
      parameterNames: ["word1", "word2"],
    },
    hints: [
      {
        hintText:
          "Think about the last characters of word1 and word2. If they match, no operation is needed for them. If they differ, consider all three operations.",
        orderIndex: 0,
      },
      {
        hintText:
          "Build a 2D DP table where dp[i][j] represents the edit distance for the first i characters of word1 and first j characters of word2. Base cases: dp[i][0] = i, dp[0][j] = j.",
        orderIndex: 1,
      },
      {
        hintText:
          "Transition: if word1[i-1] == word2[j-1], dp[i][j] = dp[i-1][j-1]. Otherwise dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]).",
        orderIndex: 2,
      },
    ],
  },
  {
    problem: {
      slug: "burst-balloons",
      title: "Burst Balloons",
      difficulty: "hard",
      category: "2-D Dynamic Programming",
      description:
        "You are given `n` balloons, indexed from `0` to `n - 1`. Each balloon is painted with a number on it represented by an array `nums`. You are asked to burst all the balloons.\n\nIf you burst the `i`th balloon, you will get `nums[i - 1] * nums[i] * nums[i + 1]` coins. If `i - 1` or `i + 1` goes out of bounds of the array, then treat it as if there is a balloon with a `1` painted on it.\n\nReturn the maximum coins you can collect by bursting the balloons wisely.",
      constraints: ["n == nums.length", "1 <= n <= 300", "0 <= nums[i] <= 100"],
      solution:
        "Use interval DP. Think of the last balloon to burst in each subarray. For interval [left, right], try each balloon k as the last to burst, gaining nums[left-1] * nums[k] * nums[right+1] plus the optimal results from the two sub-intervals.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [3, 1, 5, 8] }, expectedOutput: 167, isVisible: true, orderIndex: 0 },
      { input: { nums: [1, 5] }, expectedOutput: 10, isVisible: true, orderIndex: 1 },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      { input: { nums: [5] }, expectedOutput: 5, isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 1, 1] }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { nums: [9, 76, 64, 21] }, expectedOutput: 116718, isVisible: false, orderIndex: 5 },
      { input: { nums: [2, 3] }, expectedOutput: 12, isVisible: false, orderIndex: 6 },
      { input: { nums: [1, 2, 3] }, expectedOutput: 12, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def maxCoins(self, nums: List[int]) -> int:\n        pass",
      methodName: "maxCoins",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Instead of thinking about which balloon to burst first, think about which balloon to burst LAST in each subarray.",
        orderIndex: 0,
      },
      {
        hintText:
          "Pad the array with 1s on both ends. Use interval DP: dp[left][right] is the max coins from bursting all balloons between left and right (exclusive).",
        orderIndex: 1,
      },
      {
        hintText:
          "For each interval, try every balloon k as the last to burst. The coins gained are nums[left] * nums[k] * nums[right] + dp[left][k] + dp[k][right].",
        orderIndex: 2,
      },
    ],
  },
  {
    problem: {
      slug: "regular-expression-matching",
      title: "Regular Expression Matching",
      difficulty: "hard",
      category: "2-D Dynamic Programming",
      description:
        "Given an input string `s` and a pattern `p`, implement regular expression matching with support for `'.'` and `'*'` where:\n\n- `'.'` Matches any single character.\n- `'*'` Matches zero or more of the preceding element.\n\nThe matching should cover the entire input string (not partial).",
      constraints: [
        "1 <= s.length <= 20",
        "1 <= p.length <= 20",
        "s contains only lowercase English letters.",
        "p contains only lowercase English letters, '.', and '*'.",
        "It is guaranteed for each appearance of the character '*', there will be a previous valid character to match.",
      ],
      solution:
        "Use 2D DP where dp[i][j] indicates whether s[0..i-1] matches p[0..j-1]. Handle '*' by either using zero occurrences of the preceding character (dp[i][j-2]) or matching one occurrence if the preceding character matches s[i-1].",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "aa", p: "a" }, expectedOutput: false, isVisible: true, orderIndex: 0 },
      { input: { s: "aa", p: "a*" }, expectedOutput: true, isVisible: true, orderIndex: 1 },
      { input: { s: "ab", p: ".*" }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { s: "aab", p: "c*a*b" }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      {
        input: { s: "mississippi", p: "mis*is*ip*." },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 4,
      },
      { input: { s: "ab", p: ".*c" }, expectedOutput: false, isVisible: false, orderIndex: 5 },
      { input: { s: "a", p: "ab*" }, expectedOutput: true, isVisible: false, orderIndex: 6 },
      { input: { s: "aaa", p: "a*a" }, expectedOutput: true, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def isMatch(self, s: str, p: str) -> bool:\n        pass",
      methodName: "isMatch",
      parameterNames: ["s", "p"],
    },
    hints: [
      {
        hintText:
          "The key challenge is handling '*'. It can match zero or more of the preceding character. Consider both cases at each step.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a 2D DP table where dp[i][j] = true means s[0..i-1] matches p[0..j-1]. Handle the base case carefully: empty string can match patterns like 'a*b*c*'.",
        orderIndex: 1,
      },
      {
        hintText:
          "For '*' at p[j-1]: zero matches means dp[i][j] = dp[i][j-2]. One or more matches means dp[i][j] = dp[i-1][j] if s[i-1] matches p[j-2] (or p[j-2] is '.').",
        orderIndex: 2,
      },
    ],
  },
];
