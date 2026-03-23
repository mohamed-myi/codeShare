import type { Config } from "../config.js";

interface GroqMessage {
  role: "system" | "user";
  content: string;
}

export function createGroqClient(config: Config) {
  if (!config.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required to create the Groq client.");
  }

  return {
    /**
     * Streams a chat completion from Groq. Yields text chunks.
     */
    async *streamCompletion(messages: GroqMessage[]): AsyncGenerator<string> {
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
          stream: true,
          max_tokens: config.GROQ_MAX_TOKENS,
          temperature: config.GROQ_TEMPERATURE,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const reader = response.body.getReader();
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
            } catch {}
          }

          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
