import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EXECUTION_OUTPUT_LIMITS,
  type RunResult,
  type SubmitResult,
  type TestCase,
} from "@codeshare/shared";
import { describe, expect, it } from "vitest";
import { executionService, type HarnessCase } from "../ExecutionService.js";

const makeTestCase = (
  input: Record<string, unknown>,
  expectedOutput: unknown,
  overrides?: Partial<TestCase>,
): TestCase => ({
  id: "tc-1",
  problemId: "p1",
  input,
  expectedOutput,
  isVisible: true,
  orderIndex: 0,
  ...overrides,
});

const makeOkResult = (
  index: number,
  gotJson: unknown,
  elapsedMs = 5,
): Extract<HarnessCase, { status: "ok" }> => ({
  index,
  status: "ok",
  elapsed_ms: elapsedMs,
  got_json: gotJson,
  got_repr: JSON.stringify(gotJson),
});

const makeErrorResult = (
  index: number,
  error: string,
  elapsedMs = 0,
): Extract<HarnessCase, { status: "error" }> => ({
  index,
  status: "error",
  elapsed_ms: elapsedMs,
  error,
});

const makeUnserializableResult = (
  index: number,
  gotRepr: string,
  elapsedMs = 5,
): Extract<HarnessCase, { status: "unserializable" }> => ({
  index,
  status: "unserializable",
  elapsed_ms: elapsedMs,
  got_repr: gotRepr,
});

function requireRunResult(result: RunResult | null): RunResult {
  expect(result).not.toBeNull();
  return result as RunResult;
}

function requireSubmitResult(result: SubmitResult | null): SubmitResult {
  expect(result).not.toBeNull();
  return result as SubmitResult;
}

function requireParsedResult(result: ReturnType<typeof executionService.parseResult>) {
  if (!result.ok) {
    throw new Error(`Expected parsed harness payload, got ${result.reason}`);
  }
  expect(result.ok).toBe(true);
  return result.data;
}

function findPythonCommand(): string | null {
  for (const command of ["python3", "python"]) {
    const result = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (result.status === 0) {
      return command;
    }
  }
  return null;
}

const pythonCommand = findPythonCommand();
const pythonIt = pythonCommand ? it : it.skip;

