import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config.js";
import { createGroqClient } from "../GroqClient.js";

const baseConfig: Config = {
  DATABASE_URL: "https://db.example.com/codeshare",
  JUDGE0_API_URL: "https://judge0-ce.p.rapidapi.com",
  JUDGE0_API_KEY: "judge0-key",
  JUDGE0_DAILY_LIMIT: 100,
  GROQ_API_KEY: "groq-test-key",
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
  ENABLE_LLM_TEST_GENERATION: false,
  LLM_TEST_GENERATION_MAX_CASES: 12,
  LLM_TEST_GEN_TEMPERATURE: 0.3,
  LLM_TEST_GEN_MAX_TOKENS: 4096,
  LLM_VERIFY_TEMPERATURE: 0.1,
  LLM_VERIFY_MAX_TOKENS: 256,
};

describe("GroqClient.complete", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns content from non-streaming response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '[{"input":{},"expectedOutput":1}]' } }],
        }),
      }),
    );

    const client = createGroqClient(baseConfig);
    const result = await client.complete([
      { role: "system", content: "You are a test generator." },
      { role: "user", content: "Generate tests." },
    ]);

    expect(result).toBe('[{"input":{},"expectedOutput":1}]');
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const client = createGroqClient(baseConfig);
    await expect(client.complete([{ role: "user", content: "test" }])).rejects.toThrow(
      "Groq API error: 429",
    );
  });

  it("respects temperature and maxTokens overrides", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "42" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createGroqClient(baseConfig);
    await client.complete([{ role: "user", content: "test" }], {
      temperature: 0.1,
      maxTokens: 256,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(256);
    expect(body.stream).toBe(false);
  });
});
