import http from "node:http";

const port = Number(process.env.E2E_STUB_PORT || 4100);

function createDefaultScenario() {
  return {
    judge0: {
      delayMs: 0,
      nextMode: null,
    },
    groq: {
      delayMs: 0,
      mode: "success",
      chunks: ["Start by grouping equivalent inputs.", " A hash map keyed by a normalized form works well."],
    },
    leetcode: {
      difficulty: "Medium",
      categoryTitle: "Imported",
      titlePrefix: "Imported",
    },
  };
}

const state = {
  journal: {
    judge0: [],
    groq: [],
    leetcode: [],
  },
  scenario: createDefaultScenario(),
};

function resetState() {
  state.journal = {
    judge0: [],
    groq: [],
    leetcode: [],
  };
  state.scenario = createDefaultScenario();
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

function mergeScenario(nextScenario) {
  state.scenario = {
    judge0: { ...state.scenario.judge0, ...(nextScenario.judge0 ?? {}) },
    groq: { ...state.scenario.groq, ...(nextScenario.groq ?? {}) },
    leetcode: { ...state.scenario.leetcode, ...(nextScenario.leetcode ?? {}) },
  };
}

function toTitleCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toMethodName(slug) {
  const [first, ...rest] = slug.split("-").filter(Boolean);
  return [first ?? "solveImported", ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1))].join("");
}

