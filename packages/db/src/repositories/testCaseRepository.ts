import type { TestCase } from "@codeshare/shared";
import { pool } from "../pool.js";
import { toTestCase, type TestCaseRow } from "../types.js";

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
};
