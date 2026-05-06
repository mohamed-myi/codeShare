import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { CaseResult, RunResult, SubmitResult, TestCase } from "@codeshare/shared";
import { EXECUTION_OUTPUT_LIMITS, ExecutionErrorType, TIMEOUTS } from "@codeshare/shared";
import { buildPythonHarness } from "./pythonHarness.js";

interface HarnessOkCase {
  index: number;
  status: "ok";
  elapsed_ms?: number;
  got_json: unknown;
  got_repr?: string | null;
}

interface HarnessUnserializableCase {
  index: number;
  status: "unserializable";
  elapsed_ms?: number;
  got_repr: string;
}

interface HarnessErrorCase {
  index: number;
  status: "error";
  elapsed_ms?: number;
  error: string;
  error_truncated?: boolean;
}

export type HarnessCase = HarnessOkCase | HarnessUnserializableCase | HarnessErrorCase;

interface GradedHarnessCase {
  index: number;
  passed: boolean;
  elapsed_ms?: number;
  got?: string | null;
  expected?: string | null;
  error?: string | null;
  isErrorTruncated?: boolean;
}

interface HarnessModuleErrorPayload {
  error: string;
}

interface HarnessModuleError {
  error: string;
  errorType: typeof ExecutionErrorType.COMPILATION_ERROR | typeof ExecutionErrorType.RUNTIME_ERROR;
}

type ParseFailureReason = "missing_markers" | "malformed_json" | "payload_too_large";

type TaggedJsonParseResult<T> = { ok: true; data: T } | { ok: false; reason: ParseFailureReason };

interface HarnessResultPayload {
  results: unknown[];
  userStdout: string;
  metadata?: {
    userStdoutTruncated?: boolean;
  };
}

export type HarnessResultParse = TaggedJsonParseResult<HarnessResultPayload>;

function parseTaggedJson<T>(
  stdout: string,
  startTag: string,
  endTag: string,
): TaggedJsonParseResult<T> {
  const startIdx = findLastMarkerLine(stdout, startTag);
  if (startIdx === null) {
    return { ok: false, reason: "missing_markers" };
  }

  const startMarkerEnd = startIdx + startTag.length;

  const endIdx = findNextMarkerLine(stdout, endTag, startMarkerEnd);
  if (endIdx === null) {
    return { ok: false, reason: "missing_markers" };
  }

  const jsonStr = stdout.slice(startMarkerEnd + 1, endIdx).trim();
  if (jsonStr.length > EXECUTION_OUTPUT_LIMITS.HARNESS_PAYLOAD_CHARS) {
    return { ok: false, reason: "payload_too_large" };
  }

  try {
    return { ok: true, data: JSON.parse(jsonStr) as T };
  } catch {
    return { ok: false, reason: "malformed_json" };
  }
}

function findLastMarkerLine(stdout: string, marker: string): number | null {
  let searchFrom = stdout.length;
  while (searchFrom >= 0) {
    const markerIdx = stdout.lastIndexOf(marker, searchFrom);
    if (markerIdx === -1) {
      return null;
    }

    const hasLineStart = markerIdx === 0 || stdout[markerIdx - 1] === "\n";
    const nextChar = stdout[markerIdx + marker.length];
    if (hasLineStart && nextChar === "\n") {
      return markerIdx;
    }

    searchFrom = markerIdx - 1;
  }

  return null;
}

function findNextMarkerLine(stdout: string, marker: string, searchFrom: number): number | null {
  let markerIdx = stdout.indexOf(marker, searchFrom);
  while (markerIdx !== -1) {
    const hasLineStart = markerIdx === 0 || stdout[markerIdx - 1] === "\n";
    const nextChar = stdout[markerIdx + marker.length];
    if (hasLineStart && (nextChar === "\n" || nextChar === undefined)) {
      return markerIdx;
    }

    markerIdx = stdout.indexOf(marker, markerIdx + marker.length);
  }

  return null;
}

function formatHarnessValue(value: unknown): string {
  const json = JSON.stringify(value);
  return json ?? String(value);
}

function hasExactCaseIndexes(results: HarnessCase[], testCaseCount: number): boolean {
  if (results.length !== testCaseCount) {
    return false;
  }

  const seen = new Set<number>();
  for (const result of results) {
    if (result.index < 0 || result.index >= testCaseCount || seen.has(result.index)) {
      return false;
    }
    seen.add(result.index);
  }

  return seen.size === testCaseCount;
}

