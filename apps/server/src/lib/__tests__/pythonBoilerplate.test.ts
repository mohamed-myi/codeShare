import { describe, expect, it } from "vitest";
import { stripPythonFutureAnnotationsImport } from "../pythonBoilerplate.js";

describe("stripPythonFutureAnnotationsImport", () => {
  it("removes a leading future annotations import from templates", () => {
    expect(
      stripPythonFutureAnnotationsImport(
        "from __future__ import annotations\n\nclass Solution:\n    def solve(self, nums: List[int]) -> int:\n        return len(nums)",
      ),
    ).toBe(
      "class Solution:\n    def solve(self, nums: List[int]) -> int:\n        return len(nums)",
    );
  });

  it("leaves templates without a future import unchanged", () => {
    expect(stripPythonFutureAnnotationsImport("class Solution:\n    pass")).toBe(
      "class Solution:\n    pass",
    );
  });

  it("leaves blank templates unchanged", () => {
    expect(stripPythonFutureAnnotationsImport("")).toBe("");
  });
});
