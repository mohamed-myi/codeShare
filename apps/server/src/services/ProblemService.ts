import type { ProblemListItem, ProblemDetail } from "@codeshare/shared";
import { problemRepository, testCaseRepository, boilerplateRepository } from "@codeshare/db";

export const problemService = {
  async list(filters?: {
    category?: string;
    difficulty?: string;
  }): Promise<ProblemListItem[]> {
    return problemRepository.findAll(filters);
  },

  async getById(id: string): Promise<ProblemDetail | null> {
    const problem = await problemRepository.findById(id);
    if (!problem) return null;

    const visibleTestCases = await testCaseRepository.findVisible(id);
    const boilerplate = await boilerplateRepository.findByProblemAndLanguage(
      id,
      "python",
    );

    return { ...problem, visibleTestCases, boilerplate };
  },
};
