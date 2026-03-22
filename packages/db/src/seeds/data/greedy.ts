import type { ProblemFixture } from "./types.js";

export const greedyProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "maximum-subarray",
      title: "Maximum Subarray",
      difficulty: "medium",
      category: "Greedy",
      description:
        "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
      constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
      solution:
        "Use Kadane's algorithm. Maintain a running sum and reset it to the current element whenever it drops below the current element. Track the maximum sum seen so far.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { nums: [5, 4, -1, 7, 8] }, expectedOutput: 23, isVisible: true, orderIndex: 2 },
      { input: { nums: [-1] }, expectedOutput: -1, isVisible: false, orderIndex: 3 },
      { input: { nums: [-2, -1] }, expectedOutput: -1, isVisible: false, orderIndex: 4 },
      { input: { nums: [1, 2, 3, 4] }, expectedOutput: 10, isVisible: false, orderIndex: 5 },
      { input: { nums: [-1, -2, -3, -4] }, expectedOutput: -1, isVisible: false, orderIndex: 6 },
      { input: { nums: [3, -2, 5, -1] }, expectedOutput: 6, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        pass",
      methodName: "maxSubArray",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "At each position, decide whether to extend the current subarray or start a new one from the current element.",
        orderIndex: 0,
      },
      {
        hintText:
          "Kadane's algorithm: maintain currentSum = max(nums[i], currentSum + nums[i]) and track the global maximum across all positions.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "jump-game",
      title: "Jump Game",
      difficulty: "medium",
      category: "Greedy",
      description:
        "You are given an integer array `nums`. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position.\n\nReturn `true` if you can reach the last index, or `false` otherwise.",
      constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
      solution:
        "Track the farthest reachable index. Iterate through the array; if the current index exceeds the farthest reachable, return false. Otherwise, update the farthest reachable as max(farthest, i + nums[i]).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [2, 3, 1, 1, 4] }, expectedOutput: true, isVisible: true, orderIndex: 0 },
      { input: { nums: [3, 2, 1, 0, 4] }, expectedOutput: false, isVisible: true, orderIndex: 1 },
      { input: { nums: [0] }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { nums: [1] }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 0] }, expectedOutput: true, isVisible: false, orderIndex: 4 },
      { input: { nums: [0, 1] }, expectedOutput: false, isVisible: false, orderIndex: 5 },
      { input: { nums: [2, 0, 0] }, expectedOutput: true, isVisible: false, orderIndex: 6 },
      { input: { nums: [1, 1, 1, 1, 1] }, expectedOutput: true, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def canJump(self, nums: List[int]) -> bool:\n        pass",
      methodName: "canJump",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Think about what the farthest index you can reach at each step is. If you ever get stuck (current index > farthest reachable), you cannot proceed.",
        orderIndex: 0,
      },
      {
        hintText:
          "Greedily track the maximum reachable index. At each position i, update maxReach = max(maxReach, i + nums[i]). If i > maxReach at any point, return false.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "jump-game-ii",
      title: "Jump Game II",
      difficulty: "medium",
      category: "Greedy",
      description:
        "You are given a 0-indexed array of integers `nums` of length `n`. You are initially positioned at `nums[0]`.\n\nEach element `nums[i]` represents the maximum length of a forward jump from index `i`. In other words, if you are at `nums[i]`, you can jump to any `nums[i + j]` where:\n\n- `0 <= j <= nums[i]` and\n- `i + j < n`\n\nReturn the minimum number of jumps to reach `nums[n - 1]`. The test cases are generated such that you can reach `nums[n - 1]`.",
      constraints: [
        "1 <= nums.length <= 10^4",
        "0 <= nums[i] <= 1000",
        "It's guaranteed that you can reach nums[n - 1].",
      ],
      solution:
        "Use a greedy BFS-like approach. Track the current jump's boundary and the farthest reachable. When you reach the current boundary, increment jumps and move the boundary to the farthest reachable.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { nums: [2, 3, 1, 1, 4] }, expectedOutput: 2, isVisible: true, orderIndex: 0 },
      { input: { nums: [2, 3, 0, 1, 4] }, expectedOutput: 2, isVisible: true, orderIndex: 1 },
      { input: { nums: [1] }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { nums: [1, 2] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { nums: [1, 1, 1, 1] }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { nums: [3, 2, 1] }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      {
        input: { nums: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 0] },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [1, 2, 3] }, expectedOutput: 2, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def jump(self, nums: List[int]) -> int:\n        pass",
      methodName: "jump",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Think of this as BFS where each 'level' is a jump. All positions reachable within the current jump form one level.",
        orderIndex: 0,
      },
      {
        hintText:
          "Track the end of the current jump range and the farthest you can reach. When you pass the current end, increment jumps and set end to the farthest reachable.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "gas-station",
      title: "Gas Station",
      difficulty: "medium",
      category: "Greedy",
      description:
        "There are `n` gas stations along a circular route, where the amount of gas at the `i`th station is `gas[i]`.\n\nYou have a car with an unlimited gas tank and it costs `cost[i]` of gas to travel from the `i`th station to its next `(i + 1)`th station. You begin the journey with an empty tank at one of the gas stations.\n\nGiven two integer arrays `gas` and `cost`, return the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return `-1`. If there exists a solution, it is guaranteed to be unique.",
      constraints: [
        "n == gas.length == cost.length",
        "1 <= n <= 10^5",
        "0 <= gas[i], cost[i] <= 10^4",
      ],
      solution:
        "If total gas >= total cost, a solution exists. Track the current tank; whenever it drops below 0, reset the starting station to the next station and reset the tank. The final start position is the answer.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] },
        expectedOutput: 3,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { gas: [2, 3, 4], cost: [3, 4, 3] },
        expectedOutput: -1,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { gas: [5, 1, 2, 3, 4], cost: [4, 4, 1, 5, 1] },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { gas: [1], cost: [1] }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { gas: [5], cost: [4] }, expectedOutput: 0, isVisible: false, orderIndex: 4 },
      {
        input: { gas: [3, 1, 1], cost: [1, 2, 2] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { gas: [1, 2, 3, 4, 5], cost: [1, 2, 3, 4, 5] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { gas: [0, 0, 0], cost: [0, 0, 0] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:\n        pass",
      methodName: "canCompleteCircuit",
      parameterNames: ["gas", "cost"],
    },
    hints: [
      {
        hintText:
          "First check feasibility: if the total gas is less than the total cost, no solution exists.",
        orderIndex: 0,
      },
      {
        hintText:
          "Track a running surplus (gas[i] - cost[i]). Whenever it goes negative, the starting station must be after the current station. Reset and continue.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "hand-of-straights",
      title: "Hand of Straights",
      difficulty: "medium",
      category: "Greedy",
      description:
        "Alice has some number of cards in her hand. She wants to rearrange the cards into groups so that each group is of size `groupSize`, and consists of `groupSize` consecutive cards.\n\nGiven an integer array `hand` where `hand[i]` is the value written on the `i`th card and an integer `groupSize`, return `true` if she can rearrange the cards, or `false` otherwise.",
      constraints: [
        "1 <= hand.length <= 10^4",
        "0 <= hand[i] <= 10^9",
        "1 <= groupSize <= hand.length",
      ],
      solution:
        "Sort the cards and use a frequency map. Greedily form groups starting from the smallest available card. For each starting card, try to consume groupSize consecutive values. If any are missing, return false.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { hand: [1, 2, 3, 6, 2, 3, 4, 7, 8], groupSize: 3 },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { hand: [1, 2, 3, 4, 5], groupSize: 4 },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { hand: [1, 2, 3], groupSize: 3 },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { hand: [1], groupSize: 1 }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      {
        input: { hand: [1, 2, 3, 4], groupSize: 2 },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { hand: [1, 1, 2, 2, 3, 3], groupSize: 3 },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { hand: [1, 1, 2, 3], groupSize: 2 },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { hand: [8, 10, 12], groupSize: 3 },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:\n        pass",
      methodName: "isNStraightHand",
      parameterNames: ["hand", "groupSize"],
    },
    hints: [
      {
        hintText:
          "If the total number of cards is not divisible by groupSize, it is immediately impossible.",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort the hand and use a counter. Always start a new group from the smallest remaining card. For each group, greedily pick groupSize consecutive values.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "merge-triplets-to-form-target-triplet",
      title: "Merge Triplets to Form Target Triplet",
      difficulty: "medium",
      category: "Greedy",
      description:
        "A triplet is an array of three integers. You are given a 2D integer array `triplets`, where `triplets[i] = [ai, bi, ci]` describes the `i`th triplet. You are also given an integer array `target = [x, y, z]` that describes the triplet you want to obtain.\n\nTo obtain `target`, you may apply the following operation on `triplets` any number of times (possibly zero):\n\n- Choose two indices (0-indexed) `i` and `j` (`i != j`) and update `triplets[j]` to become `[max(ai, aj), max(bi, bj), max(ci, cj)]`.\n\nReturn `true` if it is possible to obtain the `target` triplet `[x, y, z]` as an element of `triplets`, or `false` otherwise.",
      constraints: [
        "1 <= triplets.length <= 10^5",
        "triplets[i].length == target.length == 3",
        "1 <= ai, bi, ci, x, y, z <= 1000",
      ],
      solution:
        "Filter out triplets where any value exceeds the corresponding target value (they would make that dimension too large). From the remaining triplets, check if each target dimension can be matched by at least one triplet.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          triplets: [
            [2, 5, 3],
            [1, 8, 4],
            [1, 7, 5],
          ],
          target: [2, 7, 5],
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          triplets: [
            [3, 4, 5],
            [4, 5, 6],
          ],
          target: [3, 2, 5],
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          triplets: [
            [2, 5, 3],
            [2, 3, 4],
            [1, 2, 5],
            [5, 2, 3],
          ],
          target: [5, 5, 5],
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { triplets: [[1, 1, 1]], target: [1, 1, 1] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { triplets: [[1, 2, 3]], target: [1, 2, 4] },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          triplets: [
            [1, 1, 1],
            [2, 2, 2],
            [3, 3, 3],
          ],
          target: [3, 3, 3],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          triplets: [
            [3, 1, 1],
            [1, 3, 1],
            [1, 1, 3],
          ],
          target: [3, 3, 3],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          triplets: [
            [4, 1, 1],
            [1, 4, 1],
            [1, 1, 4],
          ],
          target: [3, 3, 3],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:\n        pass",
      methodName: "mergeTriplets",
      parameterNames: ["triplets", "target"],
    },
    hints: [
      {
        hintText:
          "If a triplet has any value exceeding the target in that dimension, using it in a merge would make that dimension too large. These triplets must be excluded.",
        orderIndex: 0,
      },
      {
        hintText:
          "After filtering, check if the remaining triplets collectively cover all three target values. Track which target dimensions have been matched.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "partition-labels",
      title: "Partition Labels",
      difficulty: "medium",
      category: "Greedy",
      description:
        "You are given a string `s`. We want to partition the string into as many parts as possible so that each letter appears in at most one part.\n\nNote that the partition is done so that after concatenating all the parts in order, the resultant string should be `s`.\n\nReturn a list of integers representing the size of these parts.",
      constraints: ["1 <= s.length <= 500", "s consists of lowercase English letters."],
      solution:
        "First pass: record the last occurrence of each character. Second pass: greedily extend the current partition to include the last occurrence of every character seen so far. When the current index equals the partition end, close the partition.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { s: "ababcbacadefegdehijhklij" },
        expectedOutput: [9, 7, 8],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { s: "eccbbbbdec" }, expectedOutput: [10], isVisible: true, orderIndex: 1 },
      { input: { s: "a" }, expectedOutput: [1], isVisible: true, orderIndex: 2 },
      { input: { s: "abc" }, expectedOutput: [1, 1, 1], isVisible: false, orderIndex: 3 },
      { input: { s: "aaa" }, expectedOutput: [3], isVisible: false, orderIndex: 4 },
      { input: { s: "abab" }, expectedOutput: [4], isVisible: false, orderIndex: 5 },
      { input: { s: "abcabc" }, expectedOutput: [6], isVisible: false, orderIndex: 6 },
      {
        input: { s: "abcdefg" },
        expectedOutput: [1, 1, 1, 1, 1, 1, 1],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def partitionLabels(self, s: str) -> List[int]:\n        pass",
      methodName: "partitionLabels",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "For each character, find its last occurrence in the string. This determines the minimum extent of the partition that includes this character.",
        orderIndex: 0,
      },
      {
        hintText:
          "Iterate through the string, tracking the farthest last-occurrence of any character seen so far. When the current index matches this boundary, you have found a partition.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "valid-parenthesis-string",
      title: "Valid Parenthesis String",
      difficulty: "medium",
      category: "Greedy",
      description:
        "Given a string `s` containing only three types of characters: `'('`, `')'` and `'*'`, return `true` if `s` is valid.\n\nThe following rules define a valid string:\n\n- Any left parenthesis `'('` must have a corresponding right parenthesis `')'`.\n- Any right parenthesis `')'` must have a corresponding left parenthesis `'('`.\n- Left parenthesis `'('` must go before the corresponding right parenthesis `')'`.\n- `'*'` could be treated as a single right parenthesis `')'` OR a single left parenthesis `'('` OR an empty string `\"\"`.",
      constraints: ["1 <= s.length <= 100", "s[i] is '(', ')' or '*'."],
      solution:
        "Track the range of possible open parenthesis counts [low, high]. For '(' increment both, for ')' decrement both, for '*' decrement low and increment high. If high goes negative, return false. Clamp low to 0. At the end, check if low == 0.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { s: "()" }, expectedOutput: true, isVisible: true, orderIndex: 0 },
      { input: { s: "(*)" }, expectedOutput: true, isVisible: true, orderIndex: 1 },
      { input: { s: "(*))" }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { s: "*" }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      { input: { s: "(" }, expectedOutput: false, isVisible: false, orderIndex: 4 },
      { input: { s: ")" }, expectedOutput: false, isVisible: false, orderIndex: 5 },
      { input: { s: "((*))" }, expectedOutput: true, isVisible: false, orderIndex: 6 },
      { input: { s: "((((*)" }, expectedOutput: false, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def checkValidString(self, s: str) -> bool:\n        pass",
      methodName: "checkValidString",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "The '*' character introduces uncertainty. Instead of tracking a single count of open parentheses, think about tracking the range of possible counts.",
        orderIndex: 0,
      },
      {
        hintText:
          "Maintain low and high bounds for the open parenthesis count. '(' increments both, ')' decrements both, '*' decrements low and increments high. Clamp low to 0. If high < 0 at any point, return false. At the end, check low == 0.",
        orderIndex: 1,
      },
    ],
  },
];
