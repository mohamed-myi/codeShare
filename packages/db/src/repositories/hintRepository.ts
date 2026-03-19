import type { Hint } from "@codeshare/shared";
import { pool } from "../pool.js";
import { toHint, type HintRow } from "../types.js";

export const hintRepository = {
  async findByProblemId(problemId: string): Promise<Hint[]> {
    const { rows } = await pool.query<HintRow>(
      `SELECT * FROM hints
       WHERE problem_id = $1
       ORDER BY order_index`,
      [problemId],
    );
    return rows.map(toHint);
  },

  async create(data: {
    problemId: string;
    hintText: string;
    orderIndex: number;
  }): Promise<Hint> {
    const { rows } = await pool.query<HintRow>(
      `INSERT INTO hints (problem_id, hint_text, order_index)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.problemId, data.hintText, data.orderIndex],
    );
    return toHint(rows[0]);
  },
};
