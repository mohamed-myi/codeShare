import type { ProblemFixture } from "./types.js";

export const heapProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "kth-largest-element-in-a-stream",
      title: "Kth Largest Element in a Stream",
      difficulty: "easy",
      category: "Heap / Priority Queue",
      description:
        "Design a class to find the `k`th largest element in a stream. Note that it is the `k`th largest element in the sorted order, not the `k`th distinct element.\n\nImplement `KthLargest` class:\n\n- `KthLargest(int k, int[] nums)` Initializes the object with the integer `k` and the stream of integers `nums`.\n- `int add(int val)` Appends the integer `val` to the stream and returns the element representing the `k`th largest element in the stream.",
      constraints: [
        "1 <= k <= 10^4",
        "0 <= nums.length <= 10^4",
        "-10^4 <= nums[i] <= 10^4",
        "-10^4 <= val <= 10^4",
        "At most 10^4 calls will be made to add.",
        "It is guaranteed that there will be at least k elements in the array when you search for the kth element.",
      ],
      solution:
        "Maintain a min-heap of size k. When adding a value, push it onto the heap and pop if the size exceeds k. The top of the heap is always the kth largest element.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { k: 3, nums: [4, 5, 8, 2], val: 3 },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { k: 3, nums: [4, 5, 8, 2], val: 5 },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { k: 3, nums: [4, 5, 8, 2], val: 10 },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { k: 1, nums: [], val: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { k: 1, nums: [2], val: 3 }, expectedOutput: 3, isVisible: false, orderIndex: 4 },
      { input: { k: 2, nums: [0], val: -1 }, expectedOutput: -1, isVisible: false, orderIndex: 5 },
      {
        input: { k: 3, nums: [4, 5, 8, 2], val: 9 },
        expectedOutput: 5,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { k: 2, nums: [1, 1, 1], val: 1 },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class KthLargest:\n    def __init__(self, k: int, nums: List[int]):\n        pass\n\n    def add(self, val: int) -> int:\n        pass",
      methodName: "add",
      parameterNames: ["val"],
    },
    hints: [
      {
        hintText:
          "Think about which heap variant (min or max) lets you efficiently track the kth largest. A min-heap of size k keeps the kth largest at the top.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "last-stone-weight",
      title: "Last Stone Weight",
      difficulty: "easy",
      category: "Heap / Priority Queue",
      description:
        "You are given an array of integers `stones` where `stones[i]` is the weight of the `i`th stone.\n\nWe are playing a game with the stones. On each turn, we choose the heaviest two stones and smash them together. Suppose the heaviest two stones have weights `x` and `y` with `x <= y`. The result of this smash is:\n\n- If `x == y`, both stones are destroyed.\n- If `x != y`, the stone of weight `x` is destroyed, and the stone of weight `y` has new weight `y - x`.\n\nAt the end of the game, there is at most one stone left.\n\nReturn the weight of the last remaining stone. If there are no stones left, return `0`.",
      constraints: ["1 <= stones.length <= 30", "1 <= stones[i] <= 1000"],
      solution:
        "Use a max-heap. Repeatedly extract the two largest stones, compute the difference, and push it back if non-zero. Return the last remaining element or 0.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      { input: { stones: [2, 7, 4, 1, 8, 1] }, expectedOutput: 1, isVisible: true, orderIndex: 0 },
      { input: { stones: [1] }, expectedOutput: 1, isVisible: true, orderIndex: 1 },
      { input: { stones: [2, 2] }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { stones: [10, 4, 2, 10] }, expectedOutput: 2, isVisible: false, orderIndex: 3 },
      { input: { stones: [3, 7, 2] }, expectedOutput: 2, isVisible: false, orderIndex: 4 },
      { input: { stones: [1, 1, 1, 1] }, expectedOutput: 0, isVisible: false, orderIndex: 5 },
      { input: { stones: [1, 2, 3, 4, 5] }, expectedOutput: 1, isVisible: false, orderIndex: 6 },
      { input: { stones: [1000] }, expectedOutput: 1000, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def lastStoneWeight(self, stones: List[int]) -> int:\n        pass",
      methodName: "lastStoneWeight",
      parameterNames: ["stones"],
    },
    hints: [
      {
        hintText:
          "You need to repeatedly find and remove the two largest elements. A max-heap (or negated min-heap in Python) is ideal for this.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "k-closest-points-to-origin",
      title: "K Closest Points to Origin",
      difficulty: "medium",
      category: "Heap / Priority Queue",
      description:
        "Given an array of `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane and an integer `k`, return the `k` closest points to the origin `(0, 0)`.\n\nThe distance between two points on the X-Y plane is the Euclidean distance (i.e., `sqrt(x1^2 + y1^2)`).\n\nYou may return the answer in any order. The answer is guaranteed to be unique (except for the order that it is in).",
      constraints: ["1 <= k <= points.length <= 10^4", "-10^4 <= xi, yi <= 10^4"],
      solution:
        "Use a max-heap of size k keyed by distance. For each point, push it onto the heap; if the heap exceeds size k, pop the farthest point. The remaining k points are the closest.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          points: [
            [1, 3],
            [-2, 2],
          ],
          k: 1,
        },
        expectedOutput: [[-2, 2]],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          points: [
            [3, 3],
            [5, -1],
            [-2, 4],
          ],
          k: 2,
        },
        expectedOutput: [
          [3, 3],
          [-2, 4],
        ],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          points: [
            [0, 0],
            [1, 1],
          ],
          k: 1,
        },
        expectedOutput: [[0, 0]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          points: [
            [1, 0],
            [0, 1],
          ],
          k: 2,
        },
        expectedOutput: [
          [1, 0],
          [0, 1],
        ],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          points: [
            [2, 2],
            [2, 2],
            [3, 3],
          ],
          k: 2,
        },
        expectedOutput: [
          [2, 2],
          [2, 2],
        ],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          points: [
            [-1, -1],
            [1, 1],
            [2, 2],
          ],
          k: 1,
        },
        expectedOutput: [[-1, -1]],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          points: [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
          ],
          k: 4,
        },
        expectedOutput: [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { points: [[10, 10]], k: 1 },
        expectedOutput: [[10, 10]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:\n        pass",
      methodName: "kClosest",
      parameterNames: ["points", "k"],
    },
    hints: [
      {
        hintText:
          "You don't need to take the square root to compare distances. Comparing x^2 + y^2 is sufficient.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a max-heap of size k. For each point, push it onto the heap. If the size exceeds k, pop the farthest point. The remaining points are the k closest.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "kth-largest-element-in-an-array",
      title: "Kth Largest Element in an Array",
      difficulty: "medium",
      category: "Heap / Priority Queue",
      description:
        "Given an integer array `nums` and an integer `k`, return the `k`th largest element in the array.\n\nNote that it is the `k`th largest element in the sorted order, not the `k`th distinct element.\n\nCan you solve it without sorting?",
      constraints: ["1 <= k <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
      solution:
        "Use a min-heap of size k, or use Quickselect (partitioning like quicksort) targeting the (n-k)th index for average O(n) time.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { nums: [3, 2, 1, 5, 6, 4], k: 2 },
        expectedOutput: 5,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { nums: [1], k: 1 }, expectedOutput: 1, isVisible: true, orderIndex: 2 },
      {
        input: { nums: [7, 6, 5, 4, 3, 2, 1], k: 5 },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { nums: [1, 2, 3, 4, 5], k: 1 },
        expectedOutput: 5,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { nums: [1, 2, 3, 4, 5], k: 5 },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 5,
      },
      { input: { nums: [2, 2, 2, 2], k: 2 }, expectedOutput: 2, isVisible: false, orderIndex: 6 },
      {
        input: { nums: [-1, -2, -3, -4], k: 1 },
        expectedOutput: -1,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def findKthLargest(self, nums: List[int], k: int) -> int:\n        pass",
      methodName: "findKthLargest",
      parameterNames: ["nums", "k"],
    },
    hints: [
      {
        hintText:
          "A min-heap of size k can efficiently track the k largest elements. The top of the heap is the kth largest.",
        orderIndex: 0,
      },
      {
        hintText:
          "For an O(n) average approach, consider Quickselect: partition the array like quicksort but only recurse into the side that contains the target index.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "task-scheduler",
      title: "Task Scheduler",
      difficulty: "medium",
      category: "Heap / Priority Queue",
      description:
        "You are given an array of CPU tasks, each represented by letters A to Z, and a cooling interval `n`. Each cycle or interval allows the completion of one task. Tasks can be completed in any order, but there's a constraint: identical tasks must be separated by at least `n` intervals due to cooling time.\n\nReturn the minimum number of intervals the CPU will take to finish all the given tasks.",
      constraints: [
        "1 <= tasks.length <= 10^4",
        "tasks[i] is an uppercase English letter.",
        "0 <= n <= 100",
      ],
      solution:
        "Count task frequencies. Use a max-heap to always schedule the most frequent task. Use a cooldown queue to track tasks waiting for their cooldown period. Each time step, pop from the heap, decrement, and add to the cooldown queue with a ready time.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 2 },
        expectedOutput: 8,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { tasks: ["A", "C", "A", "B", "D", "B"], n: 1 },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B"], n: 0 },
        expectedOutput: 6,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { tasks: ["A"], n: 0 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      {
        input: { tasks: ["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], n: 1 },
        expectedOutput: 12,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { tasks: ["A", "B", "C", "D", "E", "F"], n: 2 },
        expectedOutput: 6,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { tasks: ["A", "A", "A", "B", "B", "B", "C", "C", "C"], n: 2 },
        expectedOutput: 9,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { tasks: ["A", "A"], n: 5 }, expectedOutput: 7, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def leastInterval(self, tasks: List[str], n: int) -> int:\n        pass",
      methodName: "leastInterval",
      parameterNames: ["tasks", "n"],
    },
    hints: [
      {
        hintText:
          "Start by counting how many times each task appears. The most frequent task drives the schedule length.",
        orderIndex: 0,
      },
      {
        hintText:
          "Use a max-heap to always pick the task with the highest remaining count. After scheduling a task, place it in a cooldown queue that tracks when it becomes available again.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "design-twitter",
      title: "Design Twitter",
      difficulty: "medium",
      category: "Heap / Priority Queue",
      description:
        "Design a simplified version of Twitter where users can post tweets, follow/unfollow another user, and get the 10 most recent tweets in the user's news feed.\n\nImplement the `Twitter` class:\n\n- `Twitter()` Initializes your twitter object.\n- `void postTweet(int userId, int tweetId)` Composes a new tweet with ID `tweetId` by the user `userId`. Each call to this function will be made with a unique `tweetId`.\n- `List<int> getNewsFeed(int userId)` Retrieves the 10 most recent tweet IDs in the user's news feed. Each item in the news feed must be posted by users who the user followed or by the user themself. Tweets must be ordered from most recent to least recent.\n- `void follow(int followerId, int followeeId)` The user with ID `followerId` started following the user with ID `followeeId`.\n- `void unfollow(int followerId, int followeeId)` The user with ID `followerId` started unfollowing the user with ID `followeeId`.",
      constraints: [
        "1 <= userId, followerId, followeeId <= 500",
        "0 <= tweetId <= 10^4",
        "All the tweets have unique IDs.",
        "At most 3 * 10^4 calls will be made to postTweet, getNewsFeed, follow, and unfollow.",
      ],
      solution:
        "Use a hash map for follow relationships and a list of (timestamp, tweetId) per user. For getNewsFeed, merge tweets from the user and all followees using a max-heap keyed by timestamp, extracting the top 10.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: { actions: ["postTweet", "getNewsFeed"], params: [[1, 5], [1]] },
        expectedOutput: [null, [5]],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          actions: ["postTweet", "follow", "postTweet", "getNewsFeed"],
          params: [[1, 5], [1, 2], [2, 6], [1]],
        },
        expectedOutput: [null, null, null, [6, 5]],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          actions: ["postTweet", "follow", "postTweet", "unfollow", "getNewsFeed"],
          params: [[1, 5], [1, 2], [2, 6], [1, 2], [1]],
        },
        expectedOutput: [null, null, null, null, [5]],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { actions: ["getNewsFeed"], params: [[1]] },
        expectedOutput: [[]],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          actions: ["postTweet", "postTweet", "getNewsFeed"],
          params: [[1, 1], [1, 2], [1]],
        },
        expectedOutput: [null, null, [2, 1]],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { actions: ["follow", "getNewsFeed"], params: [[1, 2], [1]] },
        expectedOutput: [null, []],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          actions: ["postTweet", "follow", "getNewsFeed", "unfollow", "getNewsFeed"],
          params: [[2, 10], [1, 2], [1], [1, 2], [1]],
        },
        expectedOutput: [null, null, [10], null, []],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          actions: ["postTweet", "postTweet", "postTweet", "getNewsFeed"],
          params: [[1, 1], [2, 2], [1, 3], [1]],
        },
        expectedOutput: [null, null, null, [3, 1]],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Twitter:\n    def __init__(self):\n        pass\n\n    def postTweet(self, userId: int, tweetId: int) -> None:\n        pass\n\n    def getNewsFeed(self, userId: int) -> List[int]:\n        pass\n\n    def follow(self, followerId: int, followeeId: int) -> None:\n        pass\n\n    def unfollow(self, followerId: int, followeeId: int) -> None:\n        pass",
      methodName: "getNewsFeed",
      parameterNames: ["userId"],
    },
    hints: [
      {
        hintText:
          "Think about what data structures you need: a way to track who follows whom, and a way to store tweets with timestamps.",
        orderIndex: 0,
      },
      {
        hintText:
          "For the news feed, you need to merge sorted lists from multiple users. A heap (priority queue) is perfect for k-way merge by timestamp.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "find-median-from-data-stream",
      title: "Find Median from Data Stream",
      difficulty: "hard",
      category: "Heap / Priority Queue",
      description:
        "The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value, and the median is the mean of the two middle values.\n\nImplement the `MedianFinder` class:\n\n- `MedianFinder()` initializes the `MedianFinder` object.\n- `void addNum(int num)` adds the integer `num` from the data stream to the data structure.\n- `double findMedian()` returns the median of all elements so far. Answers within `10^-5` of the actual answer will be accepted.",
      constraints: [
        "-10^5 <= num <= 10^5",
        "There will be at least one element in the data structure before calling findMedian.",
        "At most 5 * 10^4 calls will be made to addNum and findMedian.",
      ],
      solution:
        "Maintain two heaps: a max-heap for the lower half and a min-heap for the upper half. Balance them so their sizes differ by at most 1. The median is either the top of the larger heap or the average of both tops.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: null,
    },
    testCases: [
      {
        input: {
          actions: ["addNum", "addNum", "findMedian", "addNum", "findMedian"],
          params: [[1], [2], [], [3], []],
        },
        expectedOutput: [null, null, 1.5, null, 2.0],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { actions: ["addNum", "findMedian"], params: [[5], []] },
        expectedOutput: [null, 5.0],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { actions: ["addNum", "addNum", "findMedian"], params: [[1], [1], []] },
        expectedOutput: [null, null, 1.0],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: {
          actions: ["addNum", "addNum", "addNum", "addNum", "findMedian"],
          params: [[1], [2], [3], [4], []],
        },
        expectedOutput: [null, null, null, null, 2.5],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          actions: ["addNum", "addNum", "addNum", "findMedian"],
          params: [[-1], [-2], [-3], []],
        },
        expectedOutput: [null, null, null, -2.0],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          actions: ["addNum", "addNum", "addNum", "addNum", "addNum", "findMedian"],
          params: [[5], [3], [8], [1], [9], []],
        },
        expectedOutput: [null, null, null, null, null, 5.0],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          actions: ["addNum", "findMedian", "addNum", "findMedian"],
          params: [[0], [], [0], []],
        },
        expectedOutput: [null, 0.0, null, 0.0],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          actions: ["addNum", "addNum", "addNum", "addNum", "addNum", "addNum", "findMedian"],
          params: [[10], [20], [30], [40], [50], [60], []],
        },
        expectedOutput: [null, null, null, null, null, null, 35.0],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class MedianFinder:\n    def __init__(self):\n        pass\n\n    def addNum(self, num: int) -> None:\n        pass\n\n    def findMedian(self) -> float:\n        pass",
      methodName: "findMedian",
      parameterNames: [],
    },
    hints: [
      {
        hintText:
          "Think about splitting the stream into two halves: numbers less than or equal to the median, and numbers greater than the median.",
        orderIndex: 0,
      },
      {
        hintText:
          "A max-heap for the lower half and a min-heap for the upper half let you access the middle elements in O(1) time.",
        orderIndex: 1,
      },
      {
        hintText:
          "Keep the heaps balanced so their sizes differ by at most 1. When adding a number, decide which heap it belongs to, then rebalance if needed.",
        orderIndex: 2,
      },
    ],
  },
];
