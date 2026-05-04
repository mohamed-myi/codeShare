import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_DATABASE_URL = "postgresql://codeshare:codeshare@localhost:5432/codeshare_dev";

export function resolveDatabaseUrl(
  repoRoot: string,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const envPath = resolve(repoRoot, ".env");
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      if (!line.startsWith("DATABASE_URL=")) {
        continue;
      }

      const value = line.slice("DATABASE_URL=".length).trim();
      if (value.length > 0) {
        return value;
      }
    }
  }

  return DEFAULT_DATABASE_URL;
}
