import type { AccessInviteRecord, AccessSessionRecord, AccessStore } from "@codeshare/shared";
import { pool } from "../pool.js";

interface InviteCodeRow {
  id: string;
  label: string;
  code_hash: string;
  max_sessions: number;
  expires_at: Date | null;
  revoked_at: Date | null;
  last_used_at: Date | null;
}

interface AccessSessionRow {
  id: string;
  invite_id: string;
  session_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  invite_label: string;
  invite_expires_at: Date | null;
  invite_revoked_at: Date | null;
}

export const accessRepository: AccessStore & {
  createInvite(input: {
    label: string;
    codeHash: string;
    maxSessions: number;
    expiresAt: Date | null;
  }): Promise<AccessInviteRecord>;
  listInvites(): Promise<AccessInviteRecord[]>;
  revokeInvite(id: string, now?: Date): Promise<void>;
} = {
  async listUsableInvites(now: Date): Promise<AccessInviteRecord[]> {
    const { rows } = await pool.query<InviteCodeRow>(
      `SELECT id, label, code_hash, max_sessions, expires_at, revoked_at, last_used_at
       FROM invite_codes
       WHERE revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > $1)
       ORDER BY created_at DESC`,
      [now],
    );
    return rows.map(toInviteRecord);
  },

  async createSession(input: {
    inviteId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<AccessSessionRecord | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inviteResult = await client.query<{ max_sessions: number }>(
        "SELECT max_sessions FROM invite_codes WHERE id = $1 FOR UPDATE",
        [input.inviteId],
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        await client.query("ROLLBACK");
        return null;
      }

      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM access_sessions
         WHERE invite_id = $1
           AND revoked_at IS NULL
           AND expires_at > $2`,
        [input.inviteId, input.now],
      );
      if (Number(countResult.rows[0]?.count ?? 0) >= invite.max_sessions) {
        await client.query("ROLLBACK");
        return null;
      }

      const sessionResult = await client.query<{ id: string }>(
        `INSERT INTO access_sessions (invite_id, session_token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.inviteId, input.sessionTokenHash, input.expiresAt],
      );
      await client.query("UPDATE invite_codes SET last_used_at = $1 WHERE id = $2", [
        input.now,
        input.inviteId,
      ]);
      await client.query("COMMIT");

      return findSessionRecordById(sessionResult.rows[0].id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  findSessionById: findSessionRecordById,

  async revokeSession(sessionId: string, now = new Date()): Promise<void> {
    await pool.query("UPDATE access_sessions SET revoked_at = $1 WHERE id = $2", [now, sessionId]);
  },

  async createInvite(input: {
    label: string;
    codeHash: string;
    maxSessions: number;
    expiresAt: Date | null;
  }): Promise<AccessInviteRecord> {
    const { rows } = await pool.query<InviteCodeRow>(
      `INSERT INTO invite_codes (label, code_hash, max_sessions, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, code_hash, max_sessions, expires_at, revoked_at, last_used_at`,
      [input.label, input.codeHash, input.maxSessions, input.expiresAt],
    );
    return toInviteRecord(rows[0]);
  },

  async listInvites(): Promise<AccessInviteRecord[]> {
    const { rows } = await pool.query<InviteCodeRow>(
      `SELECT id, label, code_hash, max_sessions, expires_at, revoked_at, last_used_at
       FROM invite_codes
       ORDER BY created_at DESC`,
    );
    return rows.map(toInviteRecord);
  },

  async revokeInvite(id: string, now = new Date()): Promise<void> {
    await pool.query("UPDATE invite_codes SET revoked_at = $1 WHERE id = $2", [now, id]);
  },
};

async function findSessionRecordById(sessionId: string): Promise<AccessSessionRecord | null> {
  const { rows } = await pool.query<AccessSessionRow>(
    `SELECT
       s.id,
       s.invite_id,
       s.session_token_hash,
       s.expires_at,
       s.revoked_at,
       i.label AS invite_label,
       i.expires_at AS invite_expires_at,
       i.revoked_at AS invite_revoked_at
     FROM access_sessions s
     JOIN invite_codes i ON i.id = s.invite_id
     WHERE s.id = $1`,
    [sessionId],
  );
  return rows[0] ? toSessionRecord(rows[0]) : null;
}

function toInviteRecord(row: InviteCodeRow): AccessInviteRecord {
  return {
    id: row.id,
    label: row.label,
    codeHash: row.code_hash,
    maxSessions: row.max_sessions,
    expiresAt: toDateOrNull(row.expires_at),
    revokedAt: toDateOrNull(row.revoked_at),
    lastUsedAt: toDateOrNull(row.last_used_at),
  };
}

function toSessionRecord(row: AccessSessionRow): AccessSessionRecord {
  return {
    id: row.id,
    inviteId: row.invite_id,
    sessionTokenHash: row.session_token_hash,
    expiresAt: toDate(row.expires_at),
    revokedAt: toDateOrNull(row.revoked_at),
    inviteLabel: row.invite_label,
    inviteExpiresAt: toDateOrNull(row.invite_expires_at),
    inviteRevokedAt: toDateOrNull(row.invite_revoked_at),
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateOrNull(value: Date | string | null): Date | null {
  return value ? toDate(value) : null;
}
