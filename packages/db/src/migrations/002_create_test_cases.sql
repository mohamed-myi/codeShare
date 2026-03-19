CREATE TABLE IF NOT EXISTS test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  input           JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  is_visible      BOOLEAN NOT NULL DEFAULT false,
  order_index     INTEGER NOT NULL,
  UNIQUE (problem_id, order_index)
);
