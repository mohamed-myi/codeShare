import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config.js";
import { createJudge0Client } from "../Judge0Client.js";

const baseConfig: Config = {
  DATABASE_URL: "https://db.example.com/codeshare",
  JUDGE0_API_URL: "https://judge0-ce.p.rapidapi.com",
  JUDGE0_API_KEY: "judge0-key",
  JUDGE0_DAILY_LIMIT: 100,
  GROQ_API_KEY: undefined,
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_API_URL: "https://api.groq.com/openai/v1/chat/completions",
  LEETCODE_GRAPHQL_URL: "https://leetcode.com/graphql",
  PORT: 3001,
  NODE_ENV: "test",
  CORS_ORIGIN: "http://localhost:5173",
  ALLOWED_ORIGINS: ["http://localhost:5173"],
  LOG_LEVEL: "info",
  RATE_LIMIT_ROOM_CREATE: 10,
  RATE_LIMIT_WS_CONNECT: 20,
  RATE_LIMIT_JOIN: 30,
  RATE_LIMIT_IMPORT: 10,
  TRUSTED_PROXY_IPS: [],
  ENABLE_PROBLEM_IMPORT: false,
  ENABLE_LLM_HINT_FALLBACK: false,
  ENABLE_IMPORTED_PROBLEM_HINTS: false,
  MAX_SOCKET_EVENT_BYTES: 16_384,
  MAX_CODE_BYTES: 65_536,
  MAX_YJS_MESSAGE_BYTES: 32_768,
  MAX_YJS_DOC_BYTES: 65_536,
  MAX_LLM_CALLS_PER_ROOM: 15,
  MAX_LLM_PROMPT_CHARS: 12_000,
  MAX_LLM_HINT_CHARS: 1_500,
  ROOM_GRACE_PERIOD_MS: 300_000,
  ROOM_HINT_CONSENT_MS: 30_000,
  ROOM_MAX_SUBMISSIONS: 20,
  ROOM_MAX_IMPORTS: 3,
  ROOM_MAX_CUSTOM_TEST_CASES: 10,
  IMPORTS_DAILY_LIMIT: 50,
  JUDGE0_REQUEST_TIMEOUT_MS: 30_000,
  GROQ_MAX_TOKENS: 512,
  GROQ_TEMPERATURE: 0.6,
  GROQ_REQUEST_TIMEOUT_MS: 15_000,
  LEETCODE_REQUEST_TIMEOUT_MS: 10_000,
};

describe("createJudge0Client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts configurable Judge0 hosts for local stubs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stdout: "ok",
        stderr: null,
        status: { id: 3, description: "Accepted" },
        time: "0.01",
        memory: 1024,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createJudge0Client({
      ...baseConfig,
      JUDGE0_API_URL: "http://127.0.0.1:4100/judge0",
    });

    await expect(client.submit("print('hello')", 5_000)).resolves.toEqual(
      expect.objectContaining({
        stdout: "ok",
        status: { id: 3, description: "Accepted" },
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4100/judge0/submissions?base64_encoded=false&wait=true",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-RapidAPI-Key": "judge0-key",
        }),
      }),
    );
  });

  it("validates the Judge0 response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: { id: "3" } }),
      }),
    );

    const client = createJudge0Client(baseConfig);

    await expect(client.submit("print('hello')", 5_000)).rejects.toThrow(/response/i);
  });
});
