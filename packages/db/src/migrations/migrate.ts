import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDbLogger } from "../logger.js";
import { pool } from "../pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createDbLogger();

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("db_migration_started");
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query<{ name: string }>(
      "SELECT name FROM _migrations ORDER BY name",
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        skippedCount += 1;
        logger.info("db_migration_skipped", {
          migration_name: file,
          reason: "already_applied",
        });
        continue;
      }

      const sql = fs.readFileSync(path.join(__dirname, file), "utf-8");
      logger.info("db_migration_applying", {
        migration_name: file,
      });
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      appliedCount += 1;
    }

    logger.info("db_migration_completed", {
      applied_count: appliedCount,
      skipped_count: skippedCount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error("db_migration_failed", {
    err,
  });
  process.exit(1);
});
