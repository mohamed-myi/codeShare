import type { ProblemFixture } from "./types.js";

export const intervalsProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "meeting-rooms",
      title: "Meeting Rooms",
      difficulty: "easy",
      category: "Intervals",
      description:
        "Given an array of meeting time `intervals` where `intervals[i] = [starti, endi]`, determine if a person could attend all meetings.\n\nReturn `true` if the person can attend all meetings without any overlap, `false` otherwise.",
      constraints: [
        "0 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti < endi <= 10^6",
      ],
      solution:
        "Sort intervals by start time. Iterate through adjacent pairs and check if any meeting starts before the previous one ends. If so, there is an overlap.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [0, 30],
            [5, 10],
            [15, 20],
          ],
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [7, 10],
            [2, 4],
          ],
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { intervals: [] }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      { input: { intervals: [[1, 5]] }, expectedOutput: true, isVisible: false, orderIndex: 3 },
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
          ],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          intervals: [
            [1, 3],
            [2, 4],
          ],
        },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          intervals: [
            [1, 5],
            [5, 10],
            [10, 15],
          ],
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [1, 10],
            [2, 3],
            [4, 5],
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
        "class Solution:\n    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:\n        pass",
      methodName: "canAttendMeetings",
      parameterNames: ["intervals"],
    },
    hints: [
      {
        hintText:
          "Sort the intervals by their start time, then check if any consecutive pair overlaps (the next meeting starts before the current one ends).",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "insert-interval",
      title: "Insert Interval",
      difficulty: "medium",
      category: "Intervals",
      description:
        "You are given an array of non-overlapping intervals `intervals` where `intervals[i] = [starti, endi]` represent the start and the end of the `i`th interval and `intervals` is sorted in ascending order by `starti`. You are also given an interval `newInterval = [start, end]` that represents the start and end of another interval.\n\nInsert `newInterval` into `intervals` such that `intervals` is still sorted in ascending order by `starti` and `intervals` still does not have any overlapping intervals (merge overlapping intervals if necessary).\n\nReturn `intervals` after the insertion.",
      constraints: [
        "0 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti <= endi <= 10^5",
        "intervals is sorted by starti in ascending order.",
        "newInterval.length == 2",
        "0 <= start <= end <= 10^5",
      ],
      solution:
        "Iterate through intervals. Add all intervals ending before the new interval starts. Merge all overlapping intervals with the new interval by taking min of starts and max of ends. Add the merged interval and all remaining intervals.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 3],
            [6, 9],
          ],
          newInterval: [2, 5],
        },
        expectedOutput: [
          [1, 5],
          [6, 9],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [3, 5],
            [6, 7],
            [8, 10],
            [12, 16],
          ],
          newInterval: [4, 8],
        },
        expectedOutput: [
          [1, 2],
          [3, 10],
          [12, 16],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { intervals: [], newInterval: [5, 7] },
        expectedOutput: [[5, 7]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { intervals: [[1, 5]], newInterval: [2, 3] },
        expectedOutput: [[1, 5]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { intervals: [[1, 5]], newInterval: [6, 8] },
        expectedOutput: [
          [1, 5],
          [6, 8],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { intervals: [[3, 5]], newInterval: [1, 2] },
        expectedOutput: [
          [1, 2],
          [3, 5],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { intervals: [[1, 5]], newInterval: [0, 6] },
        expectedOutput: [[0, 6]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [5, 6],
          ],
          newInterval: [3, 4],
        },
        expectedOutput: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:\n        pass",
      methodName: "insert",
      parameterNames: ["intervals", "newInterval"],
    },
    hints: [
      {
        hintText:
          "Process intervals in three phases: those entirely before the new interval, those overlapping with it, and those entirely after it.",
        orderIndex: 0,
      },
      {
        hintText:
          "For overlapping intervals, merge by taking the minimum start and maximum end. Add all non-overlapping intervals directly to the result.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "merge-intervals",
      title: "Merge Intervals",
      difficulty: "medium",
      category: "Intervals",
      description:
        "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
      constraints: [
        "1 <= intervals.length <= 10^4",
        "intervals[i].length == 2",
        "0 <= starti <= endi <= 10^4",
      ],
      solution:
        "Sort intervals by start time. Iterate through and merge consecutive intervals that overlap (current start <= previous end). Extend the end of the merged interval to the maximum of both ends.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        },
        expectedOutput: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [1, 4],
            [4, 5],
          ],
        },
        expectedOutput: [[1, 5]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          intervals: [
            [1, 4],
            [0, 4],
          ],
        },
        expectedOutput: [[0, 4]],
        isVisible: true,
        orderIndex: 2,
      },
      { input: { intervals: [[1, 3]] }, expectedOutput: [[1, 3]], isVisible: false, orderIndex: 3 },
      {
        input: {
          intervals: [
            [1, 4],
            [2, 3],
          ],
        },
        expectedOutput: [[1, 4]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
        expectedOutput: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          intervals: [
            [1, 10],
            [2, 3],
            [4, 5],
            [6, 7],
          ],
        },
        expectedOutput: [[1, 10]],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [2, 3],
            [4, 5],
            [6, 7],
            [8, 9],
            [1, 10],
          ],
        },
        expectedOutput: [[1, 10]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        pass",
      methodName: "merge",
      parameterNames: ["intervals"],
    },
    hints: [
      {
        hintText:
          "Sorting the intervals by start time makes it easy to identify overlapping intervals -- they will be adjacent in the sorted order.",
        orderIndex: 0,
      },
      {
        hintText:
          "After sorting, iterate and maintain a current merged interval. If the next interval overlaps (its start <= current end), extend the current end. Otherwise, close the current interval and start a new one.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "non-overlapping-intervals",
      title: "Non-overlapping Intervals",
      difficulty: "medium",
      category: "Intervals",
      description:
        "Given an array of intervals `intervals` where `intervals[i] = [starti, endi]`, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.\n\nNote that intervals which only touch at a point are non-overlapping. For example, `[1, 2]` and `[2, 3]` are non-overlapping.",
      constraints: [
        "1 <= intervals.length <= 10^5",
        "intervals[i].length == 2",
        "-5 * 10^4 <= starti < endi <= 5 * 10^4",
      ],
      solution:
        "Sort intervals by end time. Greedily keep the interval that ends earliest when there is an overlap (activity selection). Count the number of intervals that must be removed.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 3],
          ],
        },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [1, 2],
            [1, 2],
          ],
        },
        expectedOutput: 2,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [2, 3],
          ],
        },
        expectedOutput: 0,
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          intervals: [
            [1, 100],
            [11, 22],
            [1, 11],
            [2, 12],
          ],
        },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          intervals: [
            [0, 2],
            [1, 3],
            [2, 4],
            [3, 5],
            [4, 6],
          ],
        },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 4,
      },
      { input: { intervals: [[1, 2]] }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      {
        input: {
          intervals: [
            [-1, 0],
            [0, 1],
            [1, 2],
          ],
        },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [1, 5],
            [2, 3],
            [3, 4],
            [4, 5],
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
        "class Solution:\n    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:\n        pass",
      methodName: "eraseOverlapIntervals",
      parameterNames: ["intervals"],
    },
    hints: [
      {
        hintText:
          "This is equivalent to finding the maximum number of non-overlapping intervals (activity selection problem).",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort by end time. Greedily select intervals that do not overlap with the last selected one. The answer is total intervals minus the count of selected intervals.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "meeting-rooms-ii",
      title: "Meeting Rooms II",
      difficulty: "medium",
      category: "Intervals",
      description:
        "Given an array of meeting time `intervals` where `intervals[i] = [starti, endi]`, return the minimum number of conference rooms required.\n\nA meeting room is required for each meeting. If two meetings overlap, they need separate rooms. Meetings that end at the same time another starts do not overlap.",
      constraints: ["1 <= intervals.length <= 10^4", "0 <= starti < endi <= 10^6"],
      solution:
        "Separate start and end times into two sorted arrays. Use two pointers: when the next event is a start, increment rooms needed; when it is an end, decrement. Track the maximum rooms needed at any point.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [0, 30],
            [5, 10],
            [15, 20],
          ],
        },
        expectedOutput: 2,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [7, 10],
            [2, 4],
          ],
        },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          intervals: [
            [0, 5],
            [5, 10],
          ],
        },
        expectedOutput: 1,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { intervals: [[1, 5]] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      {
        input: {
          intervals: [
            [1, 5],
            [2, 6],
            [3, 7],
          ],
        },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [1, 2],
            [1, 2],
          ],
        },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          intervals: [
            [1, 3],
            [3, 5],
            [5, 7],
            [7, 9],
          ],
        },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [1, 10],
            [2, 5],
            [6, 8],
          ],
        },
        expectedOutput: 2,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def minMeetingRooms(self, intervals: List[List[int]]) -> int:\n        pass",
      methodName: "minMeetingRooms",
      parameterNames: ["intervals"],
    },
    hints: [
      {
        hintText:
          "Think of meeting starts and ends as events on a timeline. The number of rooms needed at any time equals the number of ongoing meetings.",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort starts and ends separately. Sweep through events with two pointers, incrementing on starts and decrementing on ends. Track the peak concurrent meetings.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "minimum-interval-to-include-each-query",
      title: "Minimum Interval to Include Each Query",
      difficulty: "hard",
      category: "Intervals",
      description:
        "You are given a 2D integer array `intervals`, where `intervals[i] = [lefti, righti]` describes the `i`th interval starting at `lefti` and ending at `righti` (inclusive). The size of an interval is defined as the number of integers it contains, or more formally `righti - lefti + 1`.\n\nYou are also given an integer array `queries`. The answer to the `j`th query is the size of the smallest interval `i` such that `lefti <= queries[j] <= righti`. If no such interval exists, the answer is `-1`.\n\nReturn an array containing the answers to the queries.",
      constraints: [
        "1 <= intervals.length <= 10^5",
        "1 <= queries.length <= 10^5",
        "intervals[i].length == 2",
        "1 <= lefti <= righti <= 10^7",
        "1 <= queries[j] <= 10^7",
      ],
      solution:
        "Sort intervals by start. Process queries in sorted order, using a min-heap keyed by interval size. For each query, add all intervals starting <= query. Remove expired intervals (end < query). The heap top gives the smallest valid interval.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          intervals: [
            [1, 4],
            [2, 4],
            [3, 6],
            [4, 4],
          ],
          queries: [2, 3, 4, 5],
        },
        expectedOutput: [3, 3, 1, 4],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          intervals: [
            [2, 3],
            [2, 5],
            [1, 8],
            [20, 25],
          ],
          queries: [2, 19, 5, 22],
        },
        expectedOutput: [2, -1, 4, 6],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { intervals: [[1, 1]], queries: [1] },
        expectedOutput: [1],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { intervals: [[1, 1]], queries: [2] },
        expectedOutput: [-1],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { intervals: [[1, 5]], queries: [1, 3, 5, 6] },
        expectedOutput: [5, 5, 5, -1],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          intervals: [
            [1, 3],
            [2, 4],
          ],
          queries: [2],
        },
        expectedOutput: [3],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          intervals: [
            [1, 10],
            [2, 3],
            [5, 6],
          ],
          queries: [2, 5, 8],
        },
        expectedOutput: [2, 2, 10],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          intervals: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
          queries: [7],
        },
        expectedOutput: [-1],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:\n        pass",
      methodName: "minInterval",
      parameterNames: ["intervals", "queries"],
    },
    hints: [
      {
        hintText:
          "Processing queries in sorted order lets you efficiently manage which intervals are active using a sweep-line approach.",
        orderIndex: 0,
      },
      {
        hintText:
          "Sort intervals by left endpoint. Sort queries (while preserving original indices). For each query, push all intervals whose left <= query onto a min-heap keyed by size.",
        orderIndex: 1,
      },
      {
        hintText:
          "Pop from the heap any intervals whose right < query (expired). The top of the heap is the smallest interval containing the query. Use a hash map to store results by original query index.",
        orderIndex: 2,
      },
    ],
  },
];
