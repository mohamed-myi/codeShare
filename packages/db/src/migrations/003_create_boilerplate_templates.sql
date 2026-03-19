CREATE TABLE IF NOT EXISTS boilerplate_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  language        TEXT NOT NULL,
  template        TEXT NOT NULL,
  method_name     TEXT NOT NULL,
  parameter_names TEXT[] NOT NULL,
  UNIQUE (problem_id, language)
);
