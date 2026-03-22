import type { BoilerplateTemplate, Hint, Problem, TestCase } from "@codeshare/shared";

// --- Database Row Types (snake_case) ---

export interface ProblemRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  constraints: string[];
  solution: string | null;
  time_limit_ms: number;
  source: string;
  source_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCaseRow {
  id: string;
  problem_id: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  is_visible: boolean;
  order_index: number;
}

export interface BoilerplateRow {
  id: string;
  problem_id: string;
  language: string;
  template: string;
  method_name: string;
  parameter_names: string[];
}

export interface HintRow {
  id: string;
  problem_id: string;
  hint_text: string;
  order_index: number;
}

// --- Row -> Application Type Mappers ---

export function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty as Problem["difficulty"],
    category: row.category,
    description: row.description,
    constraints: row.constraints,
    solution: row.solution,
    timeLimitMs: row.time_limit_ms,
    source: row.source as Problem["source"],
    sourceUrl: row.source_url,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTestCase(row: TestCaseRow): TestCase {
  return {
    id: row.id,
    problemId: row.problem_id,
    input: row.input,
    expectedOutput: row.expected_output,
    isVisible: row.is_visible,
    orderIndex: row.order_index,
  };
}

export function toBoilerplate(row: BoilerplateRow): BoilerplateTemplate {
  return {
    id: row.id,
    problemId: row.problem_id,
    language: row.language as BoilerplateTemplate["language"],
    template: row.template,
    methodName: row.method_name,
    parameterNames: row.parameter_names,
  };
}

export function toHint(row: HintRow): Hint {
  return {
    id: row.id,
    problemId: row.problem_id,
    hintText: row.hint_text,
    orderIndex: row.order_index,
  };
}
