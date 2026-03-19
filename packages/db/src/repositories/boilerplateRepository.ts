import type { BoilerplateTemplate } from "@codeshare/shared";
import { pool } from "../pool.js";
import { toBoilerplate, type BoilerplateRow } from "../types.js";

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
    return rows[0] ? toBoilerplate(rows[0]) : null;
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
      [
        data.problemId,
        data.language,
        data.template,
        data.methodName,
        data.parameterNames,
      ],
    );
    return toBoilerplate(rows[0]);
  },
};
