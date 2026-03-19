import type { Config } from "../config.js";

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export function createJudge0Client(config: Config) {
  return {
    async submit(sourceCode: string, timeLimitMs: number): Promise<Judge0Response> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch(
          `${config.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RapidAPI-Key": config.JUDGE0_API_KEY,
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
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

        return (await response.json()) as Judge0Response;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
