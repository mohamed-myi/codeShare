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
});
