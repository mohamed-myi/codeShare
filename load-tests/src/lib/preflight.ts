import type { Scenario } from "../types.js";

export function selectedScenariosRequireProblemData(selectedScenarios: Scenario[]): boolean {
  return selectedScenarios.some((scenario) => scenario.requiresProblemData === true);
}
