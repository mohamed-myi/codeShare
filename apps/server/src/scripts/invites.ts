import crypto from "node:crypto";
import { accessRepository, pool } from "@codeshare/db";
import { createInviteCodeHash } from "../services/AccessService.js";

type Command = "create" | "list" | "revoke";

interface ParsedArgs {
  command: Command;
  label?: string;
  id?: string;
  code?: string;
  maxSessions: number;
  expiresAt: Date | null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "create") {
    await createInvite(args);
    return;
  }

  if (args.command === "list") {
    await listInvites();
    return;
  }

  await revokeInvite(args);
}

async function createInvite(args: ParsedArgs): Promise<void> {
  if (!args.label) {
    throw new Error("create requires --label");
  }

  const code = args.code ?? crypto.randomBytes(18).toString("base64url");
  const invite = await accessRepository.createInvite({
    label: args.label,
    codeHash: createInviteCodeHash(code),
    maxSessions: args.maxSessions,
    expiresAt: args.expiresAt,
  });

  console.log(
    JSON.stringify(
      {
        id: invite.id,
        label: invite.label,
        code,
        maxSessions: invite.maxSessions,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      },
      null,
      2,
    ),
  );
}

async function listInvites(): Promise<void> {
  const invites = await accessRepository.listInvites();
  console.log(
    JSON.stringify(
      invites.map((invite) => ({
        id: invite.id,
        label: invite.label,
        maxSessions: invite.maxSessions,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        revokedAt: invite.revokedAt?.toISOString() ?? null,
        lastUsedAt: invite.lastUsedAt?.toISOString() ?? null,
      })),
      null,
      2,
    ),
  );
}

async function revokeInvite(args: ParsedArgs): Promise<void> {
  if (!args.id) {
    throw new Error("revoke requires --id");
  }
  await accessRepository.revokeInvite(args.id);
  console.log(JSON.stringify({ id: args.id, revoked: true }, null, 2));
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] as Command | undefined;
  if (!command || !["create", "list", "revoke"].includes(command)) {
    throw new Error("Usage: pnpm --filter @codeshare/server invite -- create|list|revoke");
  }

  return {
    command,
    label: readOption(argv, "--label"),
    id: readOption(argv, "--id"),
    code: readOption(argv, "--code"),
    maxSessions: Number(readOption(argv, "--max-sessions") ?? 3),
    expiresAt: parseOptionalDate(readOption(argv, "--expires-at")),
  };
}

function readOption(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --expires-at value: ${value}`);
  }
  return date;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Invite command failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
