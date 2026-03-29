import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestConfig } from "../../__tests__/helpers/configHelper.js";
import { createJudge0Client } from "../Judge0Client.js";

const baseConfig = createTestConfig({ GROQ_API_KEY: undefined });

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
          "X-RapidAPI-Key": "test-key",
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

  it("surfaces typed dependency metadata for Judge0 HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const client = createJudge0Client(baseConfig);
    const error = await client.submit("print('hello')", 5_000).catch((caught) => caught);

    expect(error).toMatchObject({
      dependency: "judge0",
      operation: "submit",
      errorType: "http_error",
      statusCode: 429,
      isTimeout: false,
    });
  });

  it("surfaces typed dependency metadata for Judge0 timeouts", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const client = createJudge0Client(baseConfig);
    const error = await client.submit("print('hello')", 5_000).catch((caught) => caught);

    expect(error).toMatchObject({
      dependency: "judge0",
      operation: "submit",
      errorType: "timeout",
      isTimeout: true,
    });
  });

  it("circuit opens after consecutive failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const client = createJudge0Client({
      ...baseConfig,
      JUDGE0_CB_FAILURE_THRESHOLD: 2,
    });

    await client.submit("x", 1000).catch(() => {});
    await client.submit("x", 1000).catch(() => {});

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
            stdout: "ok",
            stderr: null,
            status: { id: 3, description: "Accepted" },
            time: "0.01",
            memory: 1024,
          }),
        });
      }),
    );

    const client = createJudge0Client({
      ...baseConfig,
      JUDGE0_CB_FAILURE_THRESHOLD: 3,
    });

    await client.submit("x", 1000).catch(() => {});
    expect(client.getCircuitState()).toBe("closed");

    await client.submit("x", 1000);
    expect(client.getCircuitState()).toBe("closed");
  });

  it("getCircuitState reflects state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const client = createJudge0Client({
      ...baseConfig,
      JUDGE0_CB_FAILURE_THRESHOLD: 1,
    });

    expect(client.getCircuitState()).toBe("closed");
    await client.submit("x", 1000).catch(() => {});
    expect(client.getCircuitState()).toBe("open");
  });
});
