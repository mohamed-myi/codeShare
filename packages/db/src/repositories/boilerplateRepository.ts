import type { BoilerplateTemplate } from "@codeshare/shared";
import { pool } from "../pool.js";
import { type BoilerplateRow, getFirstOrNull, toBoilerplate } from "../types.js";

function toCount(value: number | string | undefined): number {
  return Number(value ?? 0);
}

export const boilerplateRepository = {
  async findByProblemAndLanguage(
    problemId: string,
    language: string,
  ): Promise<BoilerplateTemplate | null> {
    const { rows } = await pool.query<BoilerplateRow>(
      `SELECT * FROM boilerplate_templates
       WHERE problem_id = $1 AND language = $2`,
      [problemId, language],
    );
    return getFirstOrNull(rows, toBoilerplate);
  },

  async create(data: {
    problemId: string;
    language: string;
    template: string;
    methodName: string;
    parameterNames: string[];
  }): Promise<BoilerplateTemplate> {
    const { rows } = await pool.query<BoilerplateRow>(
      `INSERT INTO boilerplate_templates (problem_id, language, template, method_name, parameter_names)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.problemId, data.language, data.template, data.methodName, data.parameterNames],
    );
    return toBoilerplate(rows[0]);
  },

  async countLeadingFutureAnnotationsImports(language: string): Promise<number> {
    const { rows } = await pool.query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
       FROM boilerplate_templates
       WHERE language = $1
         AND template LIKE 'from __future__ import annotations%'`,
      [language],
    );
    return toCount(rows[0]?.count);
  },

  async cleanLeadingFutureAnnotationsImports(
    language: string,
  ): Promise<{ cleanedBoilerplateCount: number }> {
    const { rows } = await pool.query<{ cleaned_boilerplate_count: number | string }>(
      `WITH updated AS (
         UPDATE boilerplate_templates
         SET template = regexp_replace(
           template,
           '^from __future__ import annotations(?:\\r?\\n){1,2}',
           ''
         )
         WHERE language = $1
           AND template LIKE 'from __future__ import annotations%'
         RETURNING id
       )
       SELECT COUNT(*)::int AS cleaned_boilerplate_count
       FROM updated`,
      [language],
    );

    return {
      cleanedBoilerplateCount: toCount(rows[0]?.cleaned_boilerplate_count),
    };
  },
};
