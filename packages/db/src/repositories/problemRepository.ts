import type { Problem, ProblemListItem } from "@codeshare/shared";
import { pool } from "../pool.js";
import { toProblem, type ProblemRow } from "../types.js";

export const problemRepository = {
  async findAll(filters?: {
    category?: string;
    difficulty?: string;
  }): Promise<ProblemListItem[]> {
    const conditions = ["deleted_at IS NULL"];
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
       WHERE ${conditions.join(" AND ")}
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
      "SELECT * FROM problems WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    return rows[0] ? toProblem(rows[0]) : null;
  },

  async findBySlug(slug: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>(
      "SELECT * FROM problems WHERE slug = $1 AND deleted_at IS NULL",
      [slug],
    );
    return rows[0] ? toProblem(rows[0]) : null;
  },

  async findBySourceUrl(url: string): Promise<Problem | null> {
    const { rows } = await pool.query<ProblemRow>(
      "SELECT * FROM problems WHERE source_url = $1 AND deleted_at IS NULL",
      [url],
    );
    return rows[0] ? toProblem(rows[0]) : null;
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
};