function gradeHarnessResults(
  parsedResults: HarnessCase[],
  testCases: Array<Pick<TestCase, "expectedOutput">>,
): GradedHarnessCase[] | null {
  if (!hasExactCaseIndexes(parsedResults, testCases.length)) {
    return null;
  }

  return [...parsedResults]
    .sort((a, b) => a.index - b.index)
    .map((result): GradedHarnessCase => {
      const expectedOutput = testCases[result.index].expectedOutput;

      if (result.status === "error") {
        return {
          index: result.index,
          passed: false,
          elapsed_ms: result.elapsed_ms,
          error: result.error,
          isErrorTruncated: result.error_truncated,
        };
      }

      if (result.status === "unserializable") {
        return {
          index: result.index,
          passed: false,
          elapsed_ms: result.elapsed_ms,
          got: result.got_repr,
          expected: formatHarnessValue(expectedOutput),
        };
      }

      const passed = isDeepStrictEqual(result.got_json, expectedOutput);
      return {
        index: result.index,
        passed,
        elapsed_ms: result.elapsed_ms,
        got: passed ? null : formatHarnessValue(result.got_json),
        expected: passed ? null : formatHarnessValue(expectedOutput),
      };
    });
}

export const executionService = {
  generateNonce(): string {
    return crypto.randomBytes(8).toString("hex");
  },

  buildHarness(userCode: string, testCases: TestCase[], methodName: string, nonce: string): string {
    return buildPythonHarness(
      userCode,
      testCases.map((tc) => ({ input: tc.input })),
      methodName,
      nonce,
    );
  },

  parseResult(stdout: string, nonce: string): HarnessResultParse {
    return parseTaggedJson(
      stdout,
      `===HARNESS_RESULT_${nonce}===`,
      `===END_HARNESS_RESULT_${nonce}===`,
    );
  },

  parseHarnessModuleError(stdout: string, nonce: string): HarnessModuleError | null {
    const compilationError = parseTaggedJson<HarnessModuleErrorPayload>(
      stdout,
      `===HARNESS_COMPILATION_ERROR_${nonce}===`,
      `===END_HARNESS_COMPILATION_ERROR_${nonce}===`,
    );
    if (compilationError.ok) {
      return {
        error: compilationError.data.error,
        errorType: ExecutionErrorType.COMPILATION_ERROR,
      };
    }

    const runtimeError = parseTaggedJson<HarnessModuleErrorPayload>(
      stdout,
      `===HARNESS_RUNTIME_ERROR_${nonce}===`,
      `===END_HARNESS_RUNTIME_ERROR_${nonce}===`,
    );
    if (runtimeError.ok) {
      return {
        error: runtimeError.data.error,
        errorType: ExecutionErrorType.RUNTIME_ERROR,
      };
    }

    return null;
  },

  buildRunResult(
    parsedResults: HarnessCase[],
    userStdout: string,
    testCases: Array<Pick<TestCase, "input" | "expectedOutput">>,
    metadata?: { userStdoutTruncated?: boolean },
  ): RunResult | null {
    const gradedResults = gradeHarnessResults(parsedResults, testCases);
    if (!gradedResults) {
      return null;
    }

    const cases: CaseResult[] = gradedResults.map((r) => {
      const tc = testCases[r.index];
      const elapsedMs = r.elapsed_ms ?? 0;
      const caseResult: CaseResult = {
        index: r.index,
        passed: r.passed,
        elapsedMs,
      };
      if (elapsedMs > TIMEOUTS.SLOW_CASE_THRESHOLD_MS) {
        caseResult.slow = true;
      }
      if (!r.passed) {
        if (r.error) {
          caseResult.error = r.error;
          caseResult.isErrorTruncated = r.isErrorTruncated || undefined;
        } else {
          caseResult.got = r.got ?? undefined;
          caseResult.expected = r.expected ?? undefined;
        }
        if (tc) {
          caseResult.input = JSON.stringify(tc.input);
        }
      }
      return caseResult;
    });

    return {
      type: "run",
      passed: cases.filter((c) => c.passed).length,
      total: cases.length,
      cases,
      userStdout,
      output: metadata?.userStdoutTruncated ? { hasTruncatedUserStdout: true } : undefined,
    };
  },

  buildSubmitResult(
    parsedResults: HarnessCase[],
    allTestCases: Array<Pick<TestCase, "input" | "expectedOutput" | "isVisible">>,
  ): SubmitResult | null {
    const gradedResults = gradeHarnessResults(parsedResults, allTestCases);
    if (!gradedResults) {
      return null;
    }

    const passed = gradedResults.filter((r) => r.passed).length;
    const total = gradedResults.length;

    const firstFailed = gradedResults.find((r) => !r.passed);
    let firstFailure: SubmitResult["firstFailure"] = null;

    if (firstFailed) {
      const tc = allTestCases[firstFailed.index];
      const hiddenFailure = tc && !tc.isVisible;
      firstFailure = {
        index: firstFailed.index,
        input: hiddenFailure ? "" : tc ? JSON.stringify(tc.input) : "",
        got: hiddenFailure
          ? "Output did not match a hidden test case."
          : (firstFailed.got ?? firstFailed.error ?? ""),
        expected: hiddenFailure ? "Hidden test case expectation." : (firstFailed.expected ?? ""),
        isErrorTruncated: !hiddenFailure && firstFailed.isErrorTruncated ? true : undefined,
      };
    }

    return { type: "submit", passed, total, firstFailure };
  },
};
