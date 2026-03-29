import { createDbLogger } from "../logger.js";
import { pool } from "../pool.js";
import { problemRepository } from "../repositories/problemRepository.js";

const logger = createDbLogger();
const problemId = process.argv[2]?.trim();

if (!problemId) {
  logger.error("soft_delete_problem_usage_invalid", {
    expected_command: "pnpm --filter @codeshare/db soft-delete <problem-id>",
  });
  process.exit(1);
}

try {
  await problemRepository.softDeleteById(problemId);
  logger.info("soft_delete_problem_completed", {
    problem_id: problemId,
  });
} catch (err) {
  logger.error("soft_delete_problem_failed", {
    err,
    problem_id: problemId,
  });
  process.exit(1);
} finally {
  await pool.end();
}
