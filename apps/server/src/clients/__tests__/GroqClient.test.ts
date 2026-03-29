import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestConfig } from "../../__tests__/helpers/configHelper.js";
import { createGroqClient } from "../GroqClient.js";

const baseConfig = createTestConfig({ GROQ_API_KEY: "groq-test-key" });

afterEach(() => {
  vi.restoreAllMocks();
});

function createSseBody(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

describe("GroqClient.complete", () => {

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

  it("surfaces typed dependency metadata for Groq HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const client = createGroqClient(baseConfig);
    const error = await client
      .complete([{ role: "user", content: "test" }])
      .catch((caught) => caught);

    expect(error).toMatchObject({
      dependency: "groq",
      operation: "complete",
      errorType: "http_error",
      statusCode: 429,
      isTimeout: false,
    });
  });

  it("surfaces typed dependency metadata for Groq empty responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      }),
    );

    const client = createGroqClient(baseConfig);
    const error = await client
      .complete([{ role: "user", content: "test" }])
      .catch((caught) => caught);

    expect(error).toMatchObject({
      dependency: "groq",
      operation: "complete",
      errorType: "empty_response",
      isTimeout: false,
    });
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

  it("circuit opens after consecutive failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const client = createGroqClient({
      ...baseConfig,
      GROQ_CB_FAILURE_THRESHOLD: 2,
    });

    await client.complete([{ role: "user", content: "t" }]).catch(() => {});
    await client.complete([{ role: "user", content: "t" }]).catch(() => {});

    expect(client.getCircuitState()).toBe("open");
  });

  it("resets circuit on success", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "ok" } }],
          }),
        });
      }),
    );

    const client = createGroqClient({
      ...baseConfig,
      GROQ_CB_FAILURE_THRESHOLD: 3,
    });

    await client.complete([{ role: "user", content: "t" }]).catch(() => {});
    expect(client.getCircuitState()).toBe("closed");

    await client.complete([{ role: "user", content: "t" }]);
    expect(client.getCircuitState()).toBe("closed");
  });

  it("getCircuitState reflects state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const client = createGroqClient({
      ...baseConfig,
      GROQ_CB_FAILURE_THRESHOLD: 1,
    });

    expect(client.getCircuitState()).toBe("closed");
    await client.complete([{ role: "user", content: "t" }]).catch(() => {});
    expect(client.getCircuitState()).toBe("open");
  });
});

describe("GroqClient.streamCompletion", () => {
  it("yields streamed content chunks and sends an authenticated streaming request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createSseBody([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n',
        "data: [DONE]\n",
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createGroqClient(baseConfig);
    const chunks: string[] = [];

    for await (const chunk of client.streamCompletion([{ role: "user", content: "test" }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hel", "lo"]);
    expect(fetchMock).toHaveBeenCalledWith(
      baseConfig.GROQ_API_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${baseConfig.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe(baseConfig.GROQ_MODEL);
    expect(body.stream).toBe(true);
  });

  it("throws typed dependency errors for invalid stream frames", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: createSseBody(['data: {"choices":[\n']),
      }),
    );

    const client = createGroqClient(baseConfig);
    const error = await (async () => {
      try {
        for await (const _chunk of client.streamCompletion([{ role: "user", content: "test" }])) {
          // Drain until the stream fails.
        }
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toMatchObject({
      dependency: "groq",
      operation: "stream_completion",
      errorType: "invalid_response",
      isTimeout: false,
    });
  });
});
