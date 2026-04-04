import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function loadDotEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!existsSync(envPath)) {
    return {};
  }

  const entries: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    entries[key] = value;
  }
  return entries;
}

const fileEnv = loadDotEnv();
const clientPort = process.env.E2E_CLIENT_PORT ?? "5173";
const serverPort = process.env.E2E_SERVER_PORT ?? "3001";
const stubPort = process.env.E2E_STUB_PORT ?? "4100";
const clientUrl = `http://127.0.0.1:${clientPort}`;
const serverUrl = `http://127.0.0.1:${serverPort}`;
const stubUrl = `http://127.0.0.1:${stubPort}`;
const baseEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    fileEnv.DATABASE_URL ??
    "postgresql://codeshare:codeshare@127.0.0.1:5432/codeshare_dev",
  JUDGE0_API_URL: `${stubUrl}/judge0`,
  JUDGE0_API_KEY: "e2e-stub",
  JUDGE0_DAILY_LIMIT: "30",
  GROQ_API_KEY: "e2e-stub",
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_API_URL: `${stubUrl}/openai/v1/chat/completions`,
  LEETCODE_GRAPHQL_URL: `${stubUrl}/graphql`,
  PORT: serverPort,
  NODE_ENV: "test",
  CORS_ORIGIN: clientUrl,
  ALLOWED_ORIGINS: clientUrl,
  LOG_LEVEL: "warn",
  RATE_LIMIT_ROOM_CREATE: "100",
  RATE_LIMIT_WS_CONNECT: "25",
  RATE_LIMIT_JOIN: "50",
  RATE_LIMIT_IMPORT: "4",
  TRUSTED_PROXY_IPS: "127.0.0.1",
  ENABLE_PROBLEM_IMPORT: "true",
  ENABLE_LLM_HINT_FALLBACK: "true",
  ENABLE_IMPORTED_PROBLEM_HINTS: "true",
  MAX_SOCKET_EVENT_BYTES: "16384",
  MAX_CODE_BYTES: "65536",
  MAX_YJS_MESSAGE_BYTES: "32768",
  MAX_YJS_DOC_BYTES: "65536",
  JUDGE0_EXEC_PER_HOUR_PER_IP: "500",
  MAX_LLM_CALLS_PER_ROOM: "15",
  MAX_LLM_PROMPT_CHARS: "12000",
  MAX_LLM_HINT_CHARS: "1500",
  ROOM_GRACE_PERIOD_MS: "1500",
  ROOM_HINT_CONSENT_MS: "1500",
  ROOM_HINT_COOLDOWN_MS: "1000",
  ROOM_MAX_SUBMISSIONS: "3",
  ROOM_MAX_IMPORTS: "3",
  ROOM_MAX_CUSTOM_TEST_CASES: "3",
  IMPORTS_DAILY_LIMIT: "12",
  JUDGE0_REQUEST_TIMEOUT_MS: "30000",
  GROQ_MAX_TOKENS: "512",
  GROQ_TEMPERATURE: "0.6",
  GROQ_REQUEST_TIMEOUT_MS: "15000",
  LEETCODE_REQUEST_TIMEOUT_MS: "10000",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  globalSetup: "./support/global-setup.mjs",
  globalTeardown: "./support/global-teardown.mjs",
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: clientUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/stub-server.mjs",
      cwd: "..",
      url: `${stubUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...fileEnv,
        ...process.env,
        E2E_STUB_PORT: stubPort,
      },
    },
    {
      command: "pnpm --filter @codeshare/server exec tsx src/index.ts",
      cwd: "..",
      url: `${serverUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...fileEnv,
        ...process.env,
        ...baseEnv,
      },
    },
    {
      command: `pnpm --filter @codeshare/client exec vite --host 127.0.0.1 --port ${clientPort}`,
      cwd: "..",
      url: clientUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...fileEnv,
        ...process.env,
        VITE_REALTIME_URL: serverUrl,
        E2E_SERVER_URL: serverUrl,
        E2E_STUB_URL: stubUrl,
      },
    },
  ],
});
