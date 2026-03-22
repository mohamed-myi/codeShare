import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.js";

const originalEnv = process.env;

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const nextEnv: NodeJS.ProcessEnv = {
    ...originalEnv,
    DATABASE_URL: "https://db.example.com/codeshare",
    JUDGE0_API_URL: "https://judge0-ce.p.rapidapi.com",
    JUDGE0_API_KEY: "judge0-key",
    JUDGE0_DAILY_LIMIT: "100",
    GROQ_MODEL: "llama-3.3-70b-versatile",
    PORT: "3001",
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:5173",
    ALLOWED_ORIGINS: "http://localhost:5173",
    LOG_LEVEL: "info",
    RATE_LIMIT_ROOM_CREATE: "10",
    RATE_LIMIT_WS_CONNECT: "20",
    RATE_LIMIT_JOIN: "30",
    RATE_LIMIT_IMPORT: "10",
    TRUSTED_PROXY_IPS: "127.0.0.1,::1",
    ENABLE_PROBLEM_IMPORT: "false",
    ENABLE_LLM_HINT_FALLBACK: "false",
    ENABLE_IMPORTED_PROBLEM_HINTS: "false",
    MAX_SOCKET_EVENT_BYTES: "16384",
    MAX_CODE_BYTES: "65536",
    MAX_YJS_MESSAGE_BYTES: "32768",
    MAX_YJS_DOC_BYTES: "65536",
    MAX_LLM_CALLS_PER_ROOM: "15",
    MAX_LLM_PROMPT_CHARS: "12000",
    MAX_LLM_HINT_CHARS: "1500",
    JUDGE0_REQUEST_TIMEOUT_MS: "30000",
    GROQ_MAX_TOKENS: "512",
    GROQ_TEMPERATURE: "0.6",
    GROQ_REQUEST_TIMEOUT_MS: "15000",
    LEETCODE_REQUEST_TIMEOUT_MS: "10000",
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete nextEnv[key];
      continue;
    }
    nextEnv[key] = value;
  }

  process.env = nextEnv;
}

describe("loadConfig", () => {
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("allows GROQ_API_KEY to be omitted", () => {
    setEnv({ GROQ_API_KEY: undefined });

    const config = loadConfig();

    expect(config.GROQ_API_KEY).toBeUndefined();
    expect(config.GROQ_MODEL).toBe("llama-3.3-70b-versatile");
    expect(config.ALLOWED_ORIGINS).toEqual(["http://localhost:5173"]);
    expect(config.ENABLE_PROBLEM_IMPORT).toBe(false);
    expect(config.ENABLE_LLM_HINT_FALLBACK).toBe(false);
    expect(config.ENABLE_IMPORTED_PROBLEM_HINTS).toBe(false);
  });

  it("still fails when required non-Groq variables are missing", () => {
    setEnv({ JUDGE0_API_KEY: undefined });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("rejects empty JUDGE0_API_KEY", () => {
    setEnv({ JUDGE0_API_KEY: "" });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("parses stricter security settings", () => {
    setEnv({
      ALLOWED_ORIGINS: "https://codeshare.example,https://app.codeshare.example",
      ENABLE_PROBLEM_IMPORT: "true",
      ENABLE_LLM_HINT_FALLBACK: "true",
      ENABLE_IMPORTED_PROBLEM_HINTS: "true",
      TRUSTED_PROXY_IPS: "10.0.0.1,10.0.0.2",
    });

    const config = loadConfig();

    expect(config.ALLOWED_ORIGINS).toEqual([
      "https://codeshare.example",
      "https://app.codeshare.example",
    ]);
    expect(config.ENABLE_PROBLEM_IMPORT).toBe(true);
    expect(config.ENABLE_LLM_HINT_FALLBACK).toBe(true);
    expect(config.ENABLE_IMPORTED_PROBLEM_HINTS).toBe(true);
    expect(config.TRUSTED_PROXY_IPS).toEqual(["10.0.0.1", "10.0.0.2"]);
  });
});
