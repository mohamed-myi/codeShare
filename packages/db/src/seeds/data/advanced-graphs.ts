import type { ProblemFixture } from "./types.js";

export const advancedGraphsProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "reconstruct-itinerary",
      title: "Reconstruct Itinerary",
      difficulty: "hard",
      category: "Advanced Graphs",
      description:
        'You are given a list of airline `tickets` where `tickets[i] = [fromi, toi]` represent the departure and the arrival airports of one flight. Reconstruct the itinerary in order and return it.\n\nAll of the tickets belong to a man who departs from `"JFK"`, thus, the itinerary must begin with `"JFK"`. If there are multiple valid itineraries, you should return the itinerary that has the smallest lexical order when read as a single string.\n\nYou may assume all tickets form at least one valid itinerary. You must use all the tickets once and only once.',
      constraints: [
        "1 <= tickets.length <= 300",
        "tickets[i].length == 2",
        "fromi.length == 3",
        "toi.length == 3",
        "fromi and toi consist of uppercase English letters.",
        'fromi != toi',
      ],
      solution: "Build an adjacency list with destinations sorted in reverse lexical order (so we can pop from the end for smallest first). Use Hierholzer's algorithm for Eulerian path: DFS from JFK, appending to result on backtrack, then reverse the result.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { tickets: [["MUC", "LHR"], ["JFK", "MUC"], ["SFO", "SJC"], ["LHR", "SFO"]] }, expectedOutput: ["JFK", "MUC", "LHR", "SFO", "SJC"], isVisible: true, orderIndex: 0 },
      { input: { tickets: [["JFK", "SFO"], ["JFK", "ATL"], ["SFO", "ATL"], ["ATL", "JFK"], ["ATL", "SFO"]] }, expectedOutput: ["JFK", "ATL", "JFK", "SFO", "ATL", "SFO"], isVisible: true, orderIndex: 1 },
      { input: { tickets: [["JFK", "A"], ["A", "JFK"]] }, expectedOutput: ["JFK", "A", "JFK"], isVisible: true, orderIndex: 2 },
      { input: { tickets: [["JFK", "KUL"], ["JFK", "NRT"], ["NRT", "JFK"]] }, expectedOutput: ["JFK", "NRT", "JFK", "KUL"], isVisible: false, orderIndex: 3 },
      { input: { tickets: [["JFK", "AAA"]] }, expectedOutput: ["JFK", "AAA"], isVisible: false, orderIndex: 4 },
      { input: { tickets: [["JFK", "BBB"], ["JFK", "AAA"], ["AAA", "JFK"]] }, expectedOutput: ["JFK", "AAA", "JFK", "BBB"], isVisible: false, orderIndex: 5 },
      { input: { tickets: [["JFK", "A"], ["A", "B"], ["B", "JFK"], ["JFK", "C"]] }, expectedOutput: ["JFK", "A", "B", "JFK", "C"], isVisible: false, orderIndex: 6 },
      { input: { tickets: [["JFK", "A"], ["A", "B"], ["B", "C"], ["C", "A"], ["A", "JFK"], ["JFK", "D"]] }, expectedOutput: ["JFK", "A", "B", "C", "A", "JFK", "D"], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def findItinerary(self, tickets: List[List[str]]) -> List[str]:\n        pass",
      methodName: "findItinerary",
      parameterNames: ["tickets"],
    },
    hints: [
      { hintText: "This is an Eulerian path problem. Every ticket (edge) must be used exactly once. Think about which graph traversal algorithm finds a path that uses every edge.", orderIndex: 0 },
      { hintText: "Build a graph with sorted adjacency lists. Use DFS, always visiting the lexicographically smallest destination first.", orderIndex: 1 },
      { hintText: "Use Hierholzer's algorithm: DFS from JFK, and when you can't go further, add the current airport to the front of the result. This handles the backtracking needed for Eulerian paths.", orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "min-cost-to-connect-all-points",
      title: "Min Cost to Connect All Points",
      difficulty: "medium",
      category: "Advanced Graphs",
      description:
        "You are given an array `points` representing integer coordinates of some points on a 2D-plane, where `points[i] = [xi, yi]`.\n\nThe cost of connecting two points `[xi, yi]` and `[xj, yj]` is the Manhattan distance between them: `|xi - xj| + |yi - yj|`, where `|val|` denotes the absolute value of `val`.\n\nReturn the minimum cost to make all points connected. All points are connected if there is exactly one simple path between any two points.",
      constraints: [
        "1 <= points.length <= 1000",
        "-10^6 <= xi, yi <= 10^6",
        "All pairs (xi, yi) are distinct.",
      ],
      solution: "This is a Minimum Spanning Tree problem. Use Prim's algorithm with a min-heap: start from any node, greedily add the cheapest edge to an unvisited node. Or use Kruskal's with Union-Find on all edges sorted by weight.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { points: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]] }, expectedOutput: 20, isVisible: true, orderIndex: 0 },
      { input: { points: [[3, 12], [-2, 5], [-4, 1]] }, expectedOutput: 18, isVisible: true, orderIndex: 1 },
      { input: { points: [[0, 0]] }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { points: [[0, 0], [1, 1]] }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      { input: { points: [[-1000000, -1000000], [1000000, 1000000]] }, expectedOutput: 4000000, isVisible: false, orderIndex: 4 },
      { input: { points: [[0, 0], [1, 0], [0, 1], [1, 1]] }, expectedOutput: 3, isVisible: false, orderIndex: 5 },
      { input: { points: [[0, 0], [5, 0], [0, 5], [5, 5]] }, expectedOutput: 15, isVisible: false, orderIndex: 6 },
      { input: { points: [[0, 0], [2, 0], [4, 0], [6, 0]] }, expectedOutput: 6, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def minCostConnectPoints(self, points: List[List[int]]) -> int:\n        pass",
      methodName: "minCostConnectPoints",
      parameterNames: ["points"],
    },
    hints: [
      { hintText: "This is a Minimum Spanning Tree problem on a complete graph where edge weights are Manhattan distances.", orderIndex: 0 },
      { hintText: "Use Prim's algorithm: start from any point, use a min-heap to always add the cheapest edge to an unvisited point. Continue until all points are connected.", orderIndex: 1 },
    ],
  },
  {
    problem: {
      slug: "network-delay-time",
      title: "Network Delay Time",
      difficulty: "medium",
      category: "Advanced Graphs",
      description:
        "You are given a network of `n` nodes, labeled from `1` to `n`. You are also given `times`, a list of travel times as directed edges `times[i] = (ui, vi, wi)`, where `ui` is the source node, `vi` is the target node, and `wi` is the time it takes for a signal to travel from source to target.\n\nWe will send a signal from a given node `k`. Return the minimum time it takes for all of the `n` nodes to receive the signal. If it is impossible for all the `n` nodes to receive the signal, return `-1`.",
      constraints: [
        "1 <= k <= n <= 100",
        "1 <= times.length <= 6000",
        "times[i].length == 3",
        "1 <= ui, vi <= n",
        "ui != vi",
        "0 <= wi <= 100",
        "All the pairs (ui, vi) are unique. (i.e., no multiple edges.)",
      ],
      solution: "Use Dijkstra's algorithm from node k. Compute shortest paths to all nodes. The answer is the maximum shortest path distance. If any node is unreachable, return -1.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { times: [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n: 4, k: 2 }, expectedOutput: 2, isVisible: true, orderIndex: 0 },
      { input: { times: [[1, 2, 1]], n: 2, k: 1 }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { times: [[1, 2, 1]], n: 2, k: 2 }, expectedOutput: -1, isVisible: true, orderIndex: 2 },
      { input: { times: [[1, 2, 1], [2, 3, 2], [1, 3, 4]], n: 3, k: 1 }, expectedOutput: 3, isVisible: false, orderIndex: 3 },
      { input: { times: [[1, 2, 1], [2, 1, 1]], n: 2, k: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { times: [[1, 2, 1], [2, 3, 1], [3, 1, 1]], n: 3, k: 1 }, expectedOutput: 2, isVisible: false, orderIndex: 5 },
      { input: { times: [[1, 2, 5], [1, 3, 2], [3, 2, 1]], n: 3, k: 1 }, expectedOutput: 3, isVisible: false, orderIndex: 6 },
      { input: { times: [[1, 2, 1]], n: 3, k: 1 }, expectedOutput: -1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:\n        pass",
      methodName: "networkDelayTime",
      parameterNames: ["times", "n", "k"],
    },
    hints: [
      { hintText: "This is a single-source shortest path problem. You need to find the shortest time to reach every node from node k.", orderIndex: 0 },
      { hintText: "Use Dijkstra's algorithm with a min-heap. After computing shortest paths to all reachable nodes, the answer is the maximum distance. If any node is unreachable, return -1.", orderIndex: 1 },
    ],
  },
  {
    problem: {
      slug: "swim-in-rising-water",
      title: "Swim in Rising Water",
      difficulty: "hard",
      category: "Advanced Graphs",
      description:
        "You are given an `n x n` integer matrix `grid` where each value `grid[i][j]` represents the elevation at that point `(i, j)`.\n\nThe rain starts to fall. At time `t`, the depth of the water everywhere is `t`. You can swim from a square to another 4-directionally adjacent square if and only if the elevation of both squares individually are at most `t`. You can swim infinite distances in zero time. Of course, you must stay within the boundaries of the grid during your swim.\n\nReturn the least time until you can reach the bottom right square `(n - 1, n - 1)` starting from the top left square `(0, 0)`.",
      constraints: [
        "n == grid.length",
        "n == grid[i].length",
        "1 <= n <= 50",
        "0 <= grid[i][j] < n^2",
        "Each value grid[i][j] is unique.",
      ],
      solution: "Use a modified Dijkstra's algorithm or binary search + BFS. With Dijkstra, use a min-heap where the priority is the maximum elevation along the path. The answer is the minimum maximum-elevation path from (0,0) to (n-1,n-1).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { grid: [[0, 2], [1, 3]] }, expectedOutput: 3, isVisible: true, orderIndex: 0 },
      {
        input: {
          grid: [
            [0, 1, 2, 3, 4],
            [24, 23, 22, 21, 5],
            [12, 13, 14, 15, 16],
            [11, 17, 18, 19, 20],
            [10, 9, 8, 7, 6],
          ],
        },
        expectedOutput: 16,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { grid: [[0]] }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      {
        input: {
          grid: [
            [0, 3, 5],
            [1, 2, 8],
            [4, 6, 7],
          ],
        },
        expectedOutput: 7,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          grid: [
            [0, 1],
            [2, 3],
          ],
        },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          grid: [
            [3, 2],
            [0, 1],
          ],
        },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          grid: [
            [0, 7, 3],
            [6, 8, 2],
            [5, 4, 1],
          ],
        },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          grid: [
            [0, 1, 2, 3],
            [15, 14, 13, 4],
            [8, 9, 10, 5],
            [7, 11, 12, 6],
          ],
        },
        expectedOutput: 6,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def swimInWater(self, grid: List[List[int]]) -> int:\n        pass",
      methodName: "swimInWater",
      parameterNames: ["grid"],
    },
    hints: [
      { hintText: "The key insight is that you want to minimize the maximum elevation along any path from (0,0) to (n-1,n-1).", orderIndex: 0 },
      { hintText: "One approach: binary search on time t, then BFS/DFS to check if a path exists using only cells with elevation <= t.", orderIndex: 1 },
      { hintText: "A more elegant approach: use Dijkstra's algorithm where the 'distance' to a cell is the maximum elevation encountered on the path to it. Use a min-heap to always expand the cell with the smallest maximum elevation.", orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "alien-dictionary",
      title: "Alien Dictionary",
      difficulty: "hard",
      category: "Advanced Graphs",
      description:
        'There is a new alien language that uses the English alphabet. However, the order of the letters is unknown to you.\n\nYou are given a list of strings `words` from the alien language\'s dictionary, where the strings in `words` are sorted lexicographically by the rules of this new language.\n\nDerive the order of letters in this language. If the order is invalid, return `""`. If there are multiple valid orderings, return any of them.',
      constraints: [
        "1 <= words.length <= 100",
        "1 <= words[i].length <= 100",
        "words[i] consists of only lowercase English letters.",
      ],
      solution: "Compare adjacent words to extract ordering constraints (directed edges). Build a directed graph and perform topological sort. If a cycle exists, the ordering is invalid. Handle the edge case where a longer word comes before its prefix.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { words: ["wrt", "wrf", "er", "ett", "rftt"] }, expectedOutput: "wertf", isVisible: true, orderIndex: 0 },
      { input: { words: ["z", "x"] }, expectedOutput: "zx", isVisible: true, orderIndex: 1 },
      { input: { words: ["z", "x", "z"] }, expectedOutput: "", isVisible: true, orderIndex: 2 },
      { input: { words: ["abc", "ab"] }, expectedOutput: "", isVisible: false, orderIndex: 3 },
      { input: { words: ["a"] }, expectedOutput: "a", isVisible: false, orderIndex: 4 },
      { input: { words: ["z", "z"] }, expectedOutput: "z", isVisible: false, orderIndex: 5 },
      { input: { words: ["ab", "ac"] }, expectedOutput: "abc", isVisible: false, orderIndex: 6 },
      { input: { words: ["a", "b", "c"] }, expectedOutput: "abc", isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def alienOrder(self, words: List[str]) -> str:\n        pass",
      methodName: "alienOrder",
      parameterNames: ["words"],
    },
    hints: [
      { hintText: "Compare each pair of adjacent words. The first position where they differ gives you an ordering constraint between two letters.", orderIndex: 0 },
      { hintText: "Build a directed graph from these constraints. Use topological sort to determine the order. Watch out for the edge case where a longer word comes before its prefix (e.g., 'abc' before 'ab').", orderIndex: 1 },
      { hintText: "Use Kahn's algorithm (BFS topological sort) for cycle detection. If the result doesn't include all unique letters, there's a cycle and the ordering is invalid.", orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "cheapest-flights-within-k-stops",
      title: "Cheapest Flights Within K Stops",
      difficulty: "medium",
      category: "Advanced Graphs",
      description:
        "There are `n` cities connected by some number of flights. You are given an array `flights` where `flights[i] = [fromi, toi, pricei]` indicates that there is a flight from city `fromi` to city `toi` with cost `pricei`.\n\nYou are also given three integers `src`, `dst`, and `k`, return the cheapest price from `src` to `dst` with at most `k` stops. If there is no such route, return `-1`.",
      constraints: [
        "1 <= n <= 100",
        "0 <= flights.length <= (n * (n - 1) / 2)",
        "flights[i].length == 3",
        "0 <= fromi, toi < n",
        "fromi != toi",
        "1 <= pricei <= 10^4",
        "There will not be any multiple flights between two cities.",
        "0 <= src, dst, k < n",
        "src != dst",
      ],
      solution: "Use Bellman-Ford algorithm with at most k+1 relaxation rounds (k stops = k+1 edges). In each round, relax all edges using the previous round's distances to avoid using more stops than allowed.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src: 0, dst: 3, k: 1 }, expectedOutput: 700, isVisible: true, orderIndex: 0 },
      { input: { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 1 }, expectedOutput: 200, isVisible: true, orderIndex: 1 },
      { input: { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 0 }, expectedOutput: 500, isVisible: true, orderIndex: 2 },
      { input: { n: 2, flights: [[0, 1, 100]], src: 0, dst: 1, k: 0 }, expectedOutput: 100, isVisible: false, orderIndex: 3 },
      { input: { n: 3, flights: [[0, 1, 100]], src: 0, dst: 2, k: 1 }, expectedOutput: -1, isVisible: false, orderIndex: 4 },
      { input: { n: 4, flights: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 100]], src: 0, dst: 3, k: 1 }, expectedOutput: 100, isVisible: false, orderIndex: 5 },
      { input: { n: 4, flights: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 100]], src: 0, dst: 3, k: 2 }, expectedOutput: 3, isVisible: false, orderIndex: 6 },
      { input: { n: 5, flights: [[0, 1, 5], [1, 2, 5], [0, 3, 2], [3, 1, 2], [1, 4, 1], [4, 2, 1]], src: 0, dst: 2, k: 2 }, expectedOutput: 7, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:\n        pass",
      methodName: "findCheapestPrice",
      parameterNames: ["n", "flights", "src", "dst", "k"],
    },
    hints: [
      { hintText: "Standard Dijkstra doesn't work well here because the constraint is on the number of stops, not just the cost. Think about an algorithm that processes edges layer by layer.", orderIndex: 0 },
      { hintText: "Use Bellman-Ford with k+1 iterations. In each iteration, relax all edges. Use a copy of the previous iteration's distances to avoid chain-relaxation within the same iteration.", orderIndex: 1 },
    ],
  },
];