function runPythonHarness(userCode: string, testCases: TestCase[], methodName = "solve") {
  if (!pythonCommand) {
    throw new Error("Python is not available");
  }

  const nonce = "deadbeef01234567";
  const harness = executionService.buildHarness(userCode, testCases, methodName, nonce);
  const tempDir = mkdtempSync(join(tmpdir(), "codeshare-harness-"));
  const scriptPath = join(tempDir, "script.py");
  writeFileSync(scriptPath, harness);

  try {
    const result = spawnSync(pythonCommand, [scriptPath], {
      encoding: "utf8",
      maxBuffer: EXECUTION_OUTPUT_LIMITS.HARNESS_PAYLOAD_CHARS * 2,
      timeout: 5_000,
    });

    return { nonce, stdout: result.stdout, stderr: result.stderr, status: result.status };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("parseResult", () => {
  const nonce = "abc123";

  it("parses the final harness payload when stdout contains earlier marker-shaped text", () => {
    const spoofedPayload = JSON.stringify({
      results: [{ index: 99, passed: true }],
      userStdout: "spoofed",
    });
    const realPayload = JSON.stringify({
      results: [{ index: 0, passed: false, got: "1", expected: "2" }],
      userStdout: "actual",
    });

    const stdout = [
      `===HARNESS_RESULT_${nonce}===`,
      spoofedPayload,
      `===END_HARNESS_RESULT_${nonce}===`,
      "user noise",
      `===HARNESS_RESULT_${nonce}===`,
      realPayload,
      `===END_HARNESS_RESULT_${nonce}===`,
    ].join("\n");

    expect(requireParsedResult(executionService.parseResult(stdout, nonce))).toEqual(
      JSON.parse(realPayload),
    );
  });

  it("returns null for empty stdout", () => {
    expect(executionService.parseResult("", nonce)).toEqual({
      ok: false,
      reason: "missing_markers",
    });
  });

  it("returns null when start marker present but end marker missing", () => {
    const stdout = `===HARNESS_RESULT_${nonce}===\n{"results":[]}\nno end marker`;
    expect(executionService.parseResult(stdout, nonce)).toEqual({
      ok: false,
      reason: "missing_markers",
    });
  });

  it("returns null when JSON between markers is malformed", () => {
    const stdout = `===HARNESS_RESULT_${nonce}===\n{not valid json}\n===END_HARNESS_RESULT_${nonce}===`;
    expect(executionService.parseResult(stdout, nonce)).toEqual({
      ok: false,
      reason: "malformed_json",
    });
  });

  it("rejects oversized harness payloads before JSON.parse", () => {
    const oversizedPayload = "x".repeat(EXECUTION_OUTPUT_LIMITS.HARNESS_PAYLOAD_CHARS + 1);
    const stdout = `===HARNESS_RESULT_${nonce}===\n${oversizedPayload}\n===END_HARNESS_RESULT_${nonce}===`;

    expect(executionService.parseResult(stdout, nonce)).toEqual({
      ok: false,
      reason: "payload_too_large",
    });
  });

  it("rejects output with wrong nonce", () => {
    const payload = JSON.stringify({ results: [], userStdout: "" });
    const stdout = `===HARNESS_RESULT_wrong===\n${payload}\n===END_HARNESS_RESULT_wrong===`;
    expect(executionService.parseResult(stdout, nonce)).toEqual({
      ok: false,
      reason: "missing_markers",
    });
  });
});

describe("buildHarness", () => {
  it("embeds user code, test case inputs, method name, and nonce without expected outputs", () => {
    const testCases = [makeTestCase({ n: 5 }, "secret-expected-output")];
    const nonce = "testnonce123";
    const harness = executionService.buildHarness(
      "class Solution:\n  def solve(self, n): return n * 2",
      testCases,
      "solve",
      nonce,
    );
    expect(harness).toContain("class Solution:");
    expect(harness).toContain('_METHOD_NAME = "solve"');
    expect(harness).toContain('"===HARNESS_RESULT_" + _NONCE + "==="');
    expect(harness).toContain('"===END_HARNESS_RESULT_" + _NONCE + "==="');
    expect(harness).toContain(`_NONCE = "${nonce}"`);
    expect(harness).toContain('"input":{"n":5}');
    expect(harness).not.toContain("expectedOutput");
    expect(harness).not.toContain("secret-expected-output");
  });

  it("prepends postponed annotation evaluation before user code", () => {
    const harness = executionService.buildHarness(
      "class Solution:\n    def solve(self, nums: List[int]) -> int:\n        return len(nums)",
      [makeTestCase({ nums: [1, 2] }, 2)],
      "solve",
      "nonce123",
    );

    expect(harness).toContain("__future__.annotations.compiler_flag");
    expect(harness).toContain("def solve(self, nums: List[int]) -> int:");
  });

  it("preserves user imports inside the compiled source module", () => {
    const harness = executionService.buildHarness(
      "from __future__ import annotations\nimport heapq\n\nclass Solution:\n    def solve(self, nums: List[int]) -> int:\n        return len(nums)",
      [makeTestCase({ nums: [1, 2] }, 2)],
      "solve",
      "nonce123",
    );

    expect(harness).toContain('_USER_CODE = "from __future__ import annotations\\nimport heapq');
    expect(harness).toContain("compiled_user_code = _compile_user_code(user_code)");
    expect(harness).toContain('"script.py"');
    expect(harness).toContain("flags=__future__.annotations.compiler_flag");
  });

  it("embeds the provided nonce in both start and end markers", () => {
    const testCases = [makeTestCase({ n: 1 }, 1)];
    const nonce = "deadbeef01234567";
    const harness = executionService.buildHarness("pass", testCases, "solve", nonce);
    expect(harness).toContain(`_NONCE = "${nonce}"`);
    expect(harness).toContain('"===HARNESS_RESULT_" + _NONCE + "==="');
    expect(harness).toContain('"===END_HARNESS_RESULT_" + _NONCE + "==="');
  });
});

describe("Python harness runtime", () => {
  pythonIt("caps captured userStdout and reports truncation metadata", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "class Solution:",
        "    def solve(self, n):",
        `        print("x" * ${EXECUTION_OUTPUT_LIMITS.USER_STDOUT_CHARS + 100})`,
        "        return n",
      ].join("\n"),
      [makeTestCase({ n: 1 }, 1)],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.userStdout).toHaveLength(EXECUTION_OUTPUT_LIMITS.USER_STDOUT_CHARS);
    expect(data.metadata?.userStdoutTruncated).toBe(true);
  });

  pythonIt("caps per-case tracebacks and reports truncation metadata", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "class Solution:",
        "    def solve(self, n):",
        `        raise ValueError("x" * ${EXECUTION_OUTPUT_LIMITS.CASE_ERROR_CHARS + 100})`,
      ].join("\n"),
      [makeTestCase({ n: 1 }, 1)],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));
    const firstResult = data.results[0] as HarnessCase;

    expect(firstResult.status).toBe("error");
    if (firstResult.status !== "error") {
      throw new Error("Expected error result");
    }
    expect(firstResult.error).toHaveLength(EXECUTION_OUTPUT_LIMITS.CASE_ERROR_CHARS);
    expect(firstResult.error_truncated).toBe(true);
  });

  pythonIt("isolates global state between cases", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "counter = 0",
        "class Solution:",
        "    def solve(self, n):",
        "        global counter",
        "        counter += 1",
        "        return counter",
      ].join("\n"),
      [makeTestCase({ n: 1 }, 1), makeTestCase({ n: 2 }, 1, { id: "tc-2", orderIndex: 1 })],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.results).toMatchObject([
      { index: 0, status: "ok", got_json: 1 },
      { index: 1, status: "ok", got_json: 1 },
    ]);
  });

  pythonIt("keeps monkey-patched modules from corrupting harness output", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "import json, time, traceback",
        "json.dumps = lambda *args, **kwargs: 'bad json'",
        "time.time = lambda: 0",
        "traceback.format_exc = lambda: 'bad traceback'",
        "class Solution:",
        "    def solve(self, n):",
        "        return {'value': n}",
      ].join("\n"),
      [makeTestCase({ n: 7 }, { value: 7 })],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.results).toMatchObject([{ index: 0, status: "ok", got_json: { value: 7 } }]);
  });

  pythonIt("blocks practical frame inspection imports from user code", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "class Solution:",
        "    def solve(self, n):",
        "        try:",
        "            import inspect",
        "            return len(inspect.stack())",
        "        except Exception:",
        "            return 'blocked'",
      ].join("\n"),
      [makeTestCase({ n: 1 }, "blocked")],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.results).toMatchObject([{ index: 0, status: "ok", got_json: "blocked" }]);
  });

  pythonIt("prevents stdout marker spoofing from raw user output", () => {
    const spoofNonce = "deadbeef01234567";
    const { nonce, stdout, status } = runPythonHarness(
      [
        "class Solution:",
        "    def solve(self, n):",
        `        print("===HARNESS_RESULT_${spoofNonce}===")`,
        '        print(\'{"results":[{"index":0,"status":"ok","got_json":"spoofed"}],"userStdout":"spoofed"}\')',
        `        print("===END_HARNESS_RESULT_${spoofNonce}===")`,
        "        return n",
      ].join("\n"),
      [makeTestCase({ n: 3 }, 3)],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.results).toMatchObject([{ index: 0, status: "ok", got_json: 3 }]);
    expect(data.userStdout).toContain("HARNESS_RESULT");
  });

  pythonIt("contains os._exit attempts as user-code errors", () => {
    const { nonce, stdout, status } = runPythonHarness(
      [
        "class Solution:",
        "    def solve(self, n):",
        "        try:",
        "            __import__('os')._exit(0)",
        "        except Exception:",
        "            return 'blocked'",
      ].join("\n"),
      [makeTestCase({ n: 1 }, "blocked")],
    );

    expect(status).toBe(0);
    const data = requireParsedResult(executionService.parseResult(stdout, nonce));

    expect(data.results).toMatchObject([{ index: 0, status: "ok", got_json: "blocked" }]);
  });
});

