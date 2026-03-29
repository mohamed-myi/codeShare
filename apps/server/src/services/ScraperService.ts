import { boilerplateRepository, problemRepository, testCaseRepository } from "@codeshare/db";
import type { Problem } from "@codeshare/shared";
import { DEFAULT_TIME_LIMIT_MS, normalizeLeetCodeUrl } from "@codeshare/shared";
import { DependencyError } from "../lib/dependencyError.js";
import {
  type ExampleBlock,
  extractConstraints,
  extractExampleBlocks,
  htmlToProblemText,
  parseInputAssignments,
  parseLeetCodeValue,
  parseMetadata,
  selectPythonBoilerplate,
  stripConstraintsSection,
} from "./scraper/parsers.js";
import {
  fetchQuestionData,
  LEETCODE_GRAPHQL_URL,
  type LeetCodeQuestionData,
  wrapLeetCodeParse,
} from "./scraper/questionClient.js";

interface ScraperServiceDeps {
  fetchImpl: typeof fetch;
  graphQlUrl: string;
  findBySourceUrl: (url: string) => Promise<Problem | null>;
  findBySlug: (slug: string) => Promise<Problem | null>;
  restoreProblem: (problemId: string) => Promise<void>;
  createProblem: typeof problemRepository.create;
  createTestCase: typeof testCaseRepository.create;
  createBoilerplate: typeof boilerplateRepository.create;
  deleteProblem: (problemId: string) => Promise<void>;
}

interface ParsedExample {
  input: Record<string, unknown>;
  expectedOutput: unknown;
  isVisible: true;
  orderIndex: number;
}

export function createScraperService(deps: Partial<ScraperServiceDeps> = {}) {
  const resolvedDeps: ScraperServiceDeps = {
    fetchImpl: deps.fetchImpl ?? fetch,
    graphQlUrl: deps.graphQlUrl ?? LEETCODE_GRAPHQL_URL,
    findBySourceUrl:
      deps.findBySourceUrl ?? ((url) => problemRepository.findBySourceUrlIncludingDeleted(url)),
    findBySlug: deps.findBySlug ?? ((slug) => problemRepository.findBySlugIncludingDeleted(slug)),
    restoreProblem:
      deps.restoreProblem ??
      (async (problemId) => {
        await problemRepository.restoreById(problemId);
      }),
    createProblem: deps.createProblem ?? ((data) => problemRepository.create(data)),
    createTestCase: deps.createTestCase ?? ((data) => testCaseRepository.create(data)),
    createBoilerplate: deps.createBoilerplate ?? ((data) => boilerplateRepository.create(data)),
    deleteProblem:
      deps.deleteProblem ??
      (async (problemId) => {
        await problemRepository.deleteById(problemId);
      }),
  };

  return {
    async importFromUrl(url: string): Promise<Problem> {
      const { slug, canonicalUrl } = normalizeImportUrl(url);
      const existing = await findExistingProblem(resolvedDeps, canonicalUrl, slug);
      if (existing) {
        await restoreDeletedProblem(resolvedDeps, existing);
        return existing;
      }

      const question = await fetchQuestionData(
        resolvedDeps.fetchImpl,
        resolvedDeps.graphQlUrl,
        slug,
      );
      const parsedProblem = parseImportedProblem(question);
      return persistImportedProblem(resolvedDeps, {
        slug,
        canonicalUrl,
        question,
        ...parsedProblem,
      });
    },
  };
}

export const scraperService = createScraperService();

function normalizeImportUrl(url: string) {
  const normalized = normalizeLeetCodeUrl(url);
  if (!normalized) {
    throw new Error("URL must be a valid LeetCode problem URL.");
  }

  return normalized;
}

async function findExistingProblem(deps: ScraperServiceDeps, canonicalUrl: string, slug: string) {
  return (await deps.findBySourceUrl(canonicalUrl)) ?? (await deps.findBySlug(slug));
}

async function restoreDeletedProblem(deps: ScraperServiceDeps, problem: Problem) {
  if (problem.deletedAt) {
    await deps.restoreProblem(problem.id);
  }
}

function parseImportedProblem(question: LeetCodeQuestionData) {
  const { methodName, parameterNames } = wrapLeetCodeParse(
    () => parseMetadata(question.metaData),
    "parse_metadata",
  );
  const boilerplate = wrapLeetCodeParse(
    () => selectPythonBoilerplate(question.codeSnippets),
    "select_boilerplate",
  );
  const visibleExamples = wrapLeetCodeParse(
    () => extractExampleBlocks(question.content).slice(0, 3),
    "parse_examples",
  );

  if (visibleExamples.length === 0) {
    throw new DependencyError({
      dependency: "leetcode",
      operation: "parse_examples",
      errorType: "invalid_response",
      message: "Imported problem did not include visible examples.",
    });
  }

  const parsedExamples = wrapLeetCodeParse(
    () => buildParsedExamples(visibleExamples, parameterNames),
    "parse_examples",
  );

  return { methodName, parameterNames, boilerplate, parsedExamples };
}

function buildParsedExamples(
  visibleExamples: ExampleBlock[],
  parameterNames: string[],
): ParsedExample[] {
  return visibleExamples.map((example, index) => ({
    input: parseInputAssignments(example.input, parameterNames),
    expectedOutput: parseLeetCodeValue(example.output),
    isVisible: true,
    orderIndex: index,
  }));
}

async function persistImportedProblem(
  deps: ScraperServiceDeps,
  importData: {
    slug: string;
    canonicalUrl: string;
    question: LeetCodeQuestionData;
    methodName: string;
    parameterNames: string[];
    boilerplate: string;
    parsedExamples: ParsedExample[];
  },
) {
  let createdProblem: Problem | null = null;

  try {
    createdProblem = await deps.createProblem({
      slug: importData.slug,
      title: importData.question.title,
      difficulty: importData.question.difficulty.toLowerCase(),
      category: importData.question.categoryTitle?.trim() || "Imported",
      description: htmlToProblemText(stripConstraintsSection(importData.question.content)),
      constraints: extractConstraints(importData.question.content),
      solution: null,
      timeLimitMs: DEFAULT_TIME_LIMIT_MS,
      source: "user_submitted",
      sourceUrl: importData.canonicalUrl,
    });

    for (const example of importData.parsedExamples) {
      await deps.createTestCase({
        problemId: createdProblem.id,
        ...example,
      });
    }

    await deps.createBoilerplate({
      problemId: createdProblem.id,
      language: "python",
      template: importData.boilerplate,
      methodName: importData.methodName,
      parameterNames: importData.parameterNames,
    });

    return createdProblem;
  } catch (error) {
    if (createdProblem) {
      await deps.deleteProblem(createdProblem.id);
    }
    throw error;
  }
}
