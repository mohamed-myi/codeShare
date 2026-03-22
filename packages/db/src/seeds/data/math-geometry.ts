import type { ProblemFixture } from "./types.js";

export const mathGeometryProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "happy-number",
      title: "Happy Number",
      difficulty: "easy",
      category: "Math & Geometry",
      description:
        "Write an algorithm to determine if a number `n` is happy.\n\nA happy number is a number defined by the following process:\n\n- Starting with any positive integer, replace the number by the sum of the squares of its digits.\n- Repeat the process until the number equals 1 (where it will stay), or it loops endlessly in a cycle which does not include 1.\n- Those numbers for which this process ends in 1 are happy.\n\nReturn `true` if `n` is a happy number, and `false` if not.",
      constraints: ["1 <= n <= 2^31 - 1"],
      solution:
        "Use Floyd's cycle detection (slow/fast pointers) or a hash set. Repeatedly compute the sum of squares of digits. If you reach 1, return true. If you detect a cycle, return false.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 19 }, expectedOutput: true, isVisible: true, orderIndex: 0 },
      { input: { n: 2 }, expectedOutput: false, isVisible: true, orderIndex: 1 },
      { input: { n: 1 }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { n: 7 }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      { input: { n: 4 }, expectedOutput: false, isVisible: false, orderIndex: 4 },
      { input: { n: 100 }, expectedOutput: true, isVisible: false, orderIndex: 5 },
      { input: { n: 3 }, expectedOutput: false, isVisible: false, orderIndex: 6 },
      { input: { n: 23 }, expectedOutput: true, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def isHappy(self, n: int) -> bool:\n        pass",
      methodName: "isHappy",
      parameterNames: ["n"],
    },
    hints: [
      {
        hintText:
          "The process either reaches 1 or enters an infinite cycle. Use a set to detect cycles, or apply Floyd's slow/fast pointer technique on the sequence of digit-square sums.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "plus-one",
      title: "Plus One",
      difficulty: "easy",
      category: "Math & Geometry",
      description:
        "You are given a large integer represented as an integer array `digits`, where each `digits[i]` is the `i`th digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. The large integer does not contain any leading `0`'s.\n\nIncrement the large integer by one and return the resulting array of digits.",
      constraints: [
        "1 <= digits.length <= 100",
        "0 <= digits[i] <= 9",
        "digits does not contain any leading 0's.",
      ],
      solution:
        "Iterate from the last digit. If it is less than 9, increment and return. If it is 9, set it to 0 and continue to the next digit. If all digits were 9, prepend a 1.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { digits: [1, 2, 3] }, expectedOutput: [1, 2, 4], isVisible: true, orderIndex: 0 },
      {
        input: { digits: [4, 3, 2, 1] },
        expectedOutput: [4, 3, 2, 2],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { digits: [9] }, expectedOutput: [1, 0], isVisible: true, orderIndex: 2 },
      { input: { digits: [0] }, expectedOutput: [1], isVisible: false, orderIndex: 3 },
      {
        input: { digits: [9, 9, 9] },
        expectedOutput: [1, 0, 0, 0],
        isVisible: false,
        orderIndex: 4,
      },
      { input: { digits: [1, 0, 0] }, expectedOutput: [1, 0, 1], isVisible: false, orderIndex: 5 },
      { input: { digits: [8, 9, 9] }, expectedOutput: [9, 0, 0], isVisible: false, orderIndex: 6 },
      { input: { digits: [1] }, expectedOutput: [2], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def plusOne(self, digits: List[int]) -> List[int]:\n        pass",
      methodName: "plusOne",
      parameterNames: ["digits"],
    },
    hints: [
      {
        hintText:
          "Start from the rightmost digit and handle the carry. A digit of 9 becomes 0 with a carry of 1. If the carry propagates past the first digit, prepend 1 to the result.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "rotate-image",
      title: "Rotate Image",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "You are given an `n x n` 2D `matrix` representing an image, rotate the image by 90 degrees (clockwise).\n\nYou have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.\n\nReturn the rotated matrix.",
      constraints: [
        "n == matrix.length == matrix[i].length",
        "1 <= n <= 20",
        "-1000 <= matrix[i][j] <= 1000",
      ],
      solution:
        "Transpose the matrix (swap matrix[i][j] with matrix[j][i] for i < j), then reverse each row. This achieves a 90-degree clockwise rotation in-place.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expectedOutput: [
          [7, 4, 1],
          [8, 5, 2],
          [9, 6, 3],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          matrix: [
            [5, 1, 9, 11],
            [2, 4, 8, 10],
            [13, 3, 6, 7],
            [15, 14, 12, 16],
          ],
        },
        expectedOutput: [
          [15, 13, 2, 5],
          [14, 3, 4, 1],
          [12, 6, 8, 9],
          [16, 7, 10, 11],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { matrix: [[1]] }, expectedOutput: [[1]], isVisible: true, orderIndex: 2 },
      {
        input: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
        expectedOutput: [
          [3, 1],
          [4, 2],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          matrix: [
            [0, 0],
            [0, 0],
          ],
        },
        expectedOutput: [
          [0, 0],
          [0, 0],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          matrix: [
            [-1, -2],
            [-3, -4],
          ],
        },
        expectedOutput: [
          [-3, -1],
          [-4, -2],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expectedOutput: [
          [7, 4, 1],
          [8, 5, 2],
          [9, 6, 3],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          matrix: [
            [1, 0],
            [0, 1],
          ],
        },
        expectedOutput: [
          [0, 1],
          [1, 0],
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def rotate(self, matrix: List[List[int]]) -> List[List[int]]:\n        pass",
      methodName: "rotate",
      parameterNames: ["matrix"],
    },
    hints: [
      {
        hintText:
          "A 90-degree clockwise rotation can be decomposed into two simpler operations: transpose and then reverse each row.",
        orderIndex: 0,
      },
      {
        hintText:
          "First transpose the matrix (swap matrix[i][j] with matrix[j][i]). Then reverse each row. This produces the 90-degree clockwise rotation.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "spiral-matrix",
      title: "Spiral Matrix",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "Given an `m x n` `matrix`, return all elements of the `matrix` in spiral order.",
      constraints: [
        "m == matrix.length",
        "n == matrix[i].length",
        "1 <= m, n <= 10",
        "-100 <= matrix[i][j] <= 100",
      ],
      solution:
        "Use four boundaries: top, bottom, left, right. Traverse right along the top row, down along the right column, left along the bottom row, and up along the left column. Shrink boundaries after each traversal.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expectedOutput: [1, 2, 3, 6, 9, 8, 7, 4, 5],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          matrix: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
          ],
        },
        expectedOutput: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { matrix: [[1]] }, expectedOutput: [1], isVisible: true, orderIndex: 2 },
      {
        input: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
        expectedOutput: [1, 2, 4, 3],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { matrix: [[1, 2, 3]] },
        expectedOutput: [1, 2, 3],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { matrix: [[1], [2], [3]] },
        expectedOutput: [1, 2, 3],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          matrix: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
        expectedOutput: [1, 2, 4, 6, 5, 3],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { matrix: [[6, 9, 7]] },
        expectedOutput: [6, 9, 7],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:\n        pass",
      methodName: "spiralOrder",
      parameterNames: ["matrix"],
    },
    hints: [
      {
        hintText:
          "Simulate the spiral by maintaining four boundaries (top, bottom, left, right) and shrinking them as you traverse each edge.",
        orderIndex: 0,
      },
      {
        hintText:
          "Traverse right along the top boundary, then down along the right, then left along the bottom, then up along the left. After each direction, shrink the corresponding boundary and check if boundaries have crossed.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "set-matrix-zeroes",
      title: "Set Matrix Zeroes",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "Given an `m x n` integer `matrix`, if an element is `0`, set its entire row and column to `0`'s.\n\nYou must do it in place. Return the modified matrix.",
      constraints: [
        "m == matrix.length",
        "n == matrix[0].length",
        "1 <= m, n <= 200",
        "-2^31 <= matrix[i][j] <= 2^31 - 1",
      ],
      solution:
        "Use the first row and first column as markers. First, record whether the first row/column themselves contain zeros. Then scan the rest of the matrix: if matrix[i][j] is 0, mark matrix[i][0] and matrix[0][j] as 0. Finally, zero out cells based on markers.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          matrix: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ],
        },
        expectedOutput: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 1],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          matrix: [
            [0, 1, 2, 0],
            [3, 4, 5, 2],
            [1, 3, 1, 5],
          ],
        },
        expectedOutput: [
          [0, 0, 0, 0],
          [0, 4, 5, 0],
          [0, 3, 1, 0],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      { input: { matrix: [[1]] }, expectedOutput: [[1]], isVisible: true, orderIndex: 2 },
      { input: { matrix: [[0]] }, expectedOutput: [[0]], isVisible: false, orderIndex: 3 },
      { input: { matrix: [[1, 0]] }, expectedOutput: [[0, 0]], isVisible: false, orderIndex: 4 },
      {
        input: {
          matrix: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        },
        expectedOutput: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          matrix: [
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
        expectedOutput: [
          [0, 0, 0],
          [0, 0, 0],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          matrix: [
            [1, 2],
            [3, 0],
          ],
        },
        expectedOutput: [
          [1, 0],
          [0, 0],
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def setZeroes(self, matrix: List[List[int]]) -> List[List[int]]:\n        pass",
      methodName: "setZeroes",
      parameterNames: ["matrix"],
    },
    hints: [
      {
        hintText:
          "You need to know which rows and columns should be zeroed before modifying the matrix. Can you use the matrix itself to store this information?",
        orderIndex: 0,
      },
      {
        hintText:
          "Use the first row and first column as flags. If matrix[i][j] == 0, set matrix[i][0] = 0 and matrix[0][j] = 0. Then use these flags to zero out the matrix. Handle the first row and column separately.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "powx-n",
      title: "Pow(x, n)",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "Implement `pow(x, n)`, which calculates `x` raised to the power `n` (i.e., `x^n`).",
      constraints: [
        "-100.0 < x < 100.0",
        "-2^31 <= n <= 2^31 - 1",
        "n is an integer.",
        "Either x is not zero or n > 0.",
        "-10^4 <= x^n <= 10^4",
      ],
      solution:
        "Use fast exponentiation (binary exponentiation). If n is negative, compute 1/x^(-n). Square x and halve n repeatedly, multiplying the result when n is odd.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { x: 2.0, n: 10 }, expectedOutput: 1024.0, isVisible: true, orderIndex: 0 },
      { input: { x: 2.1, n: 3 }, expectedOutput: 9.261, isVisible: true, orderIndex: 1 },
      { input: { x: 2.0, n: -2 }, expectedOutput: 0.25, isVisible: true, orderIndex: 2 },
      { input: { x: 1.0, n: 0 }, expectedOutput: 1.0, isVisible: false, orderIndex: 3 },
      { input: { x: 0.0, n: 5 }, expectedOutput: 0.0, isVisible: false, orderIndex: 4 },
      { input: { x: -2.0, n: 3 }, expectedOutput: -8.0, isVisible: false, orderIndex: 5 },
      { input: { x: -2.0, n: 2 }, expectedOutput: 4.0, isVisible: false, orderIndex: 6 },
      { input: { x: 1.0, n: 2147483647 }, expectedOutput: 1.0, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def myPow(self, x: float, n: int) -> float:\n        pass",
      methodName: "myPow",
      parameterNames: ["x", "n"],
    },
    hints: [
      {
        hintText:
          "Naive repeated multiplication is too slow for large n. Think about how you can reduce the number of multiplications by exploiting the property x^n = (x^(n/2))^2.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use binary exponentiation: if n is even, x^n = (x^2)^(n/2). If n is odd, x^n = x * x^(n-1). Handle negative n by computing 1 / x^(-n).",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "multiply-strings",
      title: "Multiply Strings",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "Given two non-negative integers `num1` and `num2` represented as strings, return the product of `num1` and `num2`, also represented as a string.\n\nNote: You must not use any built-in BigInteger library or convert the inputs to integer directly.",
      constraints: [
        "1 <= num1.length, num2.length <= 200",
        "num1 and num2 consist of digits only.",
        "Both num1 and num2 do not contain any leading zero, except the number 0 itself.",
      ],
      solution:
        "Simulate grade-school multiplication. Use a result array of size m+n. For each pair of digits, add their product to the appropriate position, handling carries. Strip leading zeros from the result.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { num1: "2", num2: "3" }, expectedOutput: "6", isVisible: true, orderIndex: 0 },
      {
        input: { num1: "123", num2: "456" },
        expectedOutput: "56088",
        isVisible: true,
        orderIndex: 1,
      },
      { input: { num1: "0", num2: "0" }, expectedOutput: "0", isVisible: true, orderIndex: 2 },
      {
        input: { num1: "999", num2: "999" },
        expectedOutput: "998001",
        isVisible: false,
        orderIndex: 3,
      },
      { input: { num1: "1", num2: "1" }, expectedOutput: "1", isVisible: false, orderIndex: 4 },
      {
        input: { num1: "100", num2: "100" },
        expectedOutput: "10000",
        isVisible: false,
        orderIndex: 5,
      },
      { input: { num1: "12", num2: "0" }, expectedOutput: "0", isVisible: false, orderIndex: 6 },
      { input: { num1: "9133", num2: "0" }, expectedOutput: "0", isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def multiply(self, num1: str, num2: str) -> str:\n        pass",
      methodName: "multiply",
      parameterNames: ["num1", "num2"],
    },
    hints: [
      {
        hintText:
          "Think about how you multiply numbers by hand. The digit at position i of num1 and position j of num2 contributes to position i+j and i+j+1 of the result.",
        orderIndex: 0,
      },
      {
        hintText:
          "Create a result array of size len(num1) + len(num2). For each pair of digits, multiply and add to result[i+j+1], carrying over to result[i+j]. Convert the array to a string, stripping leading zeros.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "detect-squares",
      title: "Detect Squares",
      difficulty: "medium",
      category: "Math & Geometry",
      description:
        "You are given a stream of points on the X-Y plane. Design a data structure that supports:\n\n- `add(point)` -- Adds a new point `point = [x, y]` to the data structure. Duplicate points are allowed and should be treated as separate points.\n- `count(point)` -- Given a query point `point = [x, y]`, counts the number of ways to form axis-aligned squares with the query point as one corner and three other points from the data structure as the other three corners. An axis-aligned square has its sides parallel to the x and y axes.\n\nImplement the `DetectSquares` class:\n\n- `DetectSquares()` Initializes the object with an empty data structure.\n- `void add(int[] point)` Adds a new point.\n- `int count(int[] point)` Returns the count of axis-aligned squares as described above.",
      constraints: [
        "point.length == 2",
        "0 <= x, y <= 1000",
        "At most 3000 calls in total will be made to add and count.",
      ],
      solution:
        "Use a hash map counting point frequencies. For count(px, py), iterate over all points (qx, qy) that form a diagonal. The side length is |px - qx| which must equal |py - qy|. Check if the other two corners exist and multiply their frequencies.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          operations: ["add", "add", "add", "count", "count", "add", "count"],
          args: [[[3, 10]], [[11, 2]], [[3, 2]], [[11, 10]], [[14, 8]], [[11, 2]], [[11, 10]]],
        },
        expectedOutput: [null, null, null, 1, 0, null, 2],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          operations: ["add", "add", "add", "add", "count"],
          args: [[[0, 0]], [[0, 1]], [[1, 0]], [[1, 1]], [[0, 0]]],
        },
        expectedOutput: [null, null, null, null, 1],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { operations: ["count"], args: [[[0, 0]]] },
        expectedOutput: [0],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { operations: ["add", "count"], args: [[[1, 1]], [[1, 1]]] },
        expectedOutput: [null, 0],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          operations: ["add", "add", "add", "add", "count"],
          args: [[[0, 0]], [[0, 2]], [[2, 0]], [[2, 2]], [[0, 0]]],
        },
        expectedOutput: [null, null, null, null, 1],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          operations: ["add", "add", "add", "add", "add", "add", "add", "add", "count"],
          args: [
            [[0, 0]],
            [[0, 1]],
            [[1, 0]],
            [[1, 1]],
            [[0, 0]],
            [[0, 1]],
            [[1, 0]],
            [[1, 1]],
            [[0, 0]],
          ],
        },
        expectedOutput: [null, null, null, null, null, null, null, null, 4],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          operations: ["add", "add", "add", "add", "count", "count"],
          args: [[[5, 5]], [[5, 8]], [[8, 5]], [[8, 8]], [[5, 5]], [[5, 8]]],
        },
        expectedOutput: [null, null, null, null, 1, 1],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { operations: ["add", "add", "count"], args: [[[0, 0]], [[1, 1]], [[0, 1]]] },
        expectedOutput: [null, null, 0],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class DetectSquares:\n    def __init__(self):\n        pass\n\n    def add(self, point: List[int]) -> None:\n        pass\n\n    def count(self, point: List[int]) -> int:\n        pass",
      methodName: "DetectSquares",
      parameterNames: [],
    },
    hints: [
      {
        hintText:
          "For a given query point, you need to find diagonal points that could form an axis-aligned square. The key constraint is |dx| == |dy| and both must be nonzero.",
        orderIndex: 0,
      },
      {
        hintText:
          "Store point frequencies in a hash map. For count(px, py), iterate over all stored points (qx, qy) where |px - qx| == |py - qy| != 0. Multiply the frequencies of the two other corners: (px, qy) and (qx, py).",
        orderIndex: 1,
      },
    ],
  },
];
