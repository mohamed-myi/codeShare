import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestConfig } from "../../__tests__/helpers/configHelper.js";
import { createGroqClient } from "../GroqClient.js";

const baseConfig = createTestConfig({ GROQ_API_KEY: "groq-test-key" });

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
