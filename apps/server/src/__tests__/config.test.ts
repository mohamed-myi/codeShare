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
    GROQ_API_URL: "https://api.groq.com/openai/v1/chat/completions",
    LEETCODE_GRAPHQL_URL: "https://leetcode.com/graphql",
    PORT: "3001",
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:5173",
    ALLOWED_ORIGINS: "http://localhost:5173",
    LOG_LEVEL: "info",
    RATE_LIMIT_ROOM_CREATE: "10",
    RATE_LIMIT_WS_CONNECT: "20",
    RATE_LIMIT_JOIN: "30",
    RATE_LIMIT_IMPORT: "10",
    RATE_LIMIT_ACCESS_LOGIN: "10",
    RELIABILITY_STORE: "memory",
    REDIS_URL: undefined,
    REDIS_CONNECT_TIMEOUT_MS: "1000",
    TRUSTED_PROXY_IPS: "127.0.0.1,::1",
    ENABLE_PRIVATE_ACCESS: "false",
    ACCESS_SESSION_SECRET: undefined,
    ACCESS_SESSION_TTL_DAYS: "30",
    ACCESS_COOKIE_NAME: "codeshare_access",
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
    ROOM_IDLE_TTL_MS: "1800000",
    ROOM_SWEEP_INTERVAL_MS: "60000",
    ROOM_GRACE_PERIOD_MS: "300000",
    ROOM_HINT_CONSENT_MS: "30000",
    ROOM_HINT_COOLDOWN_MS: "5000",
    ROOM_MAX_SUBMISSIONS: "20",
    ROOM_MAX_IMPORTS: "3",
    ROOM_MAX_CUSTOM_TEST_CASES: "10",
    IMPORTS_DAILY_LIMIT: "50",
    JUDGE0_REQUEST_TIMEOUT_MS: "30000",
    JUDGE0_MAX_IN_FLIGHT: "4",
    JUDGE0_MAX_QUEUE: "20",
    IMPORT_MAX_IN_FLIGHT: "2",
    IMPORT_MAX_QUEUE: "10",
    LLM_MAX_IN_FLIGHT: "2",
    LLM_MAX_QUEUE: "10",
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
    expect(config.GROQ_API_URL).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(config.LEETCODE_GRAPHQL_URL).toBe("https://leetcode.com/graphql");
    expect(config.ALLOWED_ORIGINS).toEqual(["http://localhost:5173"]);
    expect(config.ENABLE_PROBLEM_IMPORT).toBe(false);
    expect(config.ENABLE_LLM_HINT_FALLBACK).toBe(false);
    expect(config.ENABLE_IMPORTED_PROBLEM_HINTS).toBe(false);
    expect(config.ENABLE_PRIVATE_ACCESS).toBe(false);
    expect(config.ACCESS_SESSION_TTL_DAYS).toBe(30);
    expect(config.ACCESS_COOKIE_NAME).toBe("codeshare_access");
    expect(config.RELIABILITY_STORE).toBe("memory");
    expect(config.REDIS_URL).toBeUndefined();
    expect(config.REDIS_CONNECT_TIMEOUT_MS).toBe(1_000);
    expect(config.ROOM_IDLE_TTL_MS).toBe(1_800_000);
    expect(config.ROOM_SWEEP_INTERVAL_MS).toBe(60_000);
    expect(config.JUDGE0_MAX_IN_FLIGHT).toBe(4);
    expect(config.JUDGE0_MAX_QUEUE).toBe(20);
    expect(config.IMPORT_MAX_IN_FLIGHT).toBe(2);
    expect(config.IMPORT_MAX_QUEUE).toBe(10);
    expect(config.LLM_MAX_IN_FLIGHT).toBe(2);
    expect(config.LLM_MAX_QUEUE).toBe(10);
    expect(config.ROOM_GRACE_PERIOD_MS).toBe(300_000);
    expect(config.ROOM_HINT_CONSENT_MS).toBe(30_000);
    expect(config.ROOM_HINT_COOLDOWN_MS).toBe(5_000);
    expect(config.ROOM_MAX_SUBMISSIONS).toBe(20);
    expect(config.ROOM_MAX_IMPORTS).toBe(3);
    expect(config.ROOM_MAX_CUSTOM_TEST_CASES).toBe(10);
    expect(config.IMPORTS_DAILY_LIMIT).toBe(50);
  });

  it("still fails when required non-Groq variables are missing", () => {
    setEnv({ JUDGE0_API_KEY: undefined });

    const stderrWrites: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const logEntry = JSON.parse(stderrWrites.join("").trim()) as Record<string, unknown>;
    expect(stderrSpy).toHaveBeenCalled();
    expect(logEntry.event).toBe("bootstrap_validation_failed");
    expect(logEntry.service).toBe("codeshare-server");
    expect(logEntry.invalid_fields).toContain("JUDGE0_API_KEY");
  });

  it("rejects empty JUDGE0_API_KEY", () => {
    setEnv({ JUDGE0_API_KEY: "" });

    const stderrWrites: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const logEntry = JSON.parse(stderrWrites.join("").trim()) as Record<string, unknown>;
    expect(stderrSpy).toHaveBeenCalled();
    expect(logEntry.event).toBe("bootstrap_validation_failed");
    expect(logEntry.invalid_fields).toContain("JUDGE0_API_KEY");
  });

  it("parses stricter security settings", () => {
    setEnv({
      ALLOWED_ORIGINS: "https://codeshare.example,https://app.codeshare.example",
      ENABLE_PROBLEM_IMPORT: "true",
      ENABLE_LLM_HINT_FALLBACK: "true",
      ENABLE_IMPORTED_PROBLEM_HINTS: "true",
      ENABLE_PRIVATE_ACCESS: "true",
      ACCESS_SESSION_SECRET: "private-access-secret",
      ACCESS_SESSION_TTL_DAYS: "14",
      ACCESS_COOKIE_NAME: "codeshare_private",
      TRUSTED_PROXY_IPS: "10.0.0.1,10.0.0.2",
      GROQ_API_URL: "http://127.0.0.1:4100/openai/v1/chat/completions",
      LEETCODE_GRAPHQL_URL: "http://127.0.0.1:4100/graphql",
      ROOM_GRACE_PERIOD_MS: "1500",
      ROOM_HINT_CONSENT_MS: "2000",
      ROOM_HINT_COOLDOWN_MS: "1200",
      ROOM_MAX_SUBMISSIONS: "4",
      ROOM_MAX_IMPORTS: "2",
      ROOM_MAX_CUSTOM_TEST_CASES: "3",
      IMPORTS_DAILY_LIMIT: "8",
    });

    const config = loadConfig();

    expect(config.ALLOWED_ORIGINS).toEqual([
      "https://codeshare.example",
      "https://app.codeshare.example",
    ]);
    expect(config.ENABLE_PROBLEM_IMPORT).toBe(true);
    expect(config.ENABLE_LLM_HINT_FALLBACK).toBe(true);
    expect(config.ENABLE_IMPORTED_PROBLEM_HINTS).toBe(true);
    expect(config.ENABLE_PRIVATE_ACCESS).toBe(true);
    expect(config.ACCESS_SESSION_SECRET).toBe("private-access-secret");
    expect(config.ACCESS_SESSION_TTL_DAYS).toBe(14);
    expect(config.ACCESS_COOKIE_NAME).toBe("codeshare_private");
    expect(config.TRUSTED_PROXY_IPS).toEqual(["10.0.0.1", "10.0.0.2"]);
    expect(config.GROQ_API_URL).toBe("http://127.0.0.1:4100/openai/v1/chat/completions");
    expect(config.LEETCODE_GRAPHQL_URL).toBe("http://127.0.0.1:4100/graphql");
    expect(config.ROOM_GRACE_PERIOD_MS).toBe(1_500);
    expect(config.ROOM_HINT_CONSENT_MS).toBe(2_000);
    expect(config.ROOM_HINT_COOLDOWN_MS).toBe(1_200);
    expect(config.ROOM_MAX_SUBMISSIONS).toBe(4);
    expect(config.ROOM_MAX_IMPORTS).toBe(2);
    expect(config.ROOM_MAX_CUSTOM_TEST_CASES).toBe(3);
    expect(config.IMPORTS_DAILY_LIMIT).toBe(8);
  });

  it("emits a structured configuration rejection when production origins are empty", () => {
    setEnv({
      NODE_ENV: "production",
      ALLOWED_ORIGINS: " , ",
      JUDGE0_API_KEY: "super-secret-key",
    });

    const stderrWrites: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);

    const logEntry = JSON.parse(stderrWrites.join("").trim()) as Record<string, unknown>;
    expect(stderrSpy).toHaveBeenCalled();
    expect(logEntry.event).toBe("bootstrap_configuration_rejected");
    expect(logEntry.invalid_fields).toEqual(["ALLOWED_ORIGINS"]);
    expect(JSON.stringify(logEntry)).not.toContain("super-secret-key");
  });

  it("rejects private access when the session secret is missing", () => {
    setEnv({
      ENABLE_PRIVATE_ACCESS: "true",
      ACCESS_SESSION_SECRET: undefined,
    });

    const stderrWrites: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const logEntry = JSON.parse(stderrWrites.join("").trim()) as Record<string, unknown>;
    expect(logEntry.event).toBe("bootstrap_configuration_rejected");
    expect(logEntry.invalid_fields).toEqual(["ACCESS_SESSION_SECRET"]);
  });

  it("rejects Redis reliability store configuration when REDIS_URL is missing", () => {
    setEnv({
      RELIABILITY_STORE: "redis",
      REDIS_URL: undefined,
    });

    const stderrWrites: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    expect(() => loadConfig()).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const logEntry = JSON.parse(stderrWrites.join("").trim()) as Record<string, unknown>;
    expect(logEntry.event).toBe("bootstrap_configuration_rejected");
    expect(logEntry.invalid_fields).toEqual(["REDIS_URL"]);
  });
});
