import {
  boilerplateRepository,
  hintRepository,
  problemRepository,
  testCaseRepository,
} from "../index.js";
import { createDbLogger } from "../logger.js";
import { pool } from "../pool.js";
import { fixtures } from "./data/index.js";

const logger = createDbLogger();

async function seed(): Promise<void> {
  logger.info("db_seed_started", {
    fixture_count: fixtures.length,
  });

  for (const fixture of fixtures) {
    const existing = await problemRepository.findBySlugIncludingDeleted(fixture.problem.slug);
    if (existing) {
      if (existing.deletedAt) {
        await problemRepository.restoreById(existing.id);
        logger.info("db_seed_problem_restored", {
          problem_id: existing.id,
          problem_slug: fixture.problem.slug,
        });
      } else {
        logger.info("db_seed_problem_skipped", {
          problem_id: existing.id,
          problem_slug: fixture.problem.slug,
          reason: "already_exists",
        });
      }
      continue;
    }

    let problemId: string | null = null;

    try {
      const problem = await problemRepository.create(fixture.problem);
      problemId = problem.id;
      logger.info("db_seed_problem_inserted", {
        problem_id: problem.id,
        problem_slug: problem.slug,
      });

      for (const tc of fixture.testCases) {
        await testCaseRepository.create({ problemId: problem.id, ...tc });
      }
      logger.info("db_seed_test_cases_inserted", {
        problem_id: problem.id,
        test_case_count: fixture.testCases.length,
      });

      await boilerplateRepository.create({
        problemId: problem.id,
        ...fixture.boilerplate,
      });
      logger.info("db_seed_boilerplate_inserted", {
        problem_id: problem.id,
        boilerplate_count: 1,
      });

      for (const hint of fixture.hints) {
        await hintRepository.create({ problemId: problem.id, ...hint });
      }
      logger.info("db_seed_hints_inserted", {
        problem_id: problem.id,
        hint_count: fixture.hints.length,
      });
    } catch (err) {
      if (problemId) {
        await problemRepository.deleteById(problemId);
      }
      throw err;
    }
  }

  logger.info("db_seed_completed", {
    fixture_count: fixtures.length,
  });
  await pool.end();
}

seed().catch((err) => {
  logger.error("db_seed_failed", {
    err,
  });
  process.exit(1);
});
