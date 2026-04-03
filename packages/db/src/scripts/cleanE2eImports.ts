import { createDbLogger } from "../logger.js";
import { pool } from "../pool.js";
import { problemRepository } from "../repositories/problemRepository.js";

const logger = createDbLogger();
const dryRun = process.argv.includes("--dry-run");

async function countActiveUserSubmittedProblems(): Promise<number> {
  const { rows } = await pool.query<{ count: number | string }>(
    `SELECT COUNT(*)::int AS count
     FROM problems
     WHERE source = 'user_submitted' AND deleted_at IS NULL`,
  );
  return Number(rows[0]?.count ?? 0);
}

try {
  const summary = await problemRepository.summarizeE2eImportedProblems();
  const cleanup = dryRun
    ? { softDeletedProblemCount: 0 }
    : await problemRepository.softDeleteE2eImportedProblems();
  const remainingActiveUserSubmittedProblems = await countActiveUserSubmittedProblems();

  logger.info("clean_e2e_imports_completed", {
    dry_run: dryRun,
    total_matching_problems: summary.totalMatchingProblems,
    active_matching_problems: summary.activeMatchingProblems,
    soft_deleted_problem_count: cleanup.softDeletedProblemCount,
    matching_test_cases: summary.matchingTestCases,
    matching_boilerplates: summary.matchingBoilerplates,
    matching_hints: summary.matchingHints,
    remaining_active_user_submitted_problems: remainingActiveUserSubmittedProblems,
  });
} catch (err) {
  logger.error("clean_e2e_imports_failed", {
    err,
    dry_run: dryRun,
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