describe("parseHarnessModuleError", () => {
  const nonce = "abc123";

  it("parses compilation markers emitted by the wrapper", () => {
    const stdout = [
      `===HARNESS_COMPILATION_ERROR_${nonce}===`,
      JSON.stringify({ error: "SyntaxError: invalid syntax" }),
      `===END_HARNESS_COMPILATION_ERROR_${nonce}===`,
    ].join("\n");

    expect(executionService.parseHarnessModuleError(stdout, nonce)).toEqual({
      error: "SyntaxError: invalid syntax",
      errorType: "compilation_error",
    });
  });

  it("parses runtime markers emitted during module initialization", () => {
    const stdout = [
      `===HARNESS_RUNTIME_ERROR_${nonce}===`,
      JSON.stringify({ error: "ModuleNotFoundError: No module named 'sortedcontainers'" }),
      `===END_HARNESS_RUNTIME_ERROR_${nonce}===`,
    ].join("\n");

    expect(executionService.parseHarnessModuleError(stdout, nonce)).toEqual({
      error: "ModuleNotFoundError: No module named 'sortedcontainers'",
      errorType: "runtime_error",
    });
  });
});

describe("buildRunResult", () => {
  it("all cases pass: correct type, passed/total, each case has passed + elapsedMs", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, [0, 1], 12), makeOkResult(1, [1, 2], 8)];
    const testCases = [
      makeTestCase({ nums: [2, 7], target: 9 }, [0, 1]),
      makeTestCase({ nums: [3, 2, 4], target: 6 }, [1, 2], { id: "tc-2", orderIndex: 1 }),
    ];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.type).toBe("run");
    expect(result.passed).toBe(2);
    expect(result.total).toBe(2);
    expect(result.cases).toHaveLength(2);
    expect(result.cases[0].passed).toBe(true);
    expect(result.cases[0].elapsedMs).toBe(12);
    expect(result.cases[1].passed).toBe(true);
    expect(result.cases[1].elapsedMs).toBe(8);
  });

  it("failed case: server compares actual to expected and populates got, expected, and input", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, [1, 0], 15)];
    const testCases = [makeTestCase({ nums: [2, 7], target: 9 }, [0, 1])];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.passed).toBe(0);
    expect(result.total).toBe(1);
    expect(result.cases[0].passed).toBe(false);
    expect(result.cases[0].got).toBe("[1,0]");
    expect(result.cases[0].expected).toBe("[0,1]");
    expect(result.cases[0].input).toBe(JSON.stringify({ nums: [2, 7], target: 9 }));
  });

  it("error case: error string populated, no got/expected", () => {
    const parsed: HarnessCase[] = [makeErrorResult(0, "NameError: name 'x' is not defined")];
    const testCases = [makeTestCase({ x: 1 }, 2)];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.cases[0].passed).toBe(false);
    expect(result.cases[0].error).toBe("NameError: name 'x' is not defined");
    expect(result.cases[0].got).toBeUndefined();
    expect(result.cases[0].expected).toBeUndefined();
  });

  it("slow case flagged: elapsed_ms > 500 sets slow: true", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1, 600), makeOkResult(1, 2, 100)];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.cases[0].slow).toBe(true);
    expect(result.cases[1].slow).toBeFalsy();
  });

  it("userStdout passed through", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1)];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = requireRunResult(
      executionService.buildRunResult(parsed, "debug output\nline 2", testCases),
    );

    expect(result.userStdout).toBe("debug output\nline 2");
  });

  it("reports truncated userStdout as run output metadata", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1)];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = requireRunResult(
      executionService.buildRunResult(parsed, "debug output", testCases, {
        userStdoutTruncated: true,
      }),
    );

    expect(result.output?.hasTruncatedUserStdout).toBe(true);
  });

  it("reports truncated per-case error metadata", () => {
    const parsed: HarnessCase[] = [
      {
        ...makeErrorResult(0, "Traceback".repeat(10)),
        error_truncated: true,
      },
    ];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.cases[0].isErrorTruncated).toBe(true);
  });

  it("custom test cases appended after visible (correct indexing)", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1), makeOkResult(1, 99, 10)];
    const allTestCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 42, { id: "custom-1", orderIndex: 1 }),
    ];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", allTestCases));

    expect(result.total).toBe(2);
    expect(result.cases[1].input).toBe(JSON.stringify({ n: 2 }));
    expect(result.cases[1].got).toBe("99");
    expect(result.cases[1].expected).toBe("42");
  });

  it("missing elapsed_ms defaults to 0", () => {
    const parsed: HarnessCase[] = [{ index: 0, status: "ok", got_json: 1, got_repr: "1" }];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.cases[0].elapsedMs).toBe(0);
  });

  it("unserializable actual output fails visible cases with got_repr and server expected output", () => {
    const parsed: HarnessCase[] = [makeUnserializableResult(0, "<object object at 0xabc>", 9)];
    const testCases = [makeTestCase({ n: 1 }, { value: 1 })];

    const result = requireRunResult(executionService.buildRunResult(parsed, "", testCases));

    expect(result.passed).toBe(0);
    expect(result.cases[0].got).toBe("<object object at 0xabc>");
    expect(result.cases[0].expected).toBe('{"value":1}');
  });

  it("rejects duplicate harness indexes", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1), makeOkResult(0, 1)];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
    ];

    expect(executionService.buildRunResult(parsed, "", testCases)).toBeNull();
  });

  it("rejects missing harness indexes", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, 1)];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
    ];

    expect(executionService.buildRunResult(parsed, "", testCases)).toBeNull();
  });

  it("rejects out-of-range harness indexes", () => {
    const parsed: HarnessCase[] = [makeOkResult(1, 1)];
    const testCases = [makeTestCase({ n: 1 }, 1)];

    expect(executionService.buildRunResult(parsed, "", testCases)).toBeNull();
  });
});

