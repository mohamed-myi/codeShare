import { createRequire } from "node:module";
import pino from "pino";

const require = createRequire(import.meta.url);

export function createLogger(level: string): pino.Logger {
  const transport = resolveDevTransport();

  return pino({
    level,
    transport,
  });
}

function resolveDevTransport(): pino.TransportSingleOptions | undefined {
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  try {
    require.resolve("pino-pretty");
    return { target: "pino-pretty", options: { colorize: true } };
  } catch {
    return undefined;
  }
}
