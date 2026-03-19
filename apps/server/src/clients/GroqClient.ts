import type { Config } from "../config.js";

export function createGroqClient(config: Config) {
  return {
    /**
     * Streams a chat completion from Groq. Yields text chunks.
     */
    async *streamCompletion(prompt: string): AsyncGenerator<string> {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            stream: true,
          }),
        },
      );

      if (!response.ok || !response.body) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
