CREATE TABLE IF NOT EXISTS hints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  hint_text       TEXT NOT NULL,
  order_index     INTEGER NOT NULL,
  UNIQUE (problem_id, order_index)
);
