import { pool } from "../pool.js";
import {
  problemRepository,
  testCaseRepository,
  boilerplateRepository,
  hintRepository,
} from "../index.js";
import { fixtures } from "./data/index.js";

async function seed(): Promise<void> {
  console.log("Seeding database...");

  for (const fixture of fixtures) {
    const existing = await problemRepository.findBySlug(fixture.problem.slug);
    if (existing) {
      console.log(`  Skipping "${fixture.problem.title}" (already exists)`);
      continue;
    }

    const problem = await problemRepository.create(fixture.problem);
    console.log(`  Inserted problem: ${problem.title} (${problem.id})`);

    for (const tc of fixture.testCases) {
      await testCaseRepository.create({ problemId: problem.id, ...tc });
    }
    console.log(`    ${fixture.testCases.length} test cases`);

    await boilerplateRepository.create({
      problemId: problem.id,
      ...fixture.boilerplate,
    });
    console.log(`    1 boilerplate template`);

    for (const hint of fixture.hints) {
      await hintRepository.create({ problemId: problem.id, ...hint });
    }
    console.log(`    ${fixture.hints.length} hint(s)`);
  }

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
