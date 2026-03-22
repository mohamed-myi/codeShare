import type { ProblemFixture } from "./types.js";

export const backtrackingProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "subsets",
      title: "Subsets",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given an integer array `nums` of unique elements, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.",
      constraints: [
        "1 <= nums.length <= 10",
        "-10 <= nums[i] <= 10",
        "All the numbers of nums are unique.",
      ],
      solution:
        "Use backtracking. At each index, decide to include or exclude the current element. Recurse on the remaining elements and collect all paths as subsets.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [1, 2, 3] },
        expectedOutput: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [0] }, expectedOutput: [[], [0]], isVisible: true, orderIndex: 1 },
      {
        input: { nums: [1, 2] },
        expectedOutput: [[], [1], [2], [1, 2]],
        isVisible: true,
        orderIndex: 2,
      },
      { input: { nums: [1] }, expectedOutput: [[], [1]], isVisible: false, orderIndex: 3 },
      {
        input: { nums: [-1, 0, 1] },
        expectedOutput: [[], [-1], [0], [-1, 0], [1], [-1, 1], [0, 1], [-1, 0, 1]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { nums: [1, 2, 3, 4] },
        expectedOutput: [
          [],
          [1],
          [2],
          [1, 2],
          [3],
          [1, 3],
          [2, 3],
          [1, 2, 3],
          [4],
          [1, 4],
          [2, 4],
          [1, 2, 4],
          [3, 4],
          [1, 3, 4],
          [2, 3, 4],
          [1, 2, 3, 4],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { nums: [5, 10] },
        expectedOutput: [[], [5], [10], [5, 10]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { nums: [-10, 10] },
        expectedOutput: [[], [-10], [10], [-10, 10]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def subsets(self, nums: List[int]) -> List[List[int]]:\n        pass",
      methodName: "subsets",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Think of each element as a binary choice: include it or skip it. This naturally forms a decision tree.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use backtracking: maintain a current subset, and at each index decide to include or exclude the element. When you reach the end of the array, add the current subset to the result.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "combination-sum",
      title: "Combination Sum",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of `candidates` where the chosen numbers sum to `target`. You may return the combinations in any order.\n\nThe same number may be chosen from `candidates` an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.\n\nThe test cases are generated such that the number of unique combinations that sum up to `target` is less than `150` combinations for the given input.",
      constraints: [
        "1 <= candidates.length <= 30",
        "2 <= candidates[i] <= 40",
        "All elements of candidates are distinct.",
        "1 <= target <= 40",
      ],
      solution:
        "Use backtracking with a start index. At each step, try adding each candidate (from the current index onward to avoid duplicates). Subtract from the target and recurse. Backtrack when the remaining target is negative.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { candidates: [2, 3, 6, 7], target: 7 },
        expectedOutput: [[2, 2, 3], [7]],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { candidates: [2, 3, 5], target: 8 },
        expectedOutput: [
          [2, 2, 2, 2],
          [2, 3, 3],
          [3, 5],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { candidates: [2], target: 1 }, expectedOutput: [], isVisible: true, orderIndex: 2 },
      {
        input: { candidates: [3], target: 9 },
        expectedOutput: [[3, 3, 3]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { candidates: [2, 3], target: 6 },
        expectedOutput: [
          [2, 2, 2],
          [3, 3],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { candidates: [7, 3, 2], target: 18 },
        expectedOutput: [
          [2, 2, 2, 2, 2, 2, 2, 2, 2],
          [2, 2, 2, 2, 2, 2, 3, 3],
          [2, 2, 2, 2, 3, 7],
          [2, 2, 2, 3, 3, 3, 3],
          [2, 2, 7, 7],
          [2, 3, 3, 3, 7],
          [3, 3, 3, 3, 3, 3],
          [7, 7, 2, 2],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { candidates: [5, 10, 15], target: 15 },
        expectedOutput: [[5, 5, 5], [5, 10], [15]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { candidates: [8, 4], target: 8 },
        expectedOutput: [[4, 4], [8]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n        pass",
      methodName: "combinationSum",
      parameterNames: ["candidates", "target"],
    },
    hints: [
      {
        hintText:
          "Since the same number can be used multiple times, when you recurse you can stay at the same index rather than moving forward.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a start index to avoid generating duplicate combinations. At each step, try each candidate from the start index onward, subtract it from the target, and recurse. Stop when the target reaches 0 or goes negative.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "permutations",
      title: "Permutations",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given an array `nums` of distinct integers, return all the possible permutations. You can return the answer in any order.",
      constraints: [
        "1 <= nums.length <= 6",
        "-10 <= nums[i] <= 10",
        "All the integers of nums are unique.",
      ],
      solution:
        "Use backtracking. Build the permutation one element at a time. At each step, try each unused element, add it to the current permutation, recurse, then remove it (backtrack).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [1, 2, 3] },
        expectedOutput: [
          [1, 2, 3],
          [1, 3, 2],
          [2, 1, 3],
          [2, 3, 1],
          [3, 1, 2],
          [3, 2, 1],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { nums: [0, 1] },
        expectedOutput: [
          [0, 1],
          [1, 0],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { nums: [1] }, expectedOutput: [[1]], isVisible: true, orderIndex: 2 },
      {
        input: { nums: [-1, 0, 1] },
        expectedOutput: [
          [-1, 0, 1],
          [-1, 1, 0],
          [0, -1, 1],
          [0, 1, -1],
          [1, -1, 0],
          [1, 0, -1],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { nums: [1, 2] },
        expectedOutput: [
          [1, 2],
          [2, 1],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      { input: { nums: [5] }, expectedOutput: [[5]], isVisible: false, orderIndex: 5 },
      {
        input: { nums: [1, 2, 3, 4] },
        expectedOutput: [
          [1, 2, 3, 4],
          [1, 2, 4, 3],
          [1, 3, 2, 4],
          [1, 3, 4, 2],
          [1, 4, 2, 3],
          [1, 4, 3, 2],
          [2, 1, 3, 4],
          [2, 1, 4, 3],
          [2, 3, 1, 4],
          [2, 3, 4, 1],
          [2, 4, 1, 3],
          [2, 4, 3, 1],
          [3, 1, 2, 4],
          [3, 1, 4, 2],
          [3, 2, 1, 4],
          [3, 2, 4, 1],
          [3, 4, 1, 2],
          [3, 4, 2, 1],
          [4, 1, 2, 3],
          [4, 1, 3, 2],
          [4, 2, 1, 3],
          [4, 2, 3, 1],
          [4, 3, 1, 2],
          [4, 3, 2, 1],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [0] }, expectedOutput: [[0]], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def permute(self, nums: List[int]) -> List[List[int]]:\n        pass",
      methodName: "permute",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "Think about building a permutation position by position. At each position, you can place any element not yet used.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a visited set or swap elements in-place. For each position, try each unused element, recurse to fill the next position, then undo the choice.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "subsets-ii",
      title: "Subsets II",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given an integer array `nums` that may contain duplicates, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.",
      constraints: ["1 <= nums.length <= 10", "-10 <= nums[i] <= 10"],
      solution:
        "Sort the array first. Use backtracking with a start index. Skip duplicate elements at the same recursion level by checking if the current element equals the previous one at the same level.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [1, 2, 2] },
        expectedOutput: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { nums: [0] }, expectedOutput: [[], [0]], isVisible: true, orderIndex: 1 },
      {
        input: { nums: [1, 1] },
        expectedOutput: [[], [1], [1, 1]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { nums: [1, 2, 3] },
        expectedOutput: [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { nums: [4, 4, 4] },
        expectedOutput: [[], [4], [4, 4], [4, 4, 4]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { nums: [1, 1, 2, 2] },
        expectedOutput: [[], [1], [1, 1], [1, 1, 2], [1, 1, 2, 2], [1, 2], [1, 2, 2], [2], [2, 2]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { nums: [3, 1, 2] },
        expectedOutput: [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { nums: [0, 0, 0, 0] },
        expectedOutput: [[], [0], [0, 0], [0, 0, 0], [0, 0, 0, 0]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:\n        pass",
      methodName: "subsetsWithDup",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "How is this different from Subsets I? The key challenge is avoiding duplicate subsets when the input contains duplicates.",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort the array first. During backtracking, if the current element is the same as the previous one at the same recursion level, skip it to avoid duplicates.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "combination-sum-ii",
      title: "Combination Sum II",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given a collection of candidate numbers (`candidates`) and a target number (`target`), find all unique combinations in `candidates` where the candidate numbers sum to `target`.\n\nEach number in `candidates` may only be used once in the combination.\n\nNote: The solution set must not contain duplicate combinations.",
      constraints: [
        "1 <= candidates.length <= 100",
        "1 <= candidates[i] <= 50",
        "1 <= target <= 30",
      ],
      solution:
        "Sort the array first. Use backtracking with a start index. At each level, skip duplicate candidates (if candidates[i] == candidates[i-1] at the same level). Each candidate can only be used once, so recurse from i+1.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { candidates: [10, 1, 2, 7, 6, 1, 5], target: 8 },
        expectedOutput: [
          [1, 1, 6],
          [1, 2, 5],
          [1, 7],
          [2, 6],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { candidates: [2, 5, 2, 1, 2], target: 5 },
        expectedOutput: [[1, 2, 2], [5]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { candidates: [1], target: 1 },
        expectedOutput: [[1]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { candidates: [1], target: 2 },
        expectedOutput: [],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { candidates: [1, 1, 1, 1], target: 2 },
        expectedOutput: [[1, 1]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { candidates: [3, 1, 3, 5, 1, 1], target: 5 },
        expectedOutput: [[1, 1, 3], [5]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { candidates: [2, 2, 2], target: 4 },
        expectedOutput: [[2, 2]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { candidates: [4, 3, 2, 1], target: 10 },
        expectedOutput: [[1, 2, 3, 4]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:\n        pass",
      methodName: "combinationSum2",
      parameterNames: ["candidates", "target"],
    },
    hints: [
      {
        hintText:
          "This is similar to Combination Sum, but each element can only be used once. How do you prevent using the same element twice?",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort the candidates first. During backtracking, skip duplicate elements at the same recursion level. Move to i+1 when recursing to avoid reusing elements.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "word-search",
      title: "Word Search",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
      constraints: [
        "m == board.length",
        "n == board[i].length",
        "1 <= m, n <= 6",
        "1 <= word.length <= 15",
        "board and word consists of only lowercase and uppercase English letters.",
      ],
      solution:
        "For each cell matching the first character, start a DFS/backtracking search. Mark visited cells, explore all four directions, and backtrack by unmarking. Return true if the entire word is matched.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "ABCCED",
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "SEE",
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          board: [
            ["A", "B", "C", "E"],
            ["S", "F", "C", "S"],
            ["A", "D", "E", "E"],
          ],
          word: "ABCB",
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { board: [["A"]], word: "A" },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { board: [["A"]], word: "B" },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          board: [
            ["A", "B"],
            ["C", "D"],
          ],
          word: "ABDC",
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          board: [
            ["A", "A", "A"],
            ["A", "A", "A"],
            ["A", "A", "A"],
          ],
          word: "AAAAAAAAA",
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          board: [
            ["A", "B"],
            ["C", "D"],
          ],
          word: "ACDB",
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def exist(self, board: List[List[str]], word: str) -> bool:\n        pass",
      methodName: "exist",
      parameterNames: ["board", "word"],
    },
    hints: [
      {
        hintText:
          "Try starting the search from every cell that matches the first character of the word.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use DFS with backtracking. Mark cells as visited during exploration and unmark them when backtracking. Explore all four adjacent directions at each step.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "palindrome-partitioning",
      title: "Palindrome Partitioning",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given a string `s`, partition `s` such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of `s`.",
      constraints: ["1 <= s.length <= 16", "s contains only lowercase English letters."],
      solution:
        "Use backtracking. At each position, try every possible prefix. If the prefix is a palindrome, add it to the current partition and recurse on the remaining string. Collect results when the entire string is consumed.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { s: "aab" },
        expectedOutput: [
          ["a", "a", "b"],
          ["aa", "b"],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { s: "a" }, expectedOutput: [["a"]], isVisible: true, orderIndex: 1 },
      { input: { s: "ab" }, expectedOutput: [["a", "b"]], isVisible: true, orderIndex: 2 },
      { input: { s: "aa" }, expectedOutput: [["a", "a"], ["aa"]], isVisible: false, orderIndex: 3 },
      {
        input: { s: "aaa" },
        expectedOutput: [["a", "a", "a"], ["a", "aa"], ["aa", "a"], ["aaa"]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { s: "aba" },
        expectedOutput: [["a", "b", "a"], ["aba"]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { s: "abba" },
        expectedOutput: [["a", "b", "b", "a"], ["a", "bb", "a"], ["abba"]],
        isVisible: false,
        orderIndex: 6,
      },
      { input: { s: "abc" }, expectedOutput: [["a", "b", "c"]], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def partition(self, s: str) -> List[List[str]]:\n        pass",
      methodName: "partition",
      parameterNames: ["s"],
    },
    hints: [
      {
        hintText:
          "At each position in the string, you need to decide where to cut. Try every possible prefix that forms a palindrome.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use backtracking: for each starting position, try substrings of increasing length. If a substring is a palindrome, include it in the current partition and recurse on the rest of the string.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "letter-combinations-of-a-phone-number",
      title: "Letter Combinations of a Phone Number",
      difficulty: "medium",
      category: "Backtracking",
      description:
        "Given a string containing digits from `2-9` inclusive, return all possible letter combinations that the number could represent. Return the answer in any order.\n\nA mapping of digits to letters (just like on the telephone buttons) is given below. Note that 1 does not map to any letters.\n\n- 2: abc\n- 3: def\n- 4: ghi\n- 5: jkl\n- 6: mno\n- 7: pqrs\n- 8: tuv\n- 9: wxyz",
      constraints: ["0 <= digits.length <= 4", "digits[i] is a digit in the range ['2', '9']."],
      solution:
        "Use backtracking. Map each digit to its letters. For each digit in the input, try all corresponding letters, appending one at a time and recursing to the next digit. Collect complete combinations.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { digits: "23" },
        expectedOutput: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { digits: "" }, expectedOutput: [], isVisible: true, orderIndex: 1 },
      { input: { digits: "2" }, expectedOutput: ["a", "b", "c"], isVisible: true, orderIndex: 2 },
      {
        input: { digits: "9" },
        expectedOutput: ["w", "x", "y", "z"],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { digits: "7" },
        expectedOutput: ["p", "q", "r", "s"],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { digits: "79" },
        expectedOutput: [
          "pw",
          "px",
          "py",
          "pz",
          "qw",
          "qx",
          "qy",
          "qz",
          "rw",
          "rx",
          "ry",
          "rz",
          "sw",
          "sx",
          "sy",
          "sz",
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { digits: "22" },
        expectedOutput: ["aa", "ab", "ac", "ba", "bb", "bc", "ca", "cb", "cc"],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { digits: "234" },
        expectedOutput: [
          "adg",
          "adh",
          "adi",
          "aeg",
          "aeh",
          "aei",
          "afg",
          "afh",
          "afi",
          "bdg",
          "bdh",
          "bdi",
          "beg",
          "beh",
          "bei",
          "bfg",
          "bfh",
          "bfi",
          "cdg",
          "cdh",
          "cdi",
          "ceg",
          "ceh",
          "cei",
          "cfg",
          "cfh",
          "cfi",
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def letterCombinations(self, digits: str) -> List[str]:\n        pass",
      methodName: "letterCombinations",
      parameterNames: ["digits"],
    },
    hints: [
      {
        hintText:
          "Create a mapping from each digit to its corresponding letters. Then think about how to generate all combinations digit by digit.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use backtracking: for each digit, iterate over its mapped letters, append one to the current combination, and recurse to the next digit. When the combination length equals the input length, add it to the results.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "n-queens",
      title: "N-Queens",
      difficulty: "hard",
      category: "Backtracking",
      description:
        "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.\n\nGiven an integer `n`, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.\n\nEach solution contains a distinct board configuration of the n-queens' placement, where `'Q'` and `'.'` both indicate a queen and an empty space, respectively.",
      constraints: ["1 <= n <= 9"],
      solution:
        "Use backtracking row by row. For each row, try placing a queen in each column. Track which columns and diagonals are under attack using sets. If a placement is valid, recurse to the next row. Collect the board when all rows are filled.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { n: 4 },
        expectedOutput: [
          [".Q..", "...Q", "Q...", "..Q."],
          ["..Q.", "Q...", "...Q", ".Q.."],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { n: 1 }, expectedOutput: [["Q"]], isVisible: true, orderIndex: 1 },
      { input: { n: 2 }, expectedOutput: [], isVisible: true, orderIndex: 2 },
      { input: { n: 3 }, expectedOutput: [], isVisible: false, orderIndex: 3 },
      {
        input: { n: 5 },
        expectedOutput: [
          ["Q....", "..Q..", "....Q", ".Q...", "...Q."],
          ["Q....", "...Q.", ".Q...", "....Q", "..Q.."],
          [".Q...", "...Q.", "Q....", "..Q..", "....Q"],
          [".Q...", "....Q", "..Q..", "Q....", "...Q."],
          ["..Q..", "Q....", "...Q.", ".Q...", "....Q"],
          ["..Q..", "....Q", ".Q...", "...Q.", "Q...."],
          ["...Q.", "Q....", "..Q..", "....Q", ".Q..."],
          ["...Q.", ".Q...", "....Q", "..Q..", "Q...."],
          ["....Q", ".Q...", "...Q.", "Q....", "..Q.."],
          ["....Q", "..Q..", "Q....", "...Q.", ".Q..."],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { n: 6 },
        expectedOutput: [
          [".Q....", "...Q..", ".....Q", "Q.....", "..Q...", "....Q."],
          ["..Q...", ".....Q", ".Q....", "....Q.", "Q.....", "...Q.."],
          ["...Q..", "Q.....", "....Q.", ".Q....", ".....Q", "..Q..."],
          ["....Q.", "..Q...", "Q.....", ".....Q", "...Q..", ".Q...."],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { n: 7 },
        expectedOutput: [
          ["Q......", "..Q....", "....Q..", "......Q", ".Q.....", "...Q...", ".....Q."],
          ["Q......", "...Q...", "......Q", "..Q....", ".....Q.", ".Q.....", "....Q.."],
          [".Q.....", "...Q...", "Q......", "......Q", "....Q..", "..Q....", ".....Q."],
          [".Q.....", "...Q...", ".....Q.", "Q......", "..Q....", "....Q..", "......Q"],
          [".Q.....", "....Q..", "Q......", "...Q...", "......Q", "..Q....", ".....Q."],
          [".Q.....", "....Q..", "......Q", "...Q...", "Q......", "..Q....", ".....Q."],
          [".Q.....", ".....Q.", "..Q....", "......Q", "...Q...", "Q......", "....Q.."],
          [".Q.....", "......Q", "....Q..", "..Q....", "Q......", ".....Q.", "...Q..."],
          ["..Q....", "Q......", ".....Q.", ".Q.....", "....Q..", "......Q", "...Q..."],
          ["..Q....", "Q......", ".....Q.", "...Q...", ".Q.....", "......Q", "....Q.."],
          ["..Q....", "....Q..", "......Q", ".Q.....", "...Q...", ".....Q.", "Q......"],
          ["..Q....", ".....Q.", ".Q.....", "....Q..", "Q......", "...Q...", "......Q"],
          ["..Q....", "......Q", ".Q.....", "...Q...", ".....Q.", "Q......", "....Q.."],
          ["..Q....", "......Q", "...Q...", "Q......", "....Q..", ".Q.....", ".....Q."],
          ["...Q...", "Q......", "....Q..", ".Q.....", ".....Q.", "..Q....", "......Q"],
          ["...Q...", "Q......", "..Q....", ".....Q.", ".Q.....", "......Q", "....Q.."],
          ["...Q...", ".Q.....", "......Q", "....Q..", "..Q....", "Q......", ".....Q."],
          ["...Q...", ".....Q.", "Q......", "..Q....", "....Q..", "......Q", ".Q....."],
          ["...Q...", "......Q", "..Q....", ".....Q.", ".Q.....", "....Q..", "Q......"],
          ["...Q...", "......Q", "....Q..", ".Q.....", ".....Q.", "Q......", "..Q...."],
          ["....Q..", "Q......", "...Q...", "......Q", "..Q....", ".....Q.", ".Q....."],
          ["....Q..", "Q......", ".....Q.", "...Q...", ".Q.....", "......Q", "..Q...."],
          ["....Q..", ".Q.....", ".....Q.", "..Q....", "......Q", "...Q...", "Q......"],
          ["....Q..", "..Q....", "Q......", ".....Q.", "...Q...", ".Q.....", "......Q"],
          ["....Q..", "......Q", ".Q.....", "...Q...", ".....Q.", "Q......", "..Q...."],
          ["....Q..", "......Q", ".Q.....", ".....Q.", "..Q....", "Q......", "...Q..."],
          [".....Q.", "Q......", "..Q....", "....Q..", "......Q", ".Q.....", "...Q..."],
          [".....Q.", ".Q.....", "....Q..", "Q......", "...Q...", "......Q", "..Q...."],
          [".....Q.", "..Q....", "Q......", "...Q...", "......Q", "....Q..", ".Q....."],
          [".....Q.", "..Q....", "....Q..", "......Q", "Q......", "...Q...", ".Q....."],
          [".....Q.", "..Q....", "......Q", "...Q...", "Q......", "....Q..", ".Q....."],
          [".....Q.", "...Q...", ".Q.....", "......Q", "....Q..", "..Q....", "Q......"],
          [".....Q.", "...Q...", "......Q", "Q......", "..Q....", "....Q..", ".Q....."],
          ["......Q", ".Q.....", "...Q...", ".....Q.", "Q......", "..Q....", "....Q.."],
          ["......Q", "..Q....", ".....Q.", ".Q.....", "....Q..", "Q......", "...Q..."],
          ["......Q", "...Q...", "Q......", "....Q..", ".Q.....", ".....Q.", "..Q...."],
          ["......Q", "....Q..", "..Q....", "Q......", ".....Q.", "...Q...", ".Q....."],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      { input: { n: 8 }, expectedOutput: 92, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def solveNQueens(self, n: int) -> List[List[str]]:\n        pass",
      methodName: "solveNQueens",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "Place queens one row at a time. For each row, try every column and check if it's safe (no other queen in the same column, or on the same diagonal).",
        orderIndex: 0,
      },
      {
        hintText:
          "Track attacked columns and diagonals using sets. The two diagonal directions can be identified by (row - col) and (row + col).",
        orderIndex: 1,
      },
      {
        hintText:
          "When you've placed a queen in every row successfully, convert the board state to the required string format and add it to results.",
        orderIndex: 2,
      },
    ],
  },
];
