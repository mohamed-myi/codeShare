import type { Problem, ProblemListItem } from "@codeshare/shared";
import { buildNonDeletedWhere, SOFT_DELETE_FILTER } from "../lib/queryHelpers.js";
import { pool } from "../pool.js";
import { getFirstOrNull, type ProblemRow, toProblem } from "../types.js";

const E2E_IMPORT_CATEGORIES = ["Imported", "E2E Imported"] as const;

interface E2eImportedProblemSummaryRow {
  total_matching_problems: number | string;
  active_matching_problems: number | string;
  matching_test_cases: number | string;
  matching_boilerplates: number | string;
  matching_hints: number | string;
}

interface E2eImportedProblemDeleteRow {
  soft_deleted_problem_count: number | string;
}

export interface E2eImportedProblemSummary {
  totalMatchingProblems: number;
  activeMatchingProblems: number;
  matchingTestCases: number;
  matchingBoilerplates: number;
  matchingHints: number;
}

function toCount(value: number | string | undefined): number {
  return Number(value ?? 0);
}

export const problemRepository = {
  async findAll(filters?: { category?: string; difficulty?: string }): Promise<ProblemListItem[]> {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters?.category) {
      params.push(filters.category);
      conditions.push(`category = $${params.length}`);
    }
    if (filters?.difficulty) {
      params.push(filters.difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }

    const { rows } = await pool.query<ProblemRow>(
      `SELECT id, slug, title, difficulty, category
       FROM problems
       WHERE ${buildNonDeletedWhere(conditions)}
       ORDER BY category, title`,
      params,
    );

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      difficulty: r.difficulty as ProblemListItem["difficulty"],
      category: r.category,
    }));
  },

  async findById(id: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>(
      `SELECT * FROM problems WHERE id = $1 AND ${SOFT_DELETE_FILTER}`,
      [id],
    );
    return getFirstOrNull(rows, toProblem);
  },

  async findBySlug(slug: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>(
      `SELECT * FROM problems WHERE slug = $1 AND ${SOFT_DELETE_FILTER}`,
      [slug],
    );
    return getFirstOrNull(rows, toProblem);
  },

  async findBySlugIncludingDeleted(slug: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>("SELECT * FROM problems WHERE slug = $1", [slug]);
    return getFirstOrNull(rows, toProblem);
  },

  async findBySourceUrl(url: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>(
      `SELECT * FROM problems WHERE source_url = $1 AND ${SOFT_DELETE_FILTER}`,
      [url],
    );
    return getFirstOrNull(rows, toProblem);
  },

  async findBySourceUrlIncludingDeleted(url: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>("SELECT * FROM problems WHERE source_url = $1", [
      url,
    ]);
    return getFirstOrNull(rows, toProblem);
  },

  async create(data: {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    description: string;
    constraints: string[];
    solution: string | null;
    timeLimitMs: number;
    source: string;
    sourceUrl: string | null;
  }): Promise<Problem> {
    const { rows } = await pool.query<ProblemRow>(
      `INSERT INTO problems (slug, title, difficulty, category, description, constraints, solution, time_limit_ms, source, source_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.slug,
        data.title,
        data.difficulty,
        data.category,
        data.description,
        data.constraints,
        data.solution,
        data.timeLimitMs,
        data.source,
        data.sourceUrl,
      ],
    );
    return toProblem(rows[0]);
  },

  async deleteById(id: string): Promise<void> {
    await pool.query("DELETE FROM problems WHERE id = $1", [id]);
  },

  async softDeleteById(id: string): Promise<void> {
    await pool.query("UPDATE problems SET deleted_at = NOW() WHERE id = $1", [id]);
  },

  async restoreById(id: string): Promise<void> {
    await pool.query("UPDATE problems SET deleted_at = NULL WHERE id = $1", [id]);
  },

  async summarizeE2eImportedProblems(): Promise<E2eImportedProblemSummary> {
    const { rows } = await pool.query<E2eImportedProblemSummaryRow>(
      `WITH matching AS (
         SELECT id, deleted_at
         FROM problems
         WHERE source = 'user_submitted'
           AND title LIKE 'Imported %'
           AND source_url LIKE 'https://leetcode.com/problems/%'
           AND category = ANY($1::text[])
       )
       SELECT
         COUNT(*)::int AS total_matching_problems,
         COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS active_matching_problems,
         (
           SELECT COUNT(*)::int
           FROM test_cases
           WHERE problem_id IN (SELECT id FROM matching)
         ) AS matching_test_cases,
         (
           SELECT COUNT(*)::int
           FROM boilerplate_templates
           WHERE problem_id IN (SELECT id FROM matching)
         ) AS matching_boilerplates,
         (
           SELECT COUNT(*)::int
           FROM hints
           WHERE problem_id IN (SELECT id FROM matching)
         ) AS matching_hints
       FROM matching`,
      [Array.from(E2E_IMPORT_CATEGORIES)],
    );

    const row = rows[0];
    return {
      totalMatchingProblems: toCount(row?.total_matching_problems),
      activeMatchingProblems: toCount(row?.active_matching_problems),
      matchingTestCases: toCount(row?.matching_test_cases),
      matchingBoilerplates: toCount(row?.matching_boilerplates),
      matchingHints: toCount(row?.matching_hints),
    };
  },

  async softDeleteE2eImportedProblems(): Promise<{ softDeletedProblemCount: number }> {
    const { rows } = await pool.query<E2eImportedProblemDeleteRow>(
      `WITH matching AS (
         SELECT id
         FROM problems
         WHERE source = 'user_submitted'
           AND deleted_at IS NULL
           AND title LIKE 'Imported %'
           AND source_url LIKE 'https://leetcode.com/problems/%'
           AND category = ANY($1::text[])
       ),
       updated AS (
         UPDATE problems
         SET deleted_at = NOW()
         WHERE id IN (SELECT id FROM matching)
         RETURNING id
       )
       SELECT COUNT(*)::int AS soft_deleted_problem_count
       FROM updated`,
      [Array.from(E2E_IMPORT_CATEGORIES)],
    );

    return {
      softDeletedProblemCount: toCount(rows[0]?.soft_deleted_problem_count),
    };
  },
};
