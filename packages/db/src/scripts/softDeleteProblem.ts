import { pool } from "../pool.js";
import { problemRepository } from "../repositories/problemRepository.js";

const problemId = process.argv[2]?.trim();

if (!problemId) {
  console.error("Usage: pnpm --filter @codeshare/db soft-delete <problem-id>");
  process.exit(1);
}

try {
  await problemRepository.softDeleteById(problemId);
  console.log(`Soft-deleted problem ${problemId}`);
} finally {
  await pool.end();
}
