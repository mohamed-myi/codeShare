import {
  boilerplateRepository,
  problemRepository,
  testCaseRepository,
} from "@codeshare/db";
import { DEFAULT_TIME_LIMIT_MS } from "@codeshare/shared";
import type { BoilerplateTemplate, Problem } from "@codeshare/shared";

const LEETCODE_URL_PATTERN = /^https:\/\/leetcode\.com\/problems\/([\w-]+)\/?$/;
const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

interface LeetCodeQuestionData {
  title: string;
  difficulty: string;
  categoryTitle: string | null;
  content: string;
  metaData: string;
  codeSnippets: Array<{ langSlug: string; code: string }>;
}

interface ScraperServiceDeps {
  fetchImpl: typeof fetch;
  findBySourceUrl: (url: string) => Promise<Problem | null>;
  findBySlug: (slug: string) => Promise<Problem | null>;
  restoreProblem: (problemId: string) => Promise<void>;
  createProblem: typeof problemRepository.create;
  createTestCase: typeof testCaseRepository.create;
  createBoilerplate: typeof boilerplateRepository.create;
  deleteProblem: (problemId: string) => Promise<void>;
}

interface ExampleBlock {
  input: string;
  output: string;
}

function normalizeLeetCodeUrl(url: string): { slug: string; canonicalUrl: string } {
  const match = url.match(LEETCODE_URL_PATTERN);
  if (!match) {
    throw new Error("URL must match https://leetcode.com/problems/<slug>/");
  }

  const slug = match[1];
  return {
    slug,
    canonicalUrl: `https://leetcode.com/problems/${slug}/`,
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, ""));
}

function htmlToProblemText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
      .replace(/<code>([\s\S]*?)<\/code>/gi, (_match, code: string) => `\`${stripTags(code)}\``)
      .replace(/<pre>([\s\S]*?)<\/pre>/gi, (_match, block: string) => `\n\n${stripTags(block).trim()}\n\n`)
      .replace(/<li>([\s\S]*?)<\/li>/gi, (_match, item: string) => `- ${stripTags(item).trim()}\n`)
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function extractConstraints(content: string): string[] {
  const match = content.match(/<p><strong>Constraints:<\/strong><\/p>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!match) {
    return [];
  }

  return Array.from(match[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)).map((item) =>
    stripTags(item[1]).trim(),
  );
}

function stripConstraintsSection(content: string): string {
  return content.replace(
    /<p><strong>Constraints:<\/strong><\/p>\s*<ul>[\s\S]*?<\/ul>/i,
    "",
  );
}

