import { EXECUTION_OUTPUT_LIMITS } from "@codeshare/shared";

const PYTHON_HARNESS_TEMPLATE = `import __future__
import builtins as _builtins
import json as _json
import os as _os
import subprocess as _subprocess
import sys as _sys
import time as _time
import traceback as _traceback

_JSON_DUMPS = _json.dumps
_JSON_LOADS = _json.loads
_TRACEBACK_FORMAT_EXC = _traceback.format_exc
_PERF_COUNTER = _time.perf_counter
_REPR = repr
_COMPILE = compile
_EXEC = exec
_REAL_IMPORT = _builtins.__import__
_USER_STDOUT_LIMIT = {user_stdout_limit}
_CASE_ERROR_LIMIT = {case_error_limit}
_HARNESS_PAYLOAD_LIMIT = {harness_payload_limit}
_CHILD_TIMEOUT_SECONDS = 10
_USER_CODE = {user_code_json}
_TEST_CASES = {test_cases_json}
_METHOD_NAME = {method_name_json}
_NONCE = {nonce_json}

_DENIED_IMPORT_ROOTS = {
    "ctypes",
    "importlib",
    "inspect",
    "multiprocessing",
    "os",
    "subprocess",
    "sys",
}

_SAFE_BUILTIN_NAMES = (
    "__build_class__",
    "abs",
    "all",
    "any",
    "ArithmeticError",
    "AttributeError",
    "BaseException",
    "bool",
    "bytes",
    "callable",
    "chr",
    "classmethod",
    "complex",
    "dict",
    "divmod",
    "enumerate",
    "Exception",
    "filter",
    "float",
    "format",
    "frozenset",
    "hash",
    "hex",
    "id",
    "IndexError",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "KeyError",
    "len",
    "list",
    "LookupError",
    "map",
    "max",
    "min",
    "NameError",
    "next",
    "NotImplemented",
    "NotImplementedError",
    "object",
    "ord",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "RuntimeError",
    "set",
    "slice",
    "sorted",
    "staticmethod",
    "StopIteration",
    "str",
    "sum",
    "super",
    "tuple",
    "type",
    "TypeError",
    "ValueError",
    "ZeroDivisionError",
    "zip",
)


class _BoundedStdout:
    def __init__(self, limit):
        self._limit = limit
        self._size = 0
        self._parts = []
        self.truncated = False

    def write(self, value):
        text = str(value)
        remaining = self._limit - self._size
        if remaining > 0:
            chunk = text[:remaining]
            self._parts.append(chunk)
            self._size += len(chunk)
        if len(text) > remaining:
            self.truncated = True
        return len(text)

    def flush(self):
        return None

    def getvalue(self):
        return "".join(self._parts)


def _truncate_text(value, limit):
    text = str(value)
    if len(text) <= limit:
        return text, False
    return text[:limit], True


def _safe_repr(value):
    try:
        text = _REPR(value)
    except BaseException:
        text = "<unrepresentable>"
    return _truncate_text(text, _CASE_ERROR_LIMIT)[0]


def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split(".", 1)[0]
    if root in _DENIED_IMPORT_ROOTS:
        raise ImportError(f"Import of {root} is not available during execution")
    return _REAL_IMPORT(name, globals, locals, fromlist, level)


def _safe_builtins():
    safe = {name: getattr(_builtins, name) for name in _SAFE_BUILTIN_NAMES}
    safe["__import__"] = _guarded_import
    return safe


def _compile_user_code(user_code):
    return _COMPILE(
        user_code,
        "script.py",
        "exec",
        flags=__future__.annotations.compiler_flag,
        dont_inherit=True,
    )


def _execute_user_module(user_code):
    user_globals = {
        "__builtins__": _safe_builtins(),
        "__file__": "script.py",
        "__name__": "__main__",
    }
    compiled_user_code = _compile_user_code(user_code)
    _EXEC(compiled_user_code, user_globals)
    return user_globals


def _case_error_result(index, elapsed_ms, error):
    truncated_error, is_truncated = _truncate_text(error, _CASE_ERROR_LIMIT)
    result = {
        "index": index,
        "status": "error",
        "elapsed_ms": elapsed_ms,
        "error": truncated_error,
    }
    if is_truncated:
        result["error_truncated"] = True
    return result


def _child_failure_result(index, message):
    return _case_error_result(index, 0, message)


def _child_preflight(payload):
    try:
        _execute_user_module(payload["user_code"])
        return {"status": "ok"}
    except SyntaxError:
        error, truncated = _truncate_text(_TRACEBACK_FORMAT_EXC(), _CASE_ERROR_LIMIT)
        result = {"status": "syntax_error", "error": error}
        if truncated:
            result["error_truncated"] = True
        return result
    except BaseException:
        error, truncated = _truncate_text(_TRACEBACK_FORMAT_EXC(), _CASE_ERROR_LIMIT)
        result = {"status": "runtime_error", "error": error}
        if truncated:
            result["error_truncated"] = True
        return result


def _child_case(payload, stdout_capture):
    index = payload["index"]
    start = _PERF_COUNTER()
    try:
        user_globals = _execute_user_module(payload["user_code"])
        solution_class = user_globals["Solution"]
        solution = solution_class()
        method = getattr(solution, payload["method_name"])
        got = method(**payload["input"])
        elapsed = (_PERF_COUNTER() - start) * 1000
        try:
            got_json = _JSON_LOADS(_JSON_DUMPS(got, allow_nan=False))
            result = {
                "index": index,
                "status": "ok",
                "elapsed_ms": elapsed,
                "got_json": got_json,
                "got_repr": _safe_repr(got),
            }
        except (TypeError, ValueError):
            result = {
                "index": index,
                "status": "unserializable",
                "elapsed_ms": elapsed,
                "got_repr": _safe_repr(got),
            }
    except BaseException:
        elapsed = (_PERF_COUNTER() - start) * 1000
        result = _case_error_result(index, elapsed, _TRACEBACK_FORMAT_EXC())

    return {
        "status": "ok",
        "result": result,
        "user_stdout": stdout_capture.getvalue(),
        "user_stdout_truncated": stdout_capture.truncated,
    }


def _child_main():
    result_fd = _os.dup(1)
    result_stdout = _os.fdopen(result_fd, "w")
    devnull_fd = _os.open(_os.devnull, _os.O_WRONLY)
    _os.dup2(devnull_fd, 1)
    _os.close(devnull_fd)

    stdout_capture = _BoundedStdout(_USER_STDOUT_LIMIT)
    _sys.stdout = stdout_capture

    try:
        payload = _JSON_LOADS(_sys.stdin.read())
        if payload.get("mode") == "preflight":
            result = _child_preflight(payload)
        else:
            result = _child_case(payload, stdout_capture)
    except BaseException:
        error, truncated = _truncate_text(_TRACEBACK_FORMAT_EXC(), _CASE_ERROR_LIMIT)
        result = {"status": "runtime_error", "error": error}
        if truncated:
            result["error_truncated"] = True

    result_stdout.write(_JSON_DUMPS(result, allow_nan=False))
    result_stdout.flush()


def _script_path():
    return _os.path.abspath(globals().get("__file__", _sys.argv[0]))


def _run_child(payload):
    try:
        process = _subprocess.Popen(
            [_sys.executable, _script_path(), "--codeshare-child"],
            stdin=_subprocess.PIPE,
            stdout=_subprocess.PIPE,
            stderr=_subprocess.PIPE,
            text=True,
        )
        stdout, stderr = process.communicate(
            _JSON_DUMPS(payload, allow_nan=False),
            timeout=_CHILD_TIMEOUT_SECONDS,
        )
    except _subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        return {
            "status": "child_error",
            "error": "Execution process timed out.",
            "stderr": stderr,
        }
    except BaseException:
        return {
            "status": "child_error",
            "error": _TRACEBACK_FORMAT_EXC(),
            "stderr": "",
        }

    if process.returncode != 0:
        return {
            "status": "child_error",
            "error": "Execution process exited unexpectedly.",
            "stderr": stderr,
        }

    if len(stdout) > _HARNESS_PAYLOAD_LIMIT:
        return {
            "status": "child_error",
            "error": "Execution process produced too much harness output.",
            "stderr": stderr,
        }

    try:
        return _JSON_LOADS(stdout)
    except BaseException:
        return {
            "status": "child_error",
            "error": "Execution process returned invalid harness output.",
            "stderr": stderr,
        }


def _emit_tagged_payload(start_tag, end_tag, payload):
    _sys.stdout.write(start_tag + "\\n")
    _sys.stdout.write(_JSON_DUMPS(payload, allow_nan=False))
    _sys.stdout.write("\\n" + end_tag + "\\n")
    _sys.stdout.flush()


def _emit_compilation_error(error):
    _emit_tagged_payload(
        "===HARNESS_COMPILATION_ERROR_" + _NONCE + "===",
        "===END_HARNESS_COMPILATION_ERROR_" + _NONCE + "===",
        {"error": error},
    )


def _emit_runtime_error(error):
    _emit_tagged_payload(
        "===HARNESS_RUNTIME_ERROR_" + _NONCE + "===",
        "===END_HARNESS_RUNTIME_ERROR_" + _NONCE + "===",
        {"error": error},
    )


def _emit_result(results, stdout_capture):
    payload = {
        "results": results,
        "userStdout": stdout_capture.getvalue(),
    }
    if stdout_capture.truncated:
        payload["metadata"] = {"userStdoutTruncated": True}
    _emit_tagged_payload(
        "===HARNESS_RESULT_" + _NONCE + "===",
        "===END_HARNESS_RESULT_" + _NONCE + "===",
        payload,
    )


def _handle_preflight_failure(result):
    error = result.get("error", "Execution failed before running test cases.")
    if result.get("status") == "syntax_error":
        _emit_compilation_error(error)
        return True
    if result.get("status") in {"runtime_error", "child_error"}:
        _emit_runtime_error(error)
        return True
    return False


def _parent_main():
    preflight = _run_child({"mode": "preflight", "user_code": _USER_CODE})
    if _handle_preflight_failure(preflight):
        return

    user_stdout = _BoundedStdout(_USER_STDOUT_LIMIT)
    results = []

    for index, test_case in enumerate(_TEST_CASES):
        child_result = _run_child(
            {
                "mode": "case",
                "index": index,
                "input": test_case["input"],
                "method_name": _METHOD_NAME,
                "user_code": _USER_CODE,
            }
        )
        if child_result.get("status") == "ok":
            results.append(child_result["result"])
            user_stdout.write(child_result.get("user_stdout", ""))
            if child_result.get("user_stdout_truncated"):
                user_stdout.truncated = True
            continue

        results.append(
            _child_failure_result(
                index,
                child_result.get("error", "Execution process failed."),
            )
        )

    _emit_result(results, user_stdout)


if len(_sys.argv) > 1 and _sys.argv[1] == "--codeshare-child":
    _child_main()
else:
    _parent_main()
`;

export function buildPythonHarness(
  userCode: string,
  testCaseInputs: Array<{ input: Record<string, unknown> }>,
  methodName: string,
  nonce: string,
): string {
  return PYTHON_HARNESS_TEMPLATE.replace("{user_code_json}", JSON.stringify(userCode))
    .replace("{test_cases_json}", JSON.stringify(testCaseInputs))
    .replace("{method_name_json}", JSON.stringify(methodName))
    .replace("{nonce_json}", JSON.stringify(nonce))
    .replace("{user_stdout_limit}", String(EXECUTION_OUTPUT_LIMITS.USER_STDOUT_CHARS))
    .replace("{case_error_limit}", String(EXECUTION_OUTPUT_LIMITS.CASE_ERROR_CHARS))
    .replace("{harness_payload_limit}", String(EXECUTION_OUTPUT_LIMITS.HARNESS_PAYLOAD_CHARS));
}
