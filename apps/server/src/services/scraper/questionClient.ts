import { DependencyError, isDependencyError } from "../../lib/dependencyError.js";

export const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

export interface LeetCodeQuestionData {
  title: string;
  difficulty: string;
  categoryTitle: string | null;
  content: string;
  metaData: string;
  codeSnippets: Array<{ langSlug: string; code: string }>;
}

export async function fetchQuestionData(
  fetchImpl: typeof fetch,
  graphQlUrl: string,
  slug: string,
): Promise<LeetCodeQuestionData> {
  let response: Response;
  try {
    response = await fetchImpl(graphQlUrl, {
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
  } catch (error) {
    throw toLeetCodeDependencyError(error, "fetch_question", "LeetCode request failed.");
  }

  if (!response.ok) {
    throw new DependencyError({
      dependency: "leetcode",
      operation: "fetch_question",
      errorType: "http_error",
      message: "Failed to fetch problem from LeetCode.",
      statusCode: response.status,
    });
  }

  const payload = (await response.json()) as {
    data?: { question?: LeetCodeQuestionData | null };
  };
  const question = payload.data?.question;

  if (!question) {
    throw new DependencyError({
      dependency: "leetcode",
      operation: "fetch_question",
      errorType: "invalid_response",
      message: "Problem not found on LeetCode.",
    });
  }

  return question;
}

export function wrapLeetCodeParse<T>(action: () => T, operation: string): T {
  try {
    return action();
  } catch (error) {
    if (isDependencyError(error)) {
      throw error;
    }
    throw new DependencyError({
      dependency: "leetcode",
      operation,
      errorType: "parse_error",
      message: error instanceof Error ? error.message : "Failed to parse imported LeetCode data.",
      cause: error,
    });
  }
}

function toLeetCodeDependencyError(error: unknown, operation: string, message: string) {
  if (isDependencyError(error)) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new DependencyError({
      dependency: "leetcode",
      operation,
      errorType: "timeout",
      message,
      isTimeout: true,
      cause: error,
    });
  }

  return new DependencyError({
    dependency: "leetcode",
    operation,
    errorType: "network_error",
    message,
    cause: error,
  });
}
