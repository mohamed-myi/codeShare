import { GLOBAL_LIMITS, ROOM_LIMITS, TIMEOUTS } from "@codeshare/shared";
import { z } from "zod";

const optionalSecretSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const csvStringSchema = z.string().transform((value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
);

const booleanFromStringSchema = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JUDGE0_API_URL: z.string().url(),
  JUDGE0_API_KEY: z.string().min(1),
  JUDGE0_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  GROQ_API_KEY: optionalSecretSchema,
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_API_URL: z.string().url().default("https://api.groq.com/openai/v1/chat/completions"),
  LEETCODE_GRAPHQL_URL: z.string().url().default("https://leetcode.com/graphql"),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ALLOWED_ORIGINS: csvStringSchema.default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  RATE_LIMIT_ROOM_CREATE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WS_CONNECT: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_JOIN: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_IMPORT: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_ROOM_LOOKUP: z.coerce.number().int().positive().default(60),
  TRUSTED_PROXY_IPS: csvStringSchema.default(""),
  ENABLE_PROBLEM_IMPORT: booleanFromStringSchema.default("false"),
  ENABLE_LLM_HINT_FALLBACK: booleanFromStringSchema.default("false"),
  ENABLE_IMPORTED_PROBLEM_HINTS: booleanFromStringSchema.default("false"),
  MAX_SOCKET_EVENT_BYTES: z.coerce.number().int().positive().default(16_384),
  MAX_CODE_BYTES: z.coerce.number().int().positive().default(65_536),
  MAX_YJS_MESSAGE_BYTES: z.coerce.number().int().positive().default(32_768),
  MAX_YJS_DOC_BYTES: z.coerce.number().int().positive().default(65_536),
  MAX_LLM_CALLS_PER_ROOM: z.coerce.number().int().positive().default(15),
  LLM_CALLS_PER_HOUR_PER_IP: z.coerce.number().int().positive().default(20),
  LLM_DAILY_LIMIT: z.coerce.number().int().positive().default(500),
  MAX_LLM_PROMPT_CHARS: z.coerce.number().int().positive().default(12_000),
  MAX_LLM_HINT_CHARS: z.coerce.number().int().positive().default(1_500),
  MAX_ACTIVE_ROOMS: z.coerce.number().int().positive().default(500),
  ROOM_GRACE_PERIOD_MS: z.coerce.number().int().positive().default(TIMEOUTS.GRACE_PERIOD_MS),
  ROOM_HINT_CONSENT_MS: z.coerce.number().int().positive().default(TIMEOUTS.HINT_CONSENT_MS),
  ROOM_MAX_SUBMISSIONS: z.coerce.number().int().positive().default(ROOM_LIMITS.MAX_SUBMISSIONS),
  ROOM_MAX_IMPORTS: z.coerce.number().int().positive().default(ROOM_LIMITS.MAX_IMPORTS),
  ROOM_MAX_CUSTOM_TEST_CASES: z.coerce
    .number()
    .int()
    .positive()
    .default(ROOM_LIMITS.MAX_CUSTOM_TEST_CASES),
  IMPORTS_DAILY_LIMIT: z.coerce.number().int().positive().default(GLOBAL_LIMITS.IMPORTS_DAILY),
  JUDGE0_EXEC_PER_HOUR_PER_IP: z.coerce.number().int().positive().default(30),
  JUDGE0_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(TIMEOUTS.JUDGE0_REQUEST_MS),
  GROQ_MAX_TOKENS: z.coerce.number().int().positive().default(512),
  GROQ_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.6),
  GROQ_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  LEETCODE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  ENABLE_LLM_TEST_GENERATION: booleanFromStringSchema.default("false"),
  LLM_TEST_GENERATION_MAX_CASES: z.coerce.number().int().positive().default(12),
  LLM_TEST_GEN_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  LLM_TEST_GEN_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  LLM_VERIFY_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_VERIFY_MAX_TOKENS: z.coerce.number().int().positive().default(256),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const config = result.data;

  if (config.NODE_ENV === "production" && config.ALLOWED_ORIGINS.length === 0) {
    console.error("ALLOWED_ORIGINS must not be empty in production.");
    process.exit(1);
  }

  return config;
}
