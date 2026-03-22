import type { Difficulty, ProblemSource, SupportedLanguage } from "@codeshare/shared";

export interface TestCaseFixture {
  input: Record<string, unknown>;
  expectedOutput: unknown;
  isVisible: boolean;
  orderIndex: number;
}

export interface BoilerplateFixture {
  language: SupportedLanguage;
  template: string;
  methodName: string;
  parameterNames: string[];
}

export interface HintFixture {
  hintText: string;
  orderIndex: number;
}

export interface ProblemFixture {
  problem: {
    slug: string;
    title: string;
    difficulty: Difficulty;
    category: string;
    description: string;
    constraints: string[];
    solution: string;
    timeLimitMs: number;
    source: ProblemSource;
    sourceUrl: string | null;
  };
  testCases: TestCaseFixture[];
  boilerplate: BoilerplateFixture;
  hints: HintFixture[];
}
