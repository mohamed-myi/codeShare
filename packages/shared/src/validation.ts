import { z } from "zod";
import { ROOM_CODE } from "./constants.js";
import { normalizeLeetCodeUrl } from "./leetcodeUrl.js";

const roomCodePattern = new RegExp(
  `^[${ROOM_CODE.ALPHABET}]{${ROOM_CODE.SEGMENT_LENGTH}}-[${ROOM_CODE.ALPHABET}]{${ROOM_CODE.SEGMENT_LENGTH}}$`,
);

// --- Socket Event Payload Schemas ---

export const userJoinSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
  reconnectToken: z.string().optional(),
});

export const roomCodeSchema = z.string().trim().toLowerCase().regex(roomCodePattern);

export const problemSelectSchema = z.object({
  problemId: z.string().uuid(),
});

export const problemImportSchema = z.object({
  leetcodeUrl: z
    .string()
    .min(1)
    .transform((val, ctx) => {
      const result = normalizeLeetCodeUrl(val);
      if (!result) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL must be a valid LeetCode problem URL (e.g. leetcode.com/problems/two-sum)",
        });
        return z.NEVER;
      }
      return result.canonicalUrl;
    }),
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
  displayName: z.string().trim().min(1).max(30),
});

export const accessLoginSchema = z.object({
  code: z.string().trim().min(1).max(128),
});

// --- API Response Schemas ---

export const problemListQuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// --- Harness Result Validation ---

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const harnessOkCaseSchema = z.object({
  index: z.number().int(),
  status: z.literal("ok"),
  elapsed_ms: z.number().optional(),
  got_json: jsonValueSchema,
  got_repr: z.string().nullish(),
});

const harnessUnserializableCaseSchema = z.object({
  index: z.number().int(),
  status: z.literal("unserializable"),
  elapsed_ms: z.number().optional(),
  got_repr: z.string(),
});

const harnessErrorCaseSchema = z.object({
  index: z.number().int(),
  status: z.literal("error"),
  elapsed_ms: z.number().optional(),
  error: z.string(),
  error_truncated: z.boolean().optional(),
});

export const harnessResultSchema = z.object({
  results: z.array(
    z.discriminatedUnion("status", [
      harnessOkCaseSchema,
      harnessUnserializableCaseSchema,
      harnessErrorCaseSchema,
    ]),
  ),
  userStdout: z.string(),
  metadata: z
    .object({
      userStdoutTruncated: z.boolean().optional(),
    })
    .optional(),
});
