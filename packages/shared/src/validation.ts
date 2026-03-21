import { z } from "zod";

// --- Socket Event Payload Schemas ---

export const userJoinSchema = z.object({
  displayName: z.string().min(1).max(30).trim(),
  reconnectToken: z.string().optional(),
});

export const problemSelectSchema = z.object({
  problemId: z.string().uuid(),
});

export const problemImportSchema = z.object({
  leetcodeUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/leetcode\.com\/problems\/[\w-]+\/?$/,
      "URL must match https://leetcode.com/problems/<slug>/",
    ),
});

export const testcaseAddSchema = z.object({
  input: z.record(z.string(), z.unknown()),
  expectedOutput: z.unknown(),
});

export const hintChunkSchema = z.object({
  text: z.string(),
});

// --- Room Schemas ---

export const roomCreateSchema = z.object({
  mode: z.enum(["collaboration", "interview"]),
  displayName: z.string().min(1).max(30).trim(),
});

// --- API Response Schemas ---

export const problemListQuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// --- Harness Result Validation ---

export const harnessResultSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      passed: z.boolean(),
      elapsed_ms: z.number().optional(),
      got: z.string().nullish(),
      expected: z.string().nullish(),
      error: z.string().nullish(),
    }),
  ),
  userStdout: z.string(),
});
