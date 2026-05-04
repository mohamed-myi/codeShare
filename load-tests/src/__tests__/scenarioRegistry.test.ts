import { describe, expect, it } from "vitest";
import { scenarios, selectScenarios } from "../scenarios/index.js";
import type { Scenario } from "../types.js";

describe("scenario registry", () => {
  it("exports all load-test scenarios in run order", () => {
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "LT-1",
      "LT-2",
      "LT-3",
      "LT-4",
      "LT-5",
      "LT-6",
      "LT-7",
      "LT-8",
      "LT-9",
      "LT-10",
      "LT-11",
      "LT-12",
    ]);
  });

  it("filters scenarios case-insensitively", () => {
    const selected = selectScenarios(scenarios, ["lt-2", " Lt-5 "]);
    expect(selected.map((scenario) => scenario.id)).toEqual(["LT-2", "LT-5"]);
  });

  it("returns all scenarios when none are requested", () => {
    expect(selectScenarios(scenarios)).toBe(scenarios);
  });

  it("returns an empty list when no requested ids match", () => {
    const singleScenario: Scenario[] = [scenarios[0]];
    expect(selectScenarios(singleScenario, ["LT-99"])).toEqual([]);
  });
});
