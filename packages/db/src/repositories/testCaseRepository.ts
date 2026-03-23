import type { TestCase } from "@codeshare/shared";
import { pool } from "../pool.js";
import { type TestCaseRow, toTestCase } from "../types.js";

export const testCaseRepository = {
  async findByProblemId(problemId: string): Promise<TestCase[]> {
    const { rows } = await pool.query<TestCaseRow>(
      `SELECT * FROM test_cases
       WHERE problem_id = $1
       ORDER BY order_index`,
      [problemId],
    );
    return rows.map(toTestCase);
  },

  async findVisible(problemId: string): Promise<TestCase[]> {
    const { rows } = await pool.query<TestCaseRow>(
      `SELECT * FROM test_cases
       WHERE problem_id = $1 AND is_visible = true
       ORDER BY order_index`,
      [problemId],
    );
    return rows.map(toTestCase);
  },

  async create(data: {
    problemId: string;
    input: Record<string, unknown>;
    expectedOutput: unknown;
    isVisible: boolean;
    orderIndex: number;
  }): Promise<TestCase> {
    const { rows } = await pool.query<TestCaseRow>(
      `INSERT INTO test_cases (problem_id, input, expected_output, is_visible, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.problemId,
        JSON.stringify(data.input),
        JSON.stringify(data.expectedOutput),
        data.isVisible,
        data.orderIndex,
      ],
    );
    return toTestCase(rows[0]);
  },

  async countHidden(problemId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM test_cases
       WHERE problem_id = $1 AND is_visible = false`,
      [problemId],
    );
    return Number(rows[0].count);
  },

  async maxOrderIndex(problemId: string): Promise<number> {
    const { rows } = await pool.query<{ max: number | null }>(
      `SELECT MAX(order_index) AS max FROM test_cases
       WHERE problem_id = $1`,
      [problemId],
    );
    return rows[0].max ?? -1;
  },

  async createMany(
    cases: Array<{
      problemId: string;
      input: Record<string, unknown>;
      expectedOutput: unknown;
      isVisible: boolean;
      orderIndex: number;
    }>,
  ): Promise<void> {
    if (cases.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let i = 0; i < cases.length; i++) {
      const offset = i * 5;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
      );
      values.push(
        cases[i].problemId,
        JSON.stringify(cases[i].input),
        JSON.stringify(cases[i].expectedOutput),
        cases[i].isVisible,
        cases[i].orderIndex,
      );
    }

    await pool.query(
      `INSERT INTO test_cases (problem_id, input, expected_output, is_visible, order_index)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (problem_id, order_index) DO NOTHING`,
      values,
    );
  },
};
