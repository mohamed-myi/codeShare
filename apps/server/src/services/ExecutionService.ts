import type { TestCase, RunResult, SubmitResult } from "@codeshare/shared";

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
    const startMarker = "===HARNESS_RESULT===";
    const endMarker = "===END_HARNESS_RESULT===";
    const startIdx = stdout.indexOf(startMarker);
    const endIdx = stdout.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = stdout.slice(startIdx + startMarker.length, endIdx).trim();
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  },

  buildRunResult(
    _parsedResults: unknown[],
    _userStdout: string,
    _visibleTestCases: TestCase[],
  ): RunResult {
    // TODO: Map parsed results to typed RunResult
    return { type: "run", passed: 0, total: 0, cases: [], userStdout: "" };
  },

  buildSubmitResult(
    _parsedResults: unknown[],
    _allTestCases: TestCase[],
  ): SubmitResult {
    // TODO: Map parsed results to typed SubmitResult
    return { type: "submit", passed: 0, total: 0, firstFailure: null };
  },
};
