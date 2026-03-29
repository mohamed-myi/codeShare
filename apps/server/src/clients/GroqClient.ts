import type { Config } from "../config.js";
import {
  type CircuitBreaker,
  type CircuitState,
  createCircuitBreaker,
} from "../lib/circuitBreaker.js";
import { DependencyError, isDependencyError } from "../lib/dependencyError.js";

export interface GroqMessage {
  role: "system" | "user";
  content: string;
}

export function createGroqClient(config: Config) {
  if (!config.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required to create the Groq client.");
  }

  const circuitBreaker: CircuitBreaker = createCircuitBreaker({
    name: "groq",
    failureThreshold: config.GROQ_CB_FAILURE_THRESHOLD,
    resetTimeoutMs: config.GROQ_CB_RESET_TIMEOUT_MS,
  });

  return {
    /**
     * Non-streaming chat completion. Returns full response text.
     */
    async complete(
      messages: GroqMessage[],
      options?: { temperature?: number; maxTokens?: number },
    ): Promise<string> {
      return circuitBreaker.execute(async () => {
        try {
          const response = await fetch(config.GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            redirect: "error",
            signal: AbortSignal.timeout(config.GROQ_REQUEST_TIMEOUT_MS),
            body: JSON.stringify({
              model: config.GROQ_MODEL,
              messages,
              stream: false,
              max_tokens: options?.maxTokens ?? config.GROQ_MAX_TOKENS,
              temperature: options?.temperature ?? config.GROQ_TEMPERATURE,
            }),
          });

          if (!response.ok) {
            throw new DependencyError({
              dependency: "groq",
              operation: "complete",
              errorType: "http_error",
              message: `Groq API error: ${response.status}`,
              statusCode: response.status,
            });
          }

          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = json.choices?.[0]?.message?.content;
          if (!content) {
            throw new DependencyError({
              dependency: "groq",
              operation: "complete",
              errorType: "empty_response",
              message: "Groq API returned empty response",
            });
          }
          return content;
        } catch (error) {
          throw toGroqDependencyError(error, "complete");
        }
      });
    },

    /**
     * Streams a chat completion from Groq. Yields text chunks.
     * The circuit breaker wraps the entire streaming call --
     * the initial fetch + reading the stream is one "execute" invocation.
     */
    async *streamCompletion(messages: GroqMessage[]): AsyncGenerator<string> {
      const generator = await circuitBreaker.execute(async () => {
        let response: Response;
        try {
          response = await fetch(config.GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            redirect: "error",
            signal: AbortSignal.timeout(config.GROQ_REQUEST_TIMEOUT_MS),
            body: JSON.stringify({
              model: config.GROQ_MODEL,
              messages,
              stream: true,
              max_tokens: config.GROQ_MAX_TOKENS,
              temperature: config.GROQ_TEMPERATURE,
            }),
          });
        } catch (error) {
          throw toGroqDependencyError(error, "stream_completion");
        }

        if (!response.ok || !response.body) {
          throw new DependencyError({
            dependency: "groq",
            operation: "stream_completion",
            errorType: "http_error",
            message: `Groq API error: ${response.status}`,
            statusCode: response.status,
          });
        }

        return readStreamChunks(response);
      });

      yield* generator;
    },

    getCircuitState(): CircuitState {
      return circuitBreaker.getState();
    },
  };
}

async function* readStreamChunks(response: Response): AsyncGenerator<string> {
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const frames = buffer.split("\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data: ")) {
          continue;
        }

        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          throw new DependencyError({
            dependency: "groq",
            operation: "stream_completion",
            errorType: "invalid_response",
            message: "Groq stream returned invalid JSON data.",
          });
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

function toGroqDependencyError(error: unknown, operation: "complete" | "stream_completion") {
  if (isDependencyError(error)) {
    return error;
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new DependencyError({
      dependency: "groq",
      operation,
      errorType: "timeout",
      message: "Groq request timed out.",
      isTimeout: true,
      cause: error,
    });
  }

  return new DependencyError({
    dependency: "groq",
    operation,
    errorType: "network_error",
    message: "Groq request failed.",
    cause: error,
  });
}
