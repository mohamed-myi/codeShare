import crypto from "node:crypto";
import type { CaseResult, RunResult, SubmitResult, TestCase } from "@codeshare/shared";
import { ExecutionErrorType, TIMEOUTS } from "@codeshare/shared";

export interface HarnessCase {
  index: number;
  passed: boolean;
  elapsed_ms?: number;
  got?: string | null;
  expected?: string | null;
  error?: string | null;
}

interface HarnessModuleErrorPayload {
  error: string;
}

interface HarnessModuleError {
  error: string;
  errorType: typeof ExecutionErrorType.COMPILATION_ERROR | typeof ExecutionErrorType.RUNTIME_ERROR;
}

const HARNESS_TEMPLATE = `import json, time, traceback, sys, io, os, __future__

_real_fd = os.dup(1)
_real_stdout = os.fdopen(_real_fd, 'w')
_user_stdout = io.StringIO()
sys.stdout = _user_stdout

_user_code = {user_code_json}
_user_globals = {"__name__": "__main__"}

try:
    _compiled_user_code = compile(
        _user_code,
        "script.py",
        "exec",
        flags=__future__.annotations.compiler_flag,
        dont_inherit=True,
    )
    exec(_compiled_user_code, _user_globals)
except SyntaxError:
    _real_stdout.write("===HARNESS_COMPILATION_ERROR_{nonce}===\\n")
    _real_stdout.write(json.dumps({"error": traceback.format_exc()}))
    _real_stdout.write("\\n===END_HARNESS_COMPILATION_ERROR_{nonce}===\\n")
    _real_stdout.flush()
    raise SystemExit(0)
except Exception:
    _real_stdout.write("===HARNESS_RUNTIME_ERROR_{nonce}===\\n")
    _real_stdout.write(json.dumps({"error": traceback.format_exc()}))
    _real_stdout.write("\\n===END_HARNESS_RUNTIME_ERROR_{nonce}===\\n")
    _real_stdout.flush()
    raise SystemExit(0)

test_cases = {test_cases_json}

results = []
for i, tc in enumerate(test_cases):
    _case_stdout = io.StringIO()
    sys.stdout = _case_stdout
    try:
        start = time.time()
        got = _user_globals["Solution"]().{method_name}(**tc["input"])
        elapsed = (time.time() - start) * 1000
        passed = got == tc["expectedOutput"]
        results.append({
            "index": i,
            "passed": passed,
            "elapsed_ms": elapsed,
            "got": repr(got) if not passed else None,
            "expected": repr(tc["expectedOutput"]) if not passed else None
        })
    except Exception:
        results.append({
            "index": i,
            "passed": False,
            "error": traceback.format_exc()
        })
    _user_stdout.write(_case_stdout.getvalue())

_real_stdout.write("===HARNESS_RESULT_{nonce}===\\n")
_real_stdout.write(json.dumps({"results": results, "userStdout": _user_stdout.getvalue()}))
_real_stdout.write("\\n===END_HARNESS_RESULT_{nonce}===\\n")
_real_stdout.flush()`;

function parseTaggedJson<T>(stdout: string, startTag: string, endTag: string): T | null {
  const startIdx = stdout.lastIndexOf(startTag);
  if (startIdx === -1) return null;

  const startMarkerEnd = stdout.indexOf("\n", startIdx);
  if (startMarkerEnd === -1) return null;

  const endIdx = stdout.indexOf(endTag, startMarkerEnd);
  if (endIdx === -1) return null;

  const jsonStr = stdout.slice(startMarkerEnd + 1, endIdx).trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export const executionService = {
  generateNonce(): string {
    return crypto.randomBytes(8).toString("hex");
  },

  buildHarness(userCode: string, testCases: TestCase[], methodName: string, nonce: string): string {
    const userCodeJson = JSON.stringify(userCode);
    const testCasesJson = JSON.stringify(
      testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
    );
    return HARNESS_TEMPLATE.replace("{user_code_json}", userCodeJson)
      .replace("{test_cases_json}", testCasesJson)
      .replace("{method_name}", methodName)
      .replaceAll("{nonce}", nonce);
  },

  parseResult(stdout: string, nonce: string): { results: unknown[]; userStdout: string } | null {
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
    if (compilationError) {
      return {
        error: compilationError.error,
        errorType: ExecutionErrorType.COMPILATION_ERROR,
      };
    }

    const runtimeError = parseTaggedJson<HarnessModuleErrorPayload>(
      stdout,
      `===HARNESS_RUNTIME_ERROR_${nonce}===`,
      `===END_HARNESS_RUNTIME_ERROR_${nonce}===`,
    );
    if (runtimeError) {
      return {
        error: runtimeError.error,
        errorType: ExecutionErrorType.RUNTIME_ERROR,
      };
    }

    return null;
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
          : (firstFailed.got ?? firstFailed.error ?? ""),
        expected: hiddenFailure ? "Hidden test case expectation." : (firstFailed.expected ?? ""),
      };
    }

    return { type: "submit", passed, total, firstFailure };
  },
};