function extractExampleBlocks(content: string): ExampleBlock[] {
  const blocks = Array.from(content.matchAll(/<pre>([\s\S]*?)<\/pre>/gi)).map((match) =>
    stripTags(match[1]).trim(),
  );

  return blocks.map((block) => {
    const cleaned = block.replace(/\r/g, "").trim();
    const match = cleaned.match(
      /Input:\s*([\s\S]*?)\s*Output:\s*([\s\S]*?)(?:\s*Explanation:|$)/i,
    );

    if (!match) {
      throw new Error("Failed to parse imported example test cases.");
    }

    return {
      input: match[1].trim(),
      output: match[2].trim(),
    };
  });
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let squareDepth = 0;
  let curlyDepth = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of source) {
    current += char;

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "[") squareDepth += 1;
    else if (char === "]") squareDepth -= 1;
    else if (char === "{") curlyDepth += 1;
    else if (char === "}") curlyDepth -= 1;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;

    if (
      char === delimiter &&
      squareDepth === 0 &&
      curlyDepth === 0 &&
      parenDepth === 0
    ) {
      parts.push(current.slice(0, -1).trim());
      current = "";
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseScalarValue(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  throw new Error(`Unsupported imported value: ${trimmed}`);
}

function parseLeetCodeValue(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  return parseScalarValue(trimmed);
}

function parseInputAssignments(
  input: string,
  parameterNames: string[],
): Record<string, unknown> {
  const normalized = input.replace(/\s+/g, " ").trim();
  const assignments = splitTopLevel(normalized, ",");
  const parsed = assignments.map((assignment) => {
    const equalsIndex = assignment.indexOf("=");
    if (equalsIndex === -1) {
      throw new Error("Failed to parse imported example inputs.");
    }

    const name = assignment.slice(0, equalsIndex).trim();
    const value = assignment.slice(equalsIndex + 1).trim();
    return [name, parseLeetCodeValue(value)] as const;
  });

  const inputRecord = Object.fromEntries(parsed);

  for (const name of parameterNames) {
    if (!(name in inputRecord)) {
      throw new Error(`Imported example is missing parameter "${name}".`);
    }
  }

  return inputRecord;
}

function parseMetadata(metaData: string): { methodName: string; parameterNames: string[] } {
  const parsed = JSON.parse(metaData) as {
    name?: string;
    params?: Array<{ name?: string }>;
  };

  const methodName = parsed.name?.trim();
  const parameterNames = parsed.params
    ?.map((param) => param.name?.trim())
    .filter((name): name is string => Boolean(name)) ?? [];

  if (!methodName || parameterNames.length === 0) {
    throw new Error("Imported problem is missing callable metadata.");
  }

  return { methodName, parameterNames };
}

function selectPythonBoilerplate(codeSnippets: Array<{ langSlug: string; code: string }>): string {
  const snippet =
    codeSnippets.find((item) => item.langSlug === "python3") ??
    codeSnippets.find((item) => item.langSlug === "python");

  if (!snippet?.code.trim()) {
    throw new Error("Imported problem does not include Python boilerplate.");
  }

  return snippet.code;
}

async function fetchQuestionData(
  fetchImpl: typeof fetch,
  slug: string,
): Promise<LeetCodeQuestionData> {
  const response = await fetchImpl(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      referer: `https://leetcode.com/problems/${slug}/`,
      "user-agent": "CodeShare Importer/1.0",
    },
    redirect: "error",
    body: JSON.stringify({
      query: `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            difficulty
            categoryTitle
            content
            metaData
            codeSnippets {
              langSlug
              code
            }
          }
        }
      `,
      variables: { titleSlug: slug },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch problem from LeetCode.");
  }

  const payload = (await response.json()) as {
    data?: { question?: LeetCodeQuestionData | null };
  };

  const question = payload.data?.question;
  if (!question) {
    throw new Error("Problem not found on LeetCode.");
  }

  return question;
}

export function createScraperService(
  deps: Partial<ScraperServiceDeps> = {},
) {
  const resolvedDeps: ScraperServiceDeps = {
    fetchImpl: deps.fetchImpl ?? fetch,
    findBySourceUrl:
      deps.findBySourceUrl ?? ((url) => problemRepository.findBySourceUrlIncludingDeleted(url)),
    findBySlug:
      deps.findBySlug ?? ((slug) => problemRepository.findBySlugIncludingDeleted(slug)),
    restoreProblem:
      deps.restoreProblem ?? (async (problemId) => {
        await problemRepository.restoreById(problemId);
      }),
    createProblem: deps.createProblem ?? ((data) => problemRepository.create(data)),
    createTestCase: deps.createTestCase ?? ((data) => testCaseRepository.create(data)),
    createBoilerplate: deps.createBoilerplate ?? ((data) => boilerplateRepository.create(data)),
    deleteProblem: deps.deleteProblem ?? (async (problemId) => {
      await problemRepository.deleteById(problemId);
    }),
  };

  return {
    async importFromUrl(url: string): Promise<Problem> {
      const { slug, canonicalUrl } = normalizeLeetCodeUrl(url);

      const existing =
        (await resolvedDeps.findBySourceUrl(canonicalUrl)) ??
        (await resolvedDeps.findBySlug(slug));
      if (existing) {
        if (existing.deletedAt) {
          await resolvedDeps.restoreProblem(existing.id);
        }
        return existing;
      }

      const question = await fetchQuestionData(resolvedDeps.fetchImpl, slug);
      const { methodName, parameterNames } = parseMetadata(question.metaData);
      const boilerplate = selectPythonBoilerplate(question.codeSnippets);
      const visibleExamples = extractExampleBlocks(question.content).slice(0, 3);

      if (visibleExamples.length === 0) {
        throw new Error("Imported problem did not include visible examples.");
      }

      const parsedExamples = visibleExamples.map((example, index) => ({
        input: parseInputAssignments(example.input, parameterNames),
        expectedOutput: parseLeetCodeValue(example.output),
        isVisible: true,
        orderIndex: index,
      }));

      let createdProblem: Problem | null = null;

      try {
        createdProblem = await resolvedDeps.createProblem({
          slug,
          title: question.title,
          difficulty: question.difficulty.toLowerCase(),
          category: question.categoryTitle?.trim() || "Imported",
          description: htmlToProblemText(stripConstraintsSection(question.content)),
          constraints: extractConstraints(question.content),
          solution: null,
          timeLimitMs: DEFAULT_TIME_LIMIT_MS,
          source: "user_submitted",
          sourceUrl: canonicalUrl,
        });

        for (const example of parsedExamples) {
          await resolvedDeps.createTestCase({
            problemId: createdProblem.id,
            ...example,
          });
        }

        await resolvedDeps.createBoilerplate({
          problemId: createdProblem.id,
          language: "python",
          template: boilerplate,
          methodName,
          parameterNames,
        });

        return createdProblem;
      } catch (error) {
        if (createdProblem) {
          await resolvedDeps.deleteProblem(createdProblem.id);
        }
        throw error;
      }
    },
  };
}

export const scraperService = createScraperService();