function extractTestCases(sourceCode) {
  const match = sourceCode.match(/test_cases = (\[[\s\S]*?\])\n\nresults = \[/);
  if (!match) {
    return [];
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function extractMarkerArg(sourceCode, prefix) {
  const match = sourceCode.match(new RegExp(`codeshare-stub:${prefix}:([^\\n\\r#]+)`));
  return match?.[1]?.trim() ?? null;
}

function extractIndexedMarker(sourceCode, prefix) {
  const match = sourceCode.match(new RegExp(`codeshare-stub:${prefix}-(\\d+)`));
  return match ? Number(match[1]) : null;
}

function buildHarnessStdout(results, userStdout = "") {
  return `===HARNESS_RESULT===\n${JSON.stringify({ results, userStdout })}\n===END_HARNESS_RESULT===\n`;
}

function buildJudge0Result(sourceCode) {
  const mode = state.scenario.judge0.nextMode;
  state.scenario.judge0.nextMode = null;

  if (mode === "api-error" || sourceCode.includes("codeshare-stub:api-error")) {
    return {
      statusCode: 500,
      body: { error: "Judge0 stub forced failure" },
    };
  }

  if (mode === "compile-error" || sourceCode.includes("codeshare-stub:compile-error")) {
    return {
      statusCode: 200,
      body: {
        stdout: null,
        stderr: "SyntaxError: invalid syntax",
        status: { id: 6, description: "Compilation Error" },
        time: null,
        memory: null,
      },
    };
  }

  if (mode === "timeout" || sourceCode.includes("codeshare-stub:timeout")) {
    return {
      statusCode: 200,
      body: {
        stdout: null,
        stderr: "Time limit exceeded",
        status: { id: 5, description: "Time Limit Exceeded" },
        time: null,
        memory: null,
      },
    };
  }

  if (mode === "runtime-error" || sourceCode.includes("codeshare-stub:runtime-error")) {
    return {
      statusCode: 200,
      body: {
        stdout: null,
        stderr: "RuntimeError: stub failure",
        status: { id: 11, description: "Runtime Error (NZEC)" },
        time: null,
        memory: null,
      },
    };
  }

  const testCases = extractTestCases(sourceCode);
  const results = testCases.map((testCase, index) => ({
    index,
    passed: true,
    elapsed_ms: 12,
    got: null,
    expected: null,
    error: null,
    input: testCase.input,
  }));

  const failIndex = extractIndexedMarker(sourceCode, "fail-case");
  if (failIndex !== null && results[failIndex]) {
    results[failIndex] = {
      index: failIndex,
      passed: false,
      elapsed_ms: 14,
      got: JSON.stringify("stub-wrong-answer"),
      expected: JSON.stringify(testCases[failIndex]?.expectedOutput ?? null),
      error: null,
    };
  }

  const slowIndex = extractIndexedMarker(sourceCode, "slow-case");
  if (slowIndex !== null && results[slowIndex]?.passed) {
    results[slowIndex].elapsed_ms = 750;
  }

  if (mode === "parse-error" || sourceCode.includes("codeshare-stub:parse-error")) {
    return {
      statusCode: 200,
      body: {
        stdout: "not-json",
        stderr: null,
        status: { id: 3, description: "Accepted" },
        time: "0.01",
        memory: 2048,
      },
    };
  }

  const stdoutMessage = extractMarkerArg(sourceCode, "stdout") ?? "";

  return {
    statusCode: 200,
    body: {
      stdout: buildHarnessStdout(results, stdoutMessage),
      stderr: null,
      status: { id: 3, description: "Accepted" },
      time: "0.01",
      memory: 2048,
    },
  };
}

function buildLeetCodeResponse(slug) {
  const title = `${state.scenario.leetcode.titlePrefix} ${toTitleCase(slug)}`.trim();
  const methodName = toMethodName(slug);

  return {
    data: {
      question: {
        title,
        difficulty: state.scenario.leetcode.difficulty,
        categoryTitle: state.scenario.leetcode.categoryTitle,
        content: `
          <p>Solve the imported problem for slug <code>${slug}</code>.</p>
          <p><strong class="example">Example 1:</strong></p>
          <pre>
            <strong>Input:</strong> nums = [2,7,11,15], target = 9
            <strong>Output:</strong> [0,1]
          </pre>
          <p><strong class="example">Example 2:</strong></p>
          <pre>
            <strong>Input:</strong> nums = [3,2,4], target = 6
            <strong>Output:</strong> [1,2]
          </pre>
          <p><strong>Constraints:</strong></p>
          <ul>
            <li><code>2 &lt;= nums.length &lt;= 10^4</code></li>
            <li><code>-10^9 &lt;= nums[i] &lt;= 10^9</code></li>
          </ul>
        `,
        metaData: JSON.stringify({
          name: methodName,
          params: [
            { name: "nums", type: "integer[]" },
            { name: "target", type: "integer" },
          ],
        }),
        codeSnippets: [
          {
            langSlug: "python3",
            code: `class Solution:\n    def ${methodName}(self, nums: List[int], target: int) -> List[int]:\n        pass\n`,
          },
        ],
      },
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/__journal") {
    sendJson(res, 200, state.journal);
    return;
  }

  if (req.method === "POST" && url.pathname === "/__reset") {
    resetState();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/__scenario") {
    mergeScenario(await readJson(req));
    sendJson(res, 200, { ok: true, scenario: state.scenario });
    return;
  }

  if (req.method === "POST" && url.pathname.endsWith("/judge0/submissions")) {
    const body = await readJson(req);
    state.journal.judge0.push({
      at: new Date().toISOString(),
      body,
    });

    if (state.scenario.judge0.delayMs > 0) {
      await sleep(state.scenario.judge0.delayMs);
    }

    const result = buildJudge0Result(body.source_code ?? "");
    sendJson(res, result.statusCode, result.body);
    return;
  }

  if (req.method === "POST" && url.pathname === "/openai/v1/chat/completions") {
    const body = await readJson(req);
    state.journal.groq.push({
      at: new Date().toISOString(),
      body,
    });

    if (state.scenario.groq.mode === "error") {
      sendJson(res, 500, { error: "Groq stub forced failure" });
      return;
    }

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });

    for (const chunk of state.scenario.groq.chunks) {
      if (state.scenario.groq.delayMs > 0) {
        await sleep(state.scenario.groq.delayMs);
      }
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/graphql") {
    const body = await readJson(req);
    const slug = body?.variables?.titleSlug ?? "imported-problem";

    state.journal.leetcode.push({
      at: new Date().toISOString(),
      body,
      slug,
    });

    sendJson(res, 200, buildLeetCodeResponse(slug));
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`E2E stub server listening on http://127.0.0.1:${port}`);
});
