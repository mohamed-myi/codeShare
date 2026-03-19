import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JUDGE0_API_URL: z.string().url(),
  JUDGE0_API_KEY: z.string().min(1),
  JUDGE0_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  RATE_LIMIT_ROOM_CREATE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WS_CONNECT: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_JOIN: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_IMPORT: z.coerce.number().int().positive().default(10),
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
  return result.data;
}
