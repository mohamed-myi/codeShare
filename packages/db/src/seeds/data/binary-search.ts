import type { ProblemFixture } from "./types.js";

export const binarySearchProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "binary-search",
      title: "Binary Search",
      difficulty: "easy",
      category: "Binary Search",
      description:
        "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with O(log n) runtime complexity.",
      constraints: [
        "1 <= nums.length <= 10^4",
        "-10^4 < nums[i], target < 10^4",
        "All the integers in nums are unique.",
        "nums is sorted in ascending order.",
      ],
      solution:
        "Classic binary search. Maintain left and right pointers. Compute mid, compare with target, and narrow the search space by half each iteration.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/binary-search/",
    },
    testCases: [
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
        expectedOutput: -1,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { nums: [5], target: 5 }, expectedOutput: 0, isVisible: true, orderIndex: 2 },
      { input: { nums: [1], target: 2 }, expectedOutput: -1, isVisible: false, orderIndex: 3 },
      {
        input: { nums: [1, 2, 3, 4, 5], target: 1 },
        expectedOutput: 0,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { nums: [1, 2, 3, 4, 5], target: 5 },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { nums: [-5, -3, 0, 1, 4], target: -3 },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { nums: [2, 5], target: 5 }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      methodName: "search",
      parameterNames: ["nums", "target"],
    },
    hints: [
      {
        hintText:
          "Compare the target with the middle element. If they are equal, return the index. If target is smaller, search the left half. If target is larger, search the right half.",
        orderIndex: 0,
      },
    ],
  },
  {
    problem: {
      slug: "search-a-2d-matrix",
      title: "Search a 2D Matrix",
      difficulty: "medium",
      category: "Binary Search",
      description:
        "You are given an `m x n` integer matrix `matrix` with the following two properties:\n\n- Each row is sorted in non-decreasing order.\n- The first integer of each row is greater than the last integer of the previous row.\n\nGiven an integer `target`, return `true` if `target` is in `matrix` or `false` otherwise.\n\nYou must write a solution in O(log(m * n)) time complexity.",
      constraints: [
        "m == matrix.length",
        "n == matrix[i].length",
        "1 <= m, n <= 100",
        "-10^4 <= matrix[i][j], target <= 10^4",
      ],
      solution:
        "Treat the 2D matrix as a flat sorted array. Perform binary search using index mapping: row = mid // n, col = mid % n, where n is the number of columns.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/search-a-2d-matrix/",
    },
    testCases: [
      {
        input: {
          matrix: [
            [1, 3, 5, 7],
            [10, 11, 16, 20],
            [23, 30, 34, 60],
          ],
          target: 3,
        },
        expectedOutput: true,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          matrix: [
            [1, 3, 5, 7],
            [10, 11, 16, 20],
            [23, 30, 34, 60],
          ],
          target: 13,
        },
        expectedOutput: false,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { matrix: [[1]], target: 1 }, expectedOutput: true, isVisible: true, orderIndex: 2 },
      {
        input: { matrix: [[1]], target: 0 },
        expectedOutput: false,
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: { matrix: [[1, 3]], target: 3 },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: { matrix: [[1], [3], [5]], target: 3 },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          matrix: [
            [1, 3, 5, 7],
            [10, 11, 16, 20],
            [23, 30, 34, 60],
          ],
          target: 60,
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          matrix: [
            [1, 3, 5, 7],
            [10, 11, 16, 20],
            [23, 30, 34, 60],
          ],
          target: 1,
        },
        expectedOutput: true,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:\n        pass",
      methodName: "searchMatrix",
      parameterNames: ["matrix", "target"],
    },
    hints: [
      {
        hintText:
          "The matrix rows are sorted and each row starts with a value larger than the previous row's last value. This means the entire matrix is one sorted sequence.",
        orderIndex: 0,
      },
      {
        hintText:
          "Treat the matrix as a flat sorted array of size m*n. Use binary search on indices 0 to m*n-1, converting each index to row and column: row = mid // n, col = mid % n.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "koko-eating-bananas",
      title: "Koko Eating Bananas",
      difficulty: "medium",
      category: "Binary Search",
      description:
        "Koko loves to eat bananas. There are `n` piles of bananas, the `i`th pile has `piles[i]` bananas. The guards have gone and will come back in `h` hours.\n\nKoko can decide her bananas-per-hour eating speed of `k`. Each hour, she chooses some pile of bananas and eats `k` bananas from that pile. If the pile has less than `k` bananas, she eats all of them and will not eat any more bananas during this hour.\n\nKoko likes to eat slowly but still wants to finish eating all the bananas before the guards come back.\n\nReturn the minimum integer `k` such that she can eat all the bananas within `h` hours.",
      constraints: [
        "1 <= piles.length <= 10^4",
        "piles.length <= h <= 10^9",
        "1 <= piles[i] <= 10^9",
      ],
      solution:
        "Binary search on the eating speed k in range [1, max(piles)]. For each candidate k, compute total hours needed (sum of ceil(pile/k) for each pile). Find the minimum k where total hours <= h.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/koko-eating-bananas/",
    },
    testCases: [
      { input: { piles: [3, 6, 7, 11], h: 8 }, expectedOutput: 4, isVisible: true, orderIndex: 0 },
      {
        input: { piles: [30, 11, 23, 4, 20], h: 5 },
        expectedOutput: 30,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { piles: [30, 11, 23, 4, 20], h: 6 },
        expectedOutput: 23,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { piles: [1], h: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      {
        input: { piles: [1000000000], h: 2 },
        expectedOutput: 500000000,
        isVisible: false,
        orderIndex: 4,
      },
      { input: { piles: [2, 2], h: 2 }, expectedOutput: 2, isVisible: false, orderIndex: 5 },
      {
        input: { piles: [312884470], h: 968709470 },
        expectedOutput: 1,
        isVisible: false,
        orderIndex: 6,
      },
      { input: { piles: [1, 1, 1, 1], h: 4 }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def minEatingSpeed(self, piles: List[int], h: int) -> int:\n        pass",
      methodName: "minEatingSpeed",
      parameterNames: ["piles", "h"],
    },
    hints: [
      {
        hintText:
          "The answer must be between 1 and max(piles). For a given speed k, you can calculate how many hours it takes to eat all bananas. Can you search for the minimum k efficiently?",
        orderIndex: 0,
      },
      {
        hintText:
          "Binary search on the speed k. For each candidate speed, compute total hours as sum of ceil(piles[i] / k) for all piles. If total hours <= h, try a smaller k. Otherwise, try a larger k.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "find-minimum-in-rotated-sorted-array",
      title: "Find Minimum in Rotated Sorted Array",
      difficulty: "medium",
      category: "Binary Search",
      description:
        "Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times. For example, the array `nums = [0,1,2,4,5,6,7]` might become:\n\n- `[4,5,6,7,0,1,2]` if it was rotated 4 times.\n- `[0,1,2,4,5,6,7]` if it was rotated 7 times.\n\nNotice that rotating an array `[a[0], a[1], a[2], ..., a[n-1]]` 1 time results in the array `[a[n-1], a[0], a[1], a[2], ..., a[n-2]]`.\n\nGiven the sorted rotated array `nums` of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in O(log n) time.",
      constraints: [
        "n == nums.length",
        "1 <= n <= 5000",
        "-5000 <= nums[i] <= 5000",
        "All the integers of nums are unique.",
        "nums is sorted and rotated between 1 and n times.",
      ],
      solution:
        "Binary search comparing mid element with the rightmost element. If nums[mid] > nums[right], the minimum is in the right half. Otherwise, it is in the left half (including mid).",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
    },
    testCases: [
      { input: { nums: [3, 4, 5, 1, 2] }, expectedOutput: 1, isVisible: true, orderIndex: 0 },
      { input: { nums: [4, 5, 6, 7, 0, 1, 2] }, expectedOutput: 0, isVisible: true, orderIndex: 1 },
      { input: { nums: [11, 13, 15, 17] }, expectedOutput: 11, isVisible: true, orderIndex: 2 },
      { input: { nums: [2, 1] }, expectedOutput: 1, isVisible: false, orderIndex: 3 },
      { input: { nums: [1] }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { nums: [2, 3, 4, 5, 1] }, expectedOutput: 1, isVisible: false, orderIndex: 5 },
      { input: { nums: [5, 1, 2, 3, 4] }, expectedOutput: 1, isVisible: false, orderIndex: 6 },
      { input: { nums: [3, 1, 2] }, expectedOutput: 1, isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def findMin(self, nums: List[int]) -> int:\n        pass",
      methodName: "findMin",
      parameterNames: ["nums"],
    },
    hints: [
      {
        hintText:
          "In a rotated sorted array, one half is always sorted. The minimum is at the rotation point where the sorted order breaks.",
        orderIndex: 0,
      },
      {
        hintText:
          "Compare nums[mid] with nums[right]. If nums[mid] > nums[right], the pivot (minimum) is in the right half. Otherwise, the minimum is in the left half including mid.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "search-in-rotated-sorted-array",
      title: "Search in Rotated Sorted Array",
      difficulty: "medium",
      category: "Binary Search",
      description:
        "There is an integer array `nums` sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k` (`1 <= k < nums.length`) such that the resulting array is `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]` (0-indexed). For example, `[0,1,2,4,5,6,7]` might be rotated at pivot index 3 and become `[4,5,6,7,0,1,2]`.\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with O(log n) runtime complexity.",
      constraints: [
        "1 <= nums.length <= 5000",
        "-10^4 <= nums[i] <= 10^4",
        "All values of nums are unique.",
        "nums is an ascending array that is possibly rotated.",
        "-10^4 <= target <= 10^4",
      ],
      solution:
        "Binary search with an extra check to determine which half is sorted. If the left half is sorted and target falls in that range, search left. Otherwise search right. Apply the same logic if the right half is sorted.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    },
    testCases: [
      {
        input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 },
        expectedOutput: 4,
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 3 },
        expectedOutput: -1,
        isVisible: true,
        orderIndex: 1,
      },
      { input: { nums: [1], target: 0 }, expectedOutput: -1, isVisible: true, orderIndex: 2 },
      { input: { nums: [1], target: 1 }, expectedOutput: 0, isVisible: false, orderIndex: 3 },
      { input: { nums: [3, 1], target: 1 }, expectedOutput: 1, isVisible: false, orderIndex: 4 },
      { input: { nums: [5, 1, 3], target: 3 }, expectedOutput: 2, isVisible: false, orderIndex: 5 },
      {
        input: { nums: [4, 5, 6, 7, 8, 1, 2, 3], target: 8 },
        expectedOutput: 4,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { nums: [1, 2, 3, 4, 5], target: 4 },
        expectedOutput: 3,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      methodName: "search",
      parameterNames: ["nums", "target"],
    },
    hints: [
      {
        hintText:
          "At each step of binary search, one half of the array is always sorted. Determine which half is sorted and check if the target falls within that range.",
        orderIndex: 0,
      },
      {
        hintText:
          "If nums[left] <= nums[mid], the left half is sorted. If target is in [nums[left], nums[mid]], search left. Otherwise search right. Apply similar logic when the right half is sorted.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "time-based-key-value-store",
      title: "Time Based Key-Value Store",
      difficulty: "medium",
      category: "Binary Search",
      description:
        'Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key\'s value at a certain timestamp.\n\nImplement the `TimeMap` class:\n\n- `TimeMap()` Initializes the object of the data structure.\n- `void set(String key, String value, int timestamp)` Stores the key `key` with the value `value` at the given time `timestamp`.\n- `String get(String key, int timestamp)` Returns a value such that `set` was called previously, with `timestamp_prev <= timestamp`. If there are multiple such values, it returns the value associated with the largest `timestamp_prev`. If there are no values, it returns the empty string `""`.',
      constraints: [
        "1 <= key.length, value.length <= 100",
        "key and value consist of lowercase English letters and digits.",
        "1 <= timestamp <= 10^7",
        "All the timestamps timestamp of set are strictly increasing.",
        "At most 2 * 10^5 calls will be made to set and get.",
      ],
      solution:
        "Use a hash map from key to a list of (timestamp, value) pairs. Since timestamps are strictly increasing, the list is sorted. For get, binary search for the largest timestamp <= the query timestamp.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/time-based-key-value-store/",
    },
    testCases: [
      {
        input: {
          operations: ["TimeMap", "set", "get", "get", "set", "get", "get"],
          args: [
            [],
            ["foo", "bar", 1],
            ["foo", 1],
            ["foo", 3],
            ["foo", "bar2", 4],
            ["foo", 4],
            ["foo", 5],
          ],
        },
        expectedOutput: [null, null, "bar", "bar", null, "bar2", "bar2"],
        isVisible: true,
        orderIndex: 0,
      },
      {
        input: {
          operations: ["TimeMap", "set", "get", "get"],
          args: [[], ["key", "val", 1], ["key", 1], ["key", 0]],
        },
        expectedOutput: [null, null, "val", ""],
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: {
          operations: ["TimeMap", "set", "set", "get", "get", "get"],
          args: [[], ["a", "v1", 1], ["a", "v2", 2], ["a", 1], ["a", 2], ["a", 3]],
        },
        expectedOutput: [null, null, null, "v1", "v2", "v2"],
        isVisible: true,
        orderIndex: 2,
      },
      {
        input: { operations: ["TimeMap", "get"], args: [[], ["missing", 1]] },
        expectedOutput: [null, ""],
        isVisible: false,
        orderIndex: 3,
      },
      {
        input: {
          operations: ["TimeMap", "set", "set", "set", "get"],
          args: [[], ["x", "a", 1], ["x", "b", 5], ["x", "c", 10], ["x", 7]],
        },
        expectedOutput: [null, null, null, null, "b"],
        isVisible: false,
        orderIndex: 4,
      },
      {
        input: {
          operations: ["TimeMap", "set", "get", "get"],
          args: [[], ["k", "v", 5], ["k", 4], ["k", 5]],
        },
        expectedOutput: [null, null, "", "v"],
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: {
          operations: ["TimeMap", "set", "set", "get", "get"],
          args: [[], ["a", "x", 1], ["b", "y", 2], ["a", 3], ["b", 1]],
        },
        expectedOutput: [null, null, null, "x", ""],
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: {
          operations: ["TimeMap", "set", "set", "set", "get", "get", "get"],
          args: [
            [],
            ["z", "one", 1],
            ["z", "two", 2],
            ["z", "three", 3],
            ["z", 1],
            ["z", 2],
            ["z", 3],
          ],
        },
        expectedOutput: [null, null, null, null, "one", "two", "three"],
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class TimeMap:\n    def __init__(self):\n        pass\n\n    def set(self, key: str, value: str, timestamp: int) -> None:\n        pass\n\n    def get(self, key: str, timestamp: int) -> str:\n        pass",
      methodName: "TimeMap",
      parameterNames: [],
    },
    hints: [
      {
        hintText:
          "Store values in a list associated with each key. Since timestamps are strictly increasing, the list is naturally sorted.",
        orderIndex: 0,
      },
      {
        hintText:
          "For get queries, use binary search on the list of (timestamp, value) pairs to find the largest timestamp that is <= the query timestamp.",
        orderIndex: 1,
      },
    ],
  },
  {
    problem: {
      slug: "median-of-two-sorted-arrays",
      title: "Median of Two Sorted Arrays",
      difficulty: "hard",
      category: "Binary Search",
      description:
        "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).",
      constraints: [
        "nums1.length == m",
        "nums2.length == n",
        "0 <= m <= 1000",
        "0 <= n <= 1000",
        "1 <= m + n <= 2000",
        "-10^6 <= nums1[i], nums2[i] <= 10^6",
      ],
      solution:
        "Binary search on the partition of the shorter array. For each partition point in the shorter array, compute the corresponding partition in the longer array such that left elements equal right elements. Check if max(left) <= min(right) to validate the partition.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
    },
    testCases: [
      { input: { nums1: [1, 3], nums2: [2] }, expectedOutput: 2.0, isVisible: true, orderIndex: 0 },
      {
        input: { nums1: [1, 2], nums2: [3, 4] },
        expectedOutput: 2.5,
        isVisible: true,
        orderIndex: 1,
      },
      {
        input: { nums1: [0, 0], nums2: [0, 0] },
        expectedOutput: 0.0,
        isVisible: true,
        orderIndex: 2,
      },
      { input: { nums1: [], nums2: [1] }, expectedOutput: 1.0, isVisible: false, orderIndex: 3 },
      { input: { nums1: [2], nums2: [] }, expectedOutput: 2.0, isVisible: false, orderIndex: 4 },
      {
        input: { nums1: [1, 2, 3], nums2: [4, 5, 6] },
        expectedOutput: 3.5,
        isVisible: false,
        orderIndex: 5,
      },
      {
        input: { nums1: [1], nums2: [2, 3, 4, 5, 6] },
        expectedOutput: 3.5,
        isVisible: false,
        orderIndex: 6,
      },
      {
        input: { nums1: [3, 4], nums2: [1, 2, 5] },
        expectedOutput: 3.0,
        isVisible: false,
        orderIndex: 7,
      },
    ],
    boilerplate: {
      language: "python",
      template:
        "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        pass",
      methodName: "findMedianSortedArrays",
      parameterNames: ["nums1", "nums2"],
    },
    hints: [
      {
        hintText:
          "The median splits the combined sorted array into two equal halves. You need to find the correct partition point without merging the arrays.",
        orderIndex: 0,
      },
      {
        hintText:
          "Binary search on the shorter array's partition. If you take i elements from nums1 and j = (m+n+1)/2 - i elements from nums2, the left partition has the correct number of elements.",
        orderIndex: 1,
      },
      {
        hintText:
          "A valid partition satisfies: nums1[i-1] <= nums2[j] and nums2[j-1] <= nums1[i]. If nums1[i-1] > nums2[j], decrease i. If nums2[j-1] > nums1[i], increase i. Handle edge cases with -infinity and +infinity for boundaries.",
        orderIndex: 2,
      },
    ],
  },
];
