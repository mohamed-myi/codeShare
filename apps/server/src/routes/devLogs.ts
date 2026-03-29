import fs from "node:fs";
import path from "node:path";
import { clientLogPayloadSchema, LOG_SERVICES } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";

const LOG_DIR = "logs";

export async function devLogRoutes(
  app: FastifyInstance,
  options?: {
    logDir?: string;
  },
): Promise<void> {
  app.post("/api/dev/logs/client", async (request, reply) => {
    const parsed = clientLogPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const entry = {
      ...parsed.data,
      timestamp: parsed.data.timestamp ?? new Date().toISOString(),
    };

    appendClientLog(entry, options?.logDir ?? LOG_DIR);

    return reply.status(202).send({ accepted: true });
  });
}

function appendClientLog(entry: Record<string, unknown>, logDir: string): void {
  const filePath = resolveDailyLogPath(LOG_SERVICES.CLIENT, logDir);
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

function resolveDailyLogPath(service: string, logDir: string): string {
  const serviceDir = path.join(logDir, service);
  fs.mkdirSync(serviceDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return path.join(serviceDir, `${date}.jsonl`);
}
