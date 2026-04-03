import { createDbLogger } from "../logger.js";
import { pool } from "../pool.js";
import { boilerplateRepository } from "../repositories/boilerplateRepository.js";

const logger = createDbLogger();
const dryRun = process.argv.includes("--dry-run");

try {
  const matchingBoilerplates =
    await boilerplateRepository.countLeadingFutureAnnotationsImports("python");
  const cleanup = dryRun
    ? { cleanedBoilerplateCount: 0 }
    : await boilerplateRepository.cleanLeadingFutureAnnotationsImports("python");

  logger.info("clean_python_future_imports_completed", {
    dry_run: dryRun,
    matching_boilerplates: matchingBoilerplates,
    cleaned_boilerplate_count: cleanup.cleanedBoilerplateCount,
  });
} catch (err) {
  logger.error("clean_python_future_imports_failed", {
    err,
    dry_run: dryRun,
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
