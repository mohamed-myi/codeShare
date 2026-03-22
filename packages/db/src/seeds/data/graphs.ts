import type { ProblemFixture } from "./types.js";

export const graphsProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "number-of-islands",
      title: "Number of Islands",
      difficulty: "medium",
      category: "Graphs",
      description:
        "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
      constraints: [
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 300",
        "grid[i][j] is '0' or '1'.",
      ],
      solution:
        "Iterate through the grid. When a '1' is found, increment the count and use BFS or DFS to mark all connected land cells as visited. Continue scanning for the next unvisited '1'.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          grid: [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          grid: [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        },
        expectedOutput: 3,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { grid: [["1"]] },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { grid: [["0"]] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          grid: [
            ["1", "0", "1"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        },
        expectedOutput: 5,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          grid: [
            ["1", "1", "1"],
            ["1", "1", "1"],
            ["1", "1", "1"],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          grid: [
            ["0", "0", "0"],
            ["0", "0", "0"],
            ["0", "0", "0"],
          ],
        },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          grid: [
            ["1", "0", "1", "0"],
            ["0", "0", "0", "0"],
            ["1", "0", "1", "0"],
          ],
        },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def numIslands(self, grid: List[List[str]]) -> int:\n        pass",
      methodName: "numIslands",
      parameterNames: ["grid"],
    },
    hints: [
      {
        hintText:
          "Each connected group of '1's forms one island. Think about how to traverse all cells in a connected component.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use BFS or DFS. When you find a '1', explore all connected '1's and mark them as visited (e.g., change to '0'). Each time you start a new traversal, that's a new island.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "clone-graph",
      title: "Clone Graph",
      difficulty: "medium",
      category: "Graphs",
      description:
        "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.\n\nEach node in the graph contains a value (`int`) and a list (`List[Node]`) of its neighbors.\n\nThe graph is represented in the test case using an adjacency list. An adjacency list is a collection of unordered lists used to represent a finite graph. Each list describes the set of neighbors of a node in the graph.\n\nThe given node will always be the first node with `val = 1`. You must return the copy of the given node as a reference to the cloned graph.",
      constraints: [
        "The number of nodes in the graph is in the range [0, 100].",
        "1 <= Node.val <= 100",
        "Node.val is unique for each node.",
        "There are no repeated edges and no self-loops in the graph.",
        "The Graph is connected and all nodes can be visited starting from the given node.",
      ],
      solution:
        "Use BFS or DFS with a hash map from original node to cloned node. For each node, create a clone if it doesn't exist, then recursively clone all neighbors and link them.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          adjList: [
            [2, 4],
            [1, 3],
            [2, 4],
            [1, 3],
          ],
        },
        expectedOutput: [
          [2, 4],
          [1, 3],
          [2, 4],
          [1, 3],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      { input: { adjList: [[]] }, expectedOutput: [[]], isVisible: true, orderIndex: 1 },
      { input: { adjList: [] }, expectedOutput: [], isVisible: true, orderIndex: 2 },
      {
        input: { adjList: [[2], [1]] },
        expectedOutput: [[2], [1]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          adjList: [
            [2, 3],
            [1, 3],
            [1, 2],
          ],
        },
        expectedOutput: [
          [2, 3],
          [1, 3],
          [1, 2],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { adjList: [[2], [1, 3], [2]] },
        expectedOutput: [[2], [1, 3], [2]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { adjList: [[2, 3, 4], [1], [1], [1]] },
        expectedOutput: [[2, 3, 4], [1], [1], [1]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { adjList: [[2, 3], [1], [1]] },
        expectedOutput: [[2, 3], [1], [1]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:\n        pass",
      methodName: "cloneGraph",
      parameterNames: ["node"],
    },
    hints: [
      {
        hintText:
          "You need to create new nodes and link them just like the original. A hash map from original to clone helps avoid duplicating nodes.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use BFS or DFS. When visiting a node, check if it's already been cloned. If not, create the clone and add it to the map. Then process all neighbors.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "max-area-of-island",
      title: "Max Area of Island",
      difficulty: "medium",
      category: "Graphs",
      description:
        "You are given an `m x n` binary matrix `grid`. An island is a group of `1`'s (representing land) connected 4-directionally (horizontal or vertical). You may assume all four edges of the grid are surrounded by water.\n\nThe area of an island is the number of cells with a value `1` in the island.\n\nReturn the maximum area of an island in `grid`. If there is no island, return `0`.",
      constraints: [
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 50",
        "grid[i][j] is either 0 or 1.",
      ],
      solution:
        "Iterate through the grid. For each unvisited '1', use DFS/BFS to count all connected land cells. Track and return the maximum area found.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          grid: [
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
          ],
        },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { grid: [[0, 0, 0, 0, 0, 0, 0, 0]] },
        expectedOutput: 0,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { grid: [[1]] },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { grid: [[0]] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          grid: [
            [1, 1],
            [1, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          grid: [
            [1, 0],
            [0, 1],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          grid: [
            [1, 1, 0, 0],
            [1, 1, 0, 0],
            [0, 0, 1, 1],
            [0, 0, 1, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          grid: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ],
        },
        expectedOutput: 8,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:\n        pass",
      methodName: "maxAreaOfIsland",
      parameterNames: ["grid"],
    },
    hints: [
      {
        hintText:
          "This is similar to Number of Islands, but instead of counting islands, you need to measure each one's area.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use DFS or BFS to explore each island. Count the number of cells visited in each traversal and keep track of the maximum.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "pacific-atlantic-water-flow",
      title: "Pacific Atlantic Water Flow",
      difficulty: "medium",
      category: "Graphs",
      description:
        "There is an `m x n` rectangular island that borders both the Pacific Ocean and the Atlantic Ocean. The Pacific Ocean touches the island's left and top edges, and the Atlantic Ocean touches the island's right and bottom edges.\n\nThe island is partitioned into a grid of square cells. You are given an `m x n` integer matrix `heights` where `heights[r][c]` represents the height above sea level of the cell at coordinate `(r, c)`.\n\nThe island receives a lot of rain, and the rain water can flow to neighboring cells directly north, south, east, and west if the neighboring cell's height is less than or equal to the current cell's height. Water can flow from any cell adjacent to an ocean into the ocean.\n\nReturn a 2D list of grid coordinates `result` where `result[i] = [ri, ci]` denotes that rain water can flow from cell `(ri, ci)` to both the Pacific and Atlantic oceans.",
      constraints: [
        "m == heights.length",
        "n == heights[r].length",
        "1 <= m, n <= 200",
        "0 <= heights[r][c] <= 10^5",
      ],
      solution:
        "Run BFS/DFS backwards from the ocean borders. Start from Pacific edges and find all reachable cells (going uphill). Do the same from Atlantic edges. The answer is the intersection of both reachable sets.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          heights: [
            [1, 2, 2, 3, 5],
            [3, 2, 3, 4, 4],
            [2, 4, 5, 3, 1],
            [6, 7, 1, 4, 5],
            [5, 1, 1, 2, 4],
          ],
        },
        expectedOutput: [
          [0, 4],
          [1, 3],
          [1, 4],
          [2, 2],
          [3, 0],
          [3, 1],
          [4, 0],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { heights: [[1]] },
        expectedOutput: [[0, 0]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          heights: [
            [1, 1],
            [1, 1],
          ],
        },
        expectedOutput: [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          heights: [
            [1, 2],
            [3, 4],
          ],
        },
        expectedOutput: [
          [0, 1],
          [1, 0],
          [1, 1],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          heights: [
            [5, 1],
            [1, 5],
          ],
        },
        expectedOutput: [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          heights: [
            [10, 10, 10],
            [10, 1, 10],
            [10, 10, 10],
          ],
        },
        expectedOutput: [
          [0, 0],
          [0, 1],
          [0, 2],
          [1, 0],
          [1, 2],
          [2, 0],
          [2, 1],
          [2, 2],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          heights: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        expectedOutput: [
          [0, 2],
          [1, 2],
          [2, 0],
          [2, 1],
          [2, 2],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          heights: [
            [3, 3, 3],
            [3, 3, 3],
            [3, 3, 3],
          ],
        },
        expectedOutput: [
          [0, 0],
          [0, 1],
          [0, 2],
          [1, 0],
          [1, 1],
          [1, 2],
          [2, 0],
          [2, 1],
          [2, 2],
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n        pass",
      methodName: "pacificAtlantic",
      parameterNames: ["heights"],
    },
    hints: [
      {
        hintText:
          "Instead of checking if water from each cell can reach both oceans, try thinking in reverse: which cells can be reached from each ocean?",
        orderIndex: 0,
      },
      {
        hintText:
          "Start BFS/DFS from the Pacific border (top row, left column) going uphill to find all cells that can reach the Pacific. Do the same from the Atlantic border (bottom row, right column). The answer is the intersection.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "surrounded-regions",
      title: "Surrounded Regions",
      difficulty: "medium",
      category: "Graphs",
      description:
        "Given an `m x n` matrix `board` containing `'X'` and `'O'`, capture all regions that are 4-directionally surrounded by `'X'`.\n\nA region is captured by flipping all `'O'`s into `'X'`s in that surrounded region.",
      constraints: [
        "m == board.length",
        "n == board[i].length",
        "1 <= m, n <= 200",
        "board[i][j] is 'X' or 'O'.",
      ],
      solution:
        "Mark border-connected 'O' cells as safe using DFS/BFS from all border 'O's. Then flip all remaining 'O' cells to 'X' (they are surrounded), and restore the safe cells back to 'O'.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          board: [
            ["X", "X", "X", "X"],
            ["X", "O", "O", "X"],
            ["X", "X", "O", "X"],
            ["X", "O", "X", "X"],
          ],
        },
        expectedOutput: [
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "O", "X", "X"],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { board: [["X"]] },
        expectedOutput: [["X"]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { board: [["O"]] },
        expectedOutput: [["O"]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          board: [
            ["O", "O"],
            ["O", "O"],
          ],
        },
        expectedOutput: [
          ["O", "O"],
          ["O", "O"],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          board: [
            ["X", "X", "X"],
            ["X", "O", "X"],
            ["X", "X", "X"],
          ],
        },
        expectedOutput: [
          ["X", "X", "X"],
          ["X", "X", "X"],
          ["X", "X", "X"],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          board: [
            ["X", "O", "X"],
            ["O", "X", "O"],
            ["X", "O", "X"],
          ],
        },
        expectedOutput: [
          ["X", "O", "X"],
          ["O", "X", "O"],
          ["X", "O", "X"],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          board: [
            ["X", "X", "X", "X"],
            ["X", "O", "O", "X"],
            ["X", "O", "O", "X"],
            ["X", "X", "X", "X"],
          ],
        },
        expectedOutput: [
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
          ["X", "X", "X", "X"],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          board: [
            ["O", "X", "O"],
            ["X", "O", "X"],
            ["O", "X", "O"],
          ],
        },
        expectedOutput: [
          ["O", "X", "O"],
          ["X", "X", "X"],
          ["O", "X", "O"],
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def solve(self, board: List[List[str]]) -> None:\n        pass",
      methodName: "solve",
      parameterNames: ["board"],
    },
    hints: [
      {
        hintText:
          "An 'O' region is NOT surrounded if any of its cells touch the border. Think about which 'O' cells are safe from capture.",
        orderIndex: 0,
      },
      {
        hintText:
          "Start from all border 'O' cells and use DFS/BFS to mark all connected 'O' cells as safe. Then, any 'O' not marked safe is surrounded and should be flipped to 'X'.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "rotting-oranges",
      title: "Rotting Oranges",
      difficulty: "medium",
      category: "Graphs",
      description:
        "You are given an `m x n` `grid` where each cell can have one of three values:\n\n- `0` representing an empty cell,\n- `1` representing a fresh orange, or\n- `2` representing a rotten orange.\n\nEvery minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.\n\nReturn the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return `-1`.",
      constraints: [
        "m == grid.length",
        "n == grid[i].length",
        "1 <= m, n <= 10",
        "grid[i][j] is 0, 1, or 2.",
      ],
      solution:
        "Use multi-source BFS. Start by adding all rotten oranges to the queue. Each BFS level represents one minute. Process all current rotten oranges, rotting their fresh neighbors. Count fresh oranges and check if all are rotted at the end.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          grid: [
            [2, 1, 1],
            [1, 1, 0],
            [0, 1, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          grid: [
            [2, 1, 1],
            [0, 1, 1],
            [1, 0, 1],
          ],
        },
        expectedOutput: -1,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { grid: [[0, 2]] },
        expectedOutput: 0,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { grid: [[0]] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { grid: [[1]] },
        expectedOutput: -1,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { grid: [[2]] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          grid: [
            [2, 1],
            [1, 2],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { grid: [[2, 1, 1, 1, 1]] },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def orangesRotting(self, grid: List[List[int]]) -> int:\n        pass",
      methodName: "orangesRotting",
      parameterNames: ["grid"],
    },
    hints: [
      {
        hintText:
          "All rotten oranges spread simultaneously. This is a classic multi-source BFS problem.",
        orderIndex: 0,
      },
      {
        hintText:
          "Initialize a queue with all rotten orange positions. Process level by level (each level is one minute). Count fresh oranges at the start; if any remain after BFS, return -1.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "walls-and-gates",
      title: "Walls and Gates",
      difficulty: "medium",
      category: "Graphs",
      description:
        "You are given an `m x n` grid `rooms` initialized with these three possible values:\n\n- `-1` -- A wall or an obstacle.\n- `0` -- A gate.\n- `2147483647` -- Infinity means an empty room. We use the value `2^31 - 1 = 2147483647` to represent `INF` as you may assume that the distance to a gate is less than `2147483647`.\n\nFill each empty room with the distance to its nearest gate. If it is impossible to reach a gate, it should be filled with `INF`.",
      constraints: [
        "m == rooms.length",
        "n == rooms[i].length",
        "1 <= m, n <= 250",
        "rooms[i][j] is -1, 0, or 2147483647.",
      ],
      solution:
        "Use multi-source BFS starting from all gates simultaneously. Each BFS level increments the distance by 1. This naturally fills each empty room with its shortest distance to any gate.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          rooms: [
            [2147483647, -1, 0, 2147483647],
            [2147483647, 2147483647, 2147483647, -1],
            [2147483647, -1, 2147483647, -1],
            [0, -1, 2147483647, 2147483647],
          ],
        },
        expectedOutput: [
          [3, -1, 0, 1],
          [2, 2, 1, -1],
          [1, -1, 2, -1],
          [0, -1, 3, 4],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { rooms: [[-1]] },
        expectedOutput: [[-1]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { rooms: [[0]] },
        expectedOutput: [[0]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { rooms: [[2147483647]] },
        expectedOutput: [[2147483647]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          rooms: [
            [0, 2147483647],
            [2147483647, 2147483647],
          ],
        },
        expectedOutput: [
          [0, 1],
          [1, 2],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          rooms: [
            [0, -1],
            [-1, 2147483647],
          ],
        },
        expectedOutput: [
          [0, -1],
          [-1, 2147483647],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          rooms: [
            [0, 2147483647, 0],
            [2147483647, 2147483647, 2147483647],
            [0, 2147483647, 0],
          ],
        },
        expectedOutput: [
          [0, 1, 0],
          [1, 2, 1],
          [0, 1, 0],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { rooms: [[0, 2147483647, 2147483647, 2147483647, 0]] },
        expectedOutput: [[0, 1, 2, 1, 0]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def wallsAndGates(self, rooms: List[List[int]]) -> None:\n        pass",
      methodName: "wallsAndGates",
      parameterNames: ["rooms"],
    },
    hints: [
      {
        hintText:
          "Instead of BFS from each empty room to find the nearest gate, think about starting from all gates simultaneously.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use multi-source BFS: add all gate positions to the queue. Process level by level, updating empty rooms with the current distance. Rooms already visited will have a shorter or equal distance, so skip them.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "course-schedule",
      title: "Course Schedule",
      difficulty: "medium",
      category: "Graphs",
      description:
        "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`.\n\nFor example, the pair `[0, 1]`, indicates that to take course `0` you have to first take course `1`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.",
      constraints: [
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= 5000",
        "prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses",
        "All the pairs prerequisites[i] are unique.",
      ],
      solution:
        "This is cycle detection in a directed graph. Use topological sort (Kahn's algorithm with BFS or DFS with visited states). If a cycle exists, not all courses can be completed.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { numCourses: 2, prerequisites: [[1, 0]] },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          numCourses: 2,
          prerequisites: [
            [1, 0],
            [0, 1],
          ],
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { numCourses: 1, prerequisites: [] },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          numCourses: 3,
          prerequisites: [
            [0, 1],
            [1, 2],
          ],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          numCourses: 3,
          prerequisites: [
            [0, 1],
            [1, 2],
            [2, 0],
          ],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [1, 0],
            [2, 1],
            [3, 2],
          ],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { numCourses: 5, prerequisites: [] },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [0, 1],
            [2, 3],
            [1, 2],
            [3, 0],
          ],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n        pass",
      methodName: "canFinish",
      parameterNames: ["numCourses", "prerequisites"],
    },
    hints: [
      {
        hintText:
          "Model courses and prerequisites as a directed graph. When is it impossible to finish all courses?",
        orderIndex: 0,
      },
      {
        hintText:
          "The answer is impossible when there's a cycle in the prerequisite graph. Use topological sort (BFS with in-degrees or DFS with cycle detection) to check for cycles.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "course-schedule-ii",
      title: "Course Schedule II",
      difficulty: "medium",
      category: "Graphs",
      description:
        "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`.\n\nReturn the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.",
      constraints: [
        "1 <= numCourses <= 2000",
        "0 <= prerequisites.length <= numCourses * (numCourses - 1)",
        "prerequisites[i].length == 2",
        "0 <= ai, bi < numCourses",
        "ai != bi",
        "All the pairs [ai, bi] are distinct.",
      ],
      solution:
        "Use Kahn's algorithm (BFS topological sort). Build the adjacency list and in-degree counts. Start from nodes with in-degree 0, process them, and reduce neighbors' in-degrees. If all nodes are processed, return the order; otherwise return empty.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { numCourses: 2, prerequisites: [[1, 0]] },
        expectedOutput: [0, 1],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [1, 0],
            [2, 0],
            [3, 1],
            [3, 2],
          ],
        },
        expectedOutput: [0, 1, 2, 3],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { numCourses: 1, prerequisites: [] },
        expectedOutput: [0],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          numCourses: 2,
          prerequisites: [
            [1, 0],
            [0, 1],
          ],
        },
        expectedOutput: [],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { numCourses: 3, prerequisites: [] },
        expectedOutput: [0, 1, 2],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          numCourses: 3,
          prerequisites: [
            [2, 1],
            [1, 0],
          ],
        },
        expectedOutput: [0, 1, 2],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          numCourses: 3,
          prerequisites: [
            [0, 1],
            [1, 2],
            [2, 0],
          ],
        },
        expectedOutput: [],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          numCourses: 4,
          prerequisites: [
            [1, 0],
            [2, 1],
            [3, 2],
          ],
        },
        expectedOutput: [0, 1, 2, 3],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:\n        pass",
      methodName: "findOrder",
      parameterNames: ["numCourses", "prerequisites"],
    },
    hints: [
      {
        hintText:
          "This is an extension of Course Schedule. Instead of just detecting cycles, you need to produce the actual ordering.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use Kahn's algorithm: compute in-degrees, start with zero-in-degree nodes, and process them in BFS order. The BFS traversal order is a valid topological ordering.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "redundant-connection",
      title: "Redundant Connection",
      difficulty: "medium",
      category: "Graphs",
      description:
        "In this problem, a tree is an undirected graph that is connected and has no cycles.\n\nYou are given a graph that started as a tree with `n` nodes labeled from `1` to `n`, with one additional edge added. The added edge has two different vertices chosen from `1` to `n`, and is not an edge that already existed. The graph is given as an array `edges` of length `n` where `edges[i] = [ai, bi]` indicates that there is an edge between nodes `ai` and `bi` in the graph.\n\nReturn an edge that can be removed so that the resulting graph is a tree of `n` nodes. If there are multiple answers, return the answer that occurs last in the input.",
      constraints: [
        "n == edges.length",
        "3 <= n <= 1000",
        "edges[i].length == 2",
        "1 <= ai < bi <= edges.length",
        "ai != bi",
        "There are no repeated edges.",
        "The given graph is connected.",
      ],
      solution:
        "Use Union-Find (Disjoint Set Union). Process edges one by one. When an edge connects two nodes already in the same component, that edge creates a cycle and is the redundant one.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          edges: [
            [1, 2],
            [1, 3],
            [2, 3],
          ],
        },
        expectedOutput: [2, 3],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          edges: [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 4],
            [1, 5],
          ],
        },
        expectedOutput: [1, 4],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          edges: [
            [1, 2],
            [1, 3],
            [3, 4],
            [2, 4],
          ],
        },
        expectedOutput: [2, 4],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          edges: [
            [1, 2],
            [2, 3],
            [1, 3],
          ],
        },
        expectedOutput: [1, 3],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          edges: [
            [1, 3],
            [3, 4],
            [1, 2],
            [2, 4],
          ],
        },
        expectedOutput: [2, 4],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          edges: [
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [1, 5],
          ],
        },
        expectedOutput: [1, 5],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          edges: [
            [3, 4],
            [1, 2],
            [2, 4],
            [3, 5],
            [2, 3],
          ],
        },
        expectedOutput: [2, 3],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          edges: [
            [1, 2],
            [2, 3],
            [3, 1],
          ],
        },
        expectedOutput: [3, 1],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:\n        pass",
      methodName: "findRedundantConnection",
      parameterNames: ["edges"],
    },
    hints: [
      {
        hintText:
          "A tree with n nodes has exactly n-1 edges. Adding one more edge creates exactly one cycle. You need to find that edge.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use Union-Find. Process edges in order. When you try to union two nodes that are already in the same set, that edge is the redundant one creating the cycle.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "number-of-connected-components-in-an-undirected-graph",
      title: "Number of Connected Components in an Undirected Graph",
      difficulty: "medium",
      category: "Graphs",
      description:
        "You have a graph of `n` nodes. You are given an integer `n` and an array `edges` where `edges[i] = [ai, bi]` indicates that there is an edge between `ai` and `bi` in the graph.\n\nReturn the number of connected components in the graph.",
      constraints: [
        "1 <= n <= 2000",
        "1 <= edges.length <= 5000",
        "edges[i].length == 2",
        "0 <= ai <= bi < n",
        "ai != bi",
        "There are no repeated edges.",
      ],
      solution:
        "Use Union-Find or DFS/BFS. With Union-Find, process all edges and count the number of distinct roots. With DFS, count the number of traversals needed to visit all nodes.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [3, 4],
          ],
        },
        expectedOutput: 2,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
          ],
        },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { n: 1, edges: [] }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      {
        input: {
          n: 4,
          edges: [
            [0, 1],
            [2, 3],
          ],
        },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 3,
      },
      { input: { n: 3, edges: [] }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      {
        input: {
          n: 4,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          n: 6,
          edges: [
            [0, 1],
            [2, 3],
            [4, 5],
          ],
        },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          n: 3,
          edges: [
            [0, 1],
            [0, 2],
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
        "class Solution:\n    def countComponents(self, n: int, edges: List[List[int]]) -> int:\n        pass",
      methodName: "countComponents",
      parameterNames: ["n", "edges"],
    },
    hints: [
      {
        hintText:
          "This is a fundamental graph connectivity problem. Think about how to group connected nodes together.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use Union-Find: start with n components, and for each edge, union the two nodes. Each successful union decreases the component count by 1. Alternatively, use DFS and count the number of connected components.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "graph-valid-tree",
      title: "Graph Valid Tree",
      difficulty: "medium",
      category: "Graphs",
      description:
        "Given `n` nodes labeled from `0` to `n - 1` and a list of undirected edges (each edge is a pair of nodes), write a function to check whether these edges make up a valid tree.\n\nA valid tree has exactly `n - 1` edges and is fully connected (all nodes are reachable from any node).",
      constraints: [
        "1 <= n <= 2000",
        "0 <= edges.length <= 5000",
        "edges[i].length == 2",
        "0 <= ai, bi < n",
        "ai != bi",
        "There are no repeated edges.",
      ],
      solution:
        "A valid tree must satisfy two conditions: exactly n-1 edges, and the graph is connected. Use Union-Find to check both: if any edge creates a cycle (both nodes already connected), it's not a tree. After processing, check that there's exactly one component.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 4],
          ],
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [1, 3],
            [1, 4],
          ],
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { n: 1, edges: [] }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { n: 2, edges: [[0, 1]] }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      { input: { n: 2, edges: [] }, expectedOutput: false, isVisible: false, orderIndex: 4 },
      {
        input: {
          n: 4,
          edges: [
            [0, 1],
            [2, 3],
          ],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          n: 3,
          edges: [
            [0, 1],
            [1, 2],
          ],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          n: 4,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
          ],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def validTree(self, n: int, edges: List[List[int]]) -> bool:\n        pass",
      methodName: "validTree",
      parameterNames: ["n", "edges"],
    },
    hints: [
      {
        hintText:
          "A tree with n nodes has exactly n-1 edges. If the edge count is wrong, you can return false immediately.",
        orderIndex: 0,
      },
      {
        hintText:
          "Having n-1 edges is necessary but not sufficient (the graph could be disconnected). Use Union-Find to verify both that there are no cycles and that the graph is connected.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "word-ladder",
      title: "Word Ladder",
      difficulty: "hard",
      category: "Graphs",
      description:
        "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that:\n\n- Every adjacent pair of words differs by a single letter.\n- Every `si` for `1 <= i <= k` is in `wordList`. Note that `beginWord` does not need to be in `wordList`.\n- `sk == endWord`\n\nGiven two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or `0` if no such sequence exists.",
      constraints: [
        "1 <= beginWord.length <= 10",
        "endWord.length == beginWord.length",
        "1 <= wordList.length <= 5000",
        "wordList[i].length == beginWord.length",
        "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
        "beginWord != endWord",
        "All the words in wordList are unique.",
      ],
      solution:
        "Model as a graph where words are nodes and edges connect words differing by one letter. Use BFS from beginWord. To find neighbors efficiently, for each word generate all single-character wildcard patterns and group words by pattern.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
        },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { beginWord: "hit", endWord: "cog", wordList: ["hot", "dot", "dog", "lot", "log"] },
        expectedOutput: 0,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { beginWord: "a", endWord: "c", wordList: ["a", "b", "c"] },
        expectedOutput: 2,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { beginWord: "hot", endWord: "dog", wordList: ["hot", "dog"] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { beginWord: "hot", endWord: "dog", wordList: ["hot", "dot", "dog"] },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { beginWord: "ab", endWord: "cd", wordList: ["ab", "ad", "cd"] },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          beginWord: "cat",
          endWord: "fin",
          wordList: [
            "ion",
            "rev",
            "che",
            "ind",
            "lie",
            "wis",
            "oct",
            "ham",
            "jag",
            "pup",
            "ban",
            "fin",
          ],
        },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { beginWord: "abc", endWord: "abc", wordList: ["abc"] },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:\n        pass",
      methodName: "ladderLength",
      parameterNames: ["beginWord", "endWord", "wordList"],
    },
    hints: [
      {
        hintText:
          "Think of each word as a node in a graph. Two words are connected if they differ by exactly one letter. You need to find the shortest path from beginWord to endWord.",
        orderIndex: 0,
      },
      {
        hintText:
          "BFS gives the shortest path in an unweighted graph. But checking all pairs of words for one-letter difference is expensive. Instead, use wildcard patterns: for 'hot', generate '*ot', 'h*t', 'ho*' as intermediate states.",
        orderIndex: 1,
      },
      {
        hintText:
          "Build an adjacency map using wildcard patterns. For each word, generate all patterns and group words sharing the same pattern. Then BFS through these groups to find the shortest transformation.",
        orderIndex: 2,
      },
    ],
  },
];
