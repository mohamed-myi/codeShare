import { advancedGraphsProblems } from "./advanced-graphs.js";
import { arraysHashingProblems } from "./arrays-hashing.js";
import { backtrackingProblems } from "./backtracking.js";
import { binarySearchProblems } from "./binary-search.js";
import { bitManipulationProblems } from "./bit-manipulation.js";
import { dp1dProblems } from "./dp-1d.js";
import { dp2dProblems } from "./dp-2d.js";
import { graphsProblems } from "./graphs.js";
import { greedyProblems } from "./greedy.js";
import { heapProblems } from "./heap.js";
import { intervalsProblems } from "./intervals.js";
import { linkedListProblems } from "./linked-list.js";
import { mathGeometryProblems } from "./math-geometry.js";
import { slidingWindowProblems } from "./sliding-window.js";
import { stackProblems } from "./stack.js";
import { treesProblems } from "./trees.js";
import { triesProblems } from "./tries.js";
import { twoPointersProblems } from "./two-pointers.js";
import type { ProblemFixture } from "./types.js";

export type { ProblemFixture } from "./types.js";

export const fixtures: ProblemFixture[] = [
  ...arraysHashingProblems,
  ...twoPointersProblems,
  ...slidingWindowProblems,
  ...stackProblems,
  ...binarySearchProblems,
  ...linkedListProblems,
  ...treesProblems,
  ...triesProblems,
  ...heapProblems,
  ...backtrackingProblems,
  ...graphsProblems,
  ...advancedGraphsProblems,
  ...dp1dProblems,
  ...dp2dProblems,
  ...greedyProblems,
  ...intervalsProblems,
  ...mathGeometryProblems,
  ...bitManipulationProblems,
];
