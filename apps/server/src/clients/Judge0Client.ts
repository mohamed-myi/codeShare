import { z } from "zod";
import type { Config } from "../config.js";
import {
  type CircuitBreaker,
  type CircuitState,
  createCircuitBreaker,
} from "../lib/circuitBreaker.js";
import { DependencyError, isDependencyError } from "../lib/dependencyError.js";

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
  const circuitBreaker: CircuitBreaker = createCircuitBreaker({
    name: "judge0",
    failureThreshold: config.JUDGE0_CB_FAILURE_THRESHOLD,
    resetTimeoutMs: config.JUDGE0_CB_RESET_TIMEOUT_MS,
  });

  return {
    async submit(sourceCode: string, timeLimitMs: number): Promise<Judge0Response> {
      return circuitBreaker.execute(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.JUDGE0_REQUEST_TIMEOUT_MS);

        try {
          let response: Response;
          try {
            response = await fetch(
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
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              throw new DependencyError({
                dependency: "judge0",
                operation: "submit",
                errorType: "timeout",
                message: "Judge0 request timed out.",
                isTimeout: true,
                cause: error,
              });
            }

            throw new DependencyError({
              dependency: "judge0",
              operation: "submit",
              errorType: "network_error",
              message: "Judge0 request failed.",
              cause: error,
            });
          }

          if (!response.ok) {
            throw new DependencyError({
              dependency: "judge0",
              operation: "submit",
              errorType: "http_error",
              message: `Judge0 API error: ${response.status}`,
              statusCode: response.status,
            });
          }

          const parsed = judge0ResponseSchema.safeParse(await response.json());
          if (!parsed.success) {
            throw new DependencyError({
              dependency: "judge0",
              operation: "submit",
              errorType: "invalid_response",
              message: "Judge0 response failed validation.",
            });
          }

          return parsed.data;
        } catch (error) {
          if (isDependencyError(error)) {
            throw error;
          }
          throw new DependencyError({
            dependency: "judge0",
            operation: "submit",
            errorType: "unexpected_error",
            message: "Judge0 request failed.",
            cause: error,
          });
        } finally {
          clearTimeout(timeout);
        }
      });
    },

    getCircuitState(): CircuitState {
      return circuitBreaker.getState();
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