describe("buildSubmitResult", () => {
  it("all pass: firstFailure is null", () => {
    const parsed: HarnessCase[] = [
      makeOkResult(0, 1),
      makeOkResult(1, 2, 3),
      makeOkResult(2, 3, 7),
    ];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 2 }, 2, { id: "tc-2", orderIndex: 1 }),
      makeTestCase({ n: 3 }, 3, { id: "tc-3", orderIndex: 2 }),
    ];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.type).toBe("submit");
    expect(result.passed).toBe(3);
    expect(result.total).toBe(3);
    expect(result.firstFailure).toBeNull();
  });

  it("first failure captured with correct index, got, expected, input", () => {
    const parsed: HarnessCase[] = [
      makeOkResult(0, [0]),
      makeOkResult(1, [2, 1], 10),
      makeOkResult(2, [3, 0], 8),
    ];
    const testCases = [
      makeTestCase({ nums: [1], target: 1 }, [0], { id: "tc-1", orderIndex: 0 }),
      makeTestCase({ nums: [3, 2], target: 5 }, [1, 2], { id: "tc-2", orderIndex: 1 }),
      makeTestCase({ nums: [5, 3], target: 8 }, [0, 3], { id: "tc-3", orderIndex: 2 }),
    ];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.passed).toBe(1);
    expect(result.total).toBe(3);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure?.index).toBe(1);
    expect(result.firstFailure?.got).toBe("[2,1]");
    expect(result.firstFailure?.expected).toBe("[1,2]");
    expect(result.firstFailure?.input).toBe(JSON.stringify({ nums: [3, 2], target: 5 }));
  });

  it("multiple failures: only first captured", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, "wrong0"), makeOkResult(1, "wrong1", 3)];
    const testCases = [
      makeTestCase({ a: 1 }, 10),
      makeTestCase({ a: 2 }, 20, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.firstFailure?.index).toBe(0);
    expect(result.firstFailure?.got).toBe('"wrong0"');
  });

  it("error case counts as failure", () => {
    const parsed: HarnessCase[] = [
      makeOkResult(0, 1),
      makeErrorResult(1, "RuntimeError: division by zero"),
    ];
    const testCases = [
      makeTestCase({ n: 1 }, 1),
      makeTestCase({ n: 0 }, 0, { id: "tc-2", orderIndex: 1 }),
    ];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.passed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure?.index).toBe(1);
  });

  it("reports visible first-failure error truncation", () => {
    const parsed: HarnessCase[] = [
      {
        ...makeErrorResult(0, "Traceback".repeat(10)),
        error_truncated: true,
      },
    ];
    const testCases = [makeTestCase({ n: 0 }, 0)];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.firstFailure?.isErrorTruncated).toBe(true);
  });

  it("redacts hidden test case details in firstFailure", () => {
    const parsed: HarnessCase[] = [makeOkResult(0, [1, 0])];
    const testCases = [makeTestCase({ nums: [2, 7] }, [0, 1], { isVisible: false })];
    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));
    expect(result.firstFailure).not.toBeNull();
    expect(result.firstFailure?.input).toBe("");
    expect(result.firstFailure?.got).toContain("hidden");
    expect(result.firstFailure?.expected).toContain("Hidden");
  });

  it("redacts hidden unserializable actual outputs in firstFailure", () => {
    const parsed: HarnessCase[] = [makeUnserializableResult(0, "<secret object repr>")];
    const testCases = [makeTestCase({ nums: [2, 7] }, [0, 1], { isVisible: false })];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.firstFailure?.input).toBe("");
    expect(result.firstFailure?.got).toContain("hidden");
    expect(result.firstFailure?.got).not.toContain("secret object");
    expect(result.firstFailure?.expected).toContain("Hidden");
  });

  it("does not expose hidden first-failure error truncation metadata", () => {
    const parsed: HarnessCase[] = [
      {
        ...makeErrorResult(0, "Traceback".repeat(10)),
        error_truncated: true,
      },
    ];
    const testCases = [makeTestCase({ nums: [2, 7] }, [0, 1], { isVisible: false })];

    const result = requireSubmitResult(executionService.buildSubmitResult(parsed, testCases));

    expect(result.firstFailure?.isErrorTruncated).toBeUndefined();
  });
});
