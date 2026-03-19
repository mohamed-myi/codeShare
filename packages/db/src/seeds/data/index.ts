import type { ProblemFixture } from "./types.js";
import { arraysHashingProblems } from "./arrays-hashing.js";
import { twoPointersProblems } from "./two-pointers.js";
import { slidingWindowProblems } from "./sliding-window.js";
import { stackProblems } from "./stack.js";
import { binarySearchProblems } from "./binary-search.js";
import { linkedListProblems } from "./linked-list.js";
import { treesProblems } from "./trees.js";
import { triesProblems } from "./tries.js";
import { heapProblems } from "./heap.js";
import { backtrackingProblems } from "./backtracking.js";
import { graphsProblems } from "./graphs.js";
import { advancedGraphsProblems } from "./advanced-graphs.js";
import { dp1dProblems } from "./dp-1d.js";
import { dp2dProblems } from "./dp-2d.js";
import { greedyProblems } from "./greedy.js";
import { intervalsProblems } from "./intervals.js";
import { mathGeometryProblems } from "./math-geometry.js";
import { bitManipulationProblems } from "./bit-manipulation.js";

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
