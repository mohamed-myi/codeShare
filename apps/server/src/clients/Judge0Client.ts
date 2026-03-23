import { z } from "zod";
import type { Config } from "../config.js";

const RAPID_API_HOST = "judge0-ce.p.rapidapi.com";
const judge0ResponseSchema = z.object({
  stdout: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  stderr: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  status: z.object({
    id: z.number().int(),
    description: z.string().default(""),
  }),
  time: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  memory: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
});

type Judge0Response = z.infer<typeof judge0ResponseSchema>;

export function createJudge0Client(config: Config) {
  return {
    async submit(sourceCode: string, timeLimitMs: number): Promise<Judge0Response> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.JUDGE0_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${config.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
          {
            method: "POST",
            headers: buildHeaders(config),
            body: JSON.stringify({
              source_code: sourceCode,
              language_id: 71, // Python 3
              cpu_time_limit: timeLimitMs / 1000,
              memory_limit: 256_000, // 256 MB in KB
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Judge0 API error: ${response.status}`);
        }

        const parsed = judge0ResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new Error("Judge0 response failed validation.");
        }

        return parsed.data;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function buildHeaders(config: Config): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": config.JUDGE0_API_KEY,
    "X-RapidAPI-Host": RAPID_API_HOST,
  };
}
