CREATE TABLE IF NOT EXISTS problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  constraints     TEXT[] NOT NULL DEFAULT '{}',
  solution        TEXT,
  time_limit_ms   INTEGER NOT NULL DEFAULT 5000,
  source          TEXT NOT NULL CHECK (source IN ('curated', 'user_submitted')),
  source_url      TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE problems ADD CONSTRAINT curated_has_solution
  CHECK (source = 'user_submitted' OR solution IS NOT NULL);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
