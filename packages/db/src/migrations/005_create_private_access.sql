CREATE TABLE IF NOT EXISTS invite_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label          TEXT NOT NULL,
  code_hash      TEXT UNIQUE NOT NULL,
  max_sessions   INTEGER NOT NULL DEFAULT 3 CHECK (max_sessions > 0),
  expires_at     TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  last_used_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER invite_codes_updated_at
  BEFORE UPDATE ON invite_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS access_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id          UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  session_token_hash TEXT UNIQUE NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_active
  ON invite_codes (revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_access_sessions_invite_active
  ON access_sessions (invite_id, revoked_at, expires_at);
