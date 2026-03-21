import type { TestCase, RunResult, SubmitResult, CaseResult } from "@codeshare/shared";
import { TIMEOUTS } from "@codeshare/shared";

export interface HarnessCase {
  index: number;
  passed: boolean;
  elapsed_ms?: number;
  got?: string | null;
  expected?: string | null;
  error?: string | null;
}

const HARNESS_TEMPLATE = `import json, time, traceback, sys, io, os

_real_fd = os.dup(1)
_real_stdout = os.fdopen(_real_fd, 'w')
_user_stdout = io.StringIO()
sys.stdout = _user_stdout

{user_code}

test_cases = {test_cases_json}

results = []
for i, tc in enumerate(test_cases):
    _case_stdout = io.StringIO()
    sys.stdout = _case_stdout
    try:
        start = time.time()
        got = Solution().{method_name}(**tc["input"])
        elapsed = (time.time() - start) * 1000
        passed = got == tc["expectedOutput"]
        results.append({
            "index": i,
            "passed": passed,
            "elapsed_ms": elapsed,
            "got": repr(got) if not passed else None,
            "expected": repr(tc["expectedOutput"]) if not passed else None
        })
    except Exception as e:
        results.append({
            "index": i,
            "passed": False,
            "error": traceback.format_exc()
        })
    _user_stdout.write(_case_stdout.getvalue())

_real_stdout.write("===HARNESS_RESULT===\\n")
_real_stdout.write(json.dumps({"results": results, "userStdout": _user_stdout.getvalue()}))
_real_stdout.write("\\n===END_HARNESS_RESULT===\\n")
_real_stdout.flush()`;

export const executionService = {
  buildHarness(
    userCode: string,
    testCases: TestCase[],
    methodName: string,
  ): string {
    const testCasesJson = JSON.stringify(
      testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
    );
    return HARNESS_TEMPLATE
      .replace("{user_code}", userCode)
      .replace("{test_cases_json}", testCasesJson)
      .replace("{method_name}", methodName);
  },

  parseResult(stdout: string): { results: unknown[]; userStdout: string } | null {
    const startMarker = "===HARNESS_RESULT===\n";
    const endMarker = "\n===END_HARNESS_RESULT===";
    const startIdx = stdout.lastIndexOf(startMarker);
    const endIdx = startIdx === -1
      ? -1
      : stdout.indexOf(endMarker, startIdx + startMarker.length);
    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = stdout.slice(startIdx + startMarker.length, endIdx).trim();
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  },

  buildRunResult(
    parsedResults: HarnessCase[],
    userStdout: string,
    testCases: Array<Pick<TestCase, "input" | "expectedOutput">>,
  ): RunResult {
    const cases: CaseResult[] = parsedResults.map((r) => {
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
    };
  },

  buildSubmitResult(
    parsedResults: HarnessCase[],
    allTestCases: Array<Pick<TestCase, "input" | "expectedOutput" | "isVisible">>,
  ): SubmitResult {
    const passed = parsedResults.filter((r) => r.passed).length;
    const total = parsedResults.length;

    const firstFailed = parsedResults.find((r) => !r.passed);
    let firstFailure: SubmitResult["firstFailure"] = null;

    if (firstFailed) {
      const tc = allTestCases[firstFailed.index];
      const hiddenFailure = tc && !tc.isVisible;
      firstFailure = {
        index: firstFailed.index,
        input: hiddenFailure ? "" : tc ? JSON.stringify(tc.input) : "",
        got: hiddenFailure
          ? "Output did not match a hidden test case."
          : firstFailed.got ?? firstFailed.error ?? "",
        expected: hiddenFailure ? "Hidden test case expectation." : firstFailed.expected ?? "",
      };
    }

    return { type: "submit", passed, total, firstFailure };
  },
};
