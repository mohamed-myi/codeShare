import type { Hint } from "@codeshare/shared";
import { hintRepository } from "@codeshare/db";

export const hintService = {
  /**
   * Returns the next stored hint for the problem, or null if exhausted.
   * hintsUsed is 0-indexed: if hintsUsed=0, return hint at order_index=1.
   */
  async getStoredHint(
    problemId: string,
    hintsUsed: number,
  ): Promise<Hint | null> {
    const hints = await hintRepository.findByProblemId(problemId);
    return hints.find((h) => h.orderIndex === hintsUsed + 1) ?? null;
  },

  /**
   * Builds the LLM prompt for generating a hint when stored hints are exhausted.
   */
  buildLLMPrompt(opts: {
    description: string;
    constraints: string[];
    currentCode: string;
    hintLevel: number;
    previousHints: string[];
    lastFailure?: string;
  }): string {
    return [
      "System: You are a coding tutor. Give a progressive hint for the problem below.",
      `Hint level: ${opts.hintLevel} (1 = conceptual approach, 2 = data structure/algorithm suggestion, 3 = pseudocode outline).`,
      "NEVER give the complete solution.",
      "",
      `Problem: ${opts.description}`,
      `Constraints: ${opts.constraints.join(", ")}`,
      `Current code:\n${opts.currentCode}`,
      opts.previousHints.length > 0
        ? `Previous hints given:\n${opts.previousHints.join("\n")}`
        : "",
      opts.lastFailure
        ? `Failed test case: ${opts.lastFailure}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  },
};
