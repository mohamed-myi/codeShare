import type { Logger } from "pino";
import type { GroqMessage } from "../clients/GroqClient.js";
import { buildDelimitedBlock } from "../lib/promptSanitize.js";

interface GeneratedCase {
  input: Record<string, unknown>;
  expectedOutput: unknown;
}

export interface GenerationContext {
  problemId: string;
  title: string;
  description: string;
  constraints: string[];
  parameterNames: string[];
  methodName: string;
  visibleTestCases: Array<{ input: Record<string, unknown>; expectedOutput: unknown }>;
}

export interface TestCaseGeneratorDeps {
  groqComplete: (
    messages: GroqMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ) => Promise<string>;
  countHidden: (problemId: string) => Promise<number>;
  maxOrderIndex: (problemId: string) => Promise<number>;
  createMany: (
    cases: Array<{
      problemId: string;
      input: Record<string, unknown>;
      expectedOutput: unknown;
      isVisible: boolean;
      orderIndex: number;
    }>,
  ) => Promise<void>;
  logger: Logger;
  maxCases: number;
  genTemperature: number;
  genMaxTokens: number;
  verifyTemperature: number;
  verifyMaxTokens: number;
}

export function createTestCaseGeneratorService(deps: TestCaseGeneratorDeps) {
  const {
    groqComplete,
    countHidden,
    maxOrderIndex,
    createMany,
    logger,
    maxCases,
    genTemperature,
    genMaxTokens,
    verifyTemperature,
    verifyMaxTokens,
  } = deps;

  async function attemptGeneration(ctx: GenerationContext): Promise<void> {
    const hidden = await countHidden(ctx.problemId);
    if (hidden > 0) {
      logger.info({ problemId: ctx.problemId }, "Hidden cases already exist, skipping generation");
      return;
    }

    const rawCases = await generateCases(ctx);
    const validated = structuralValidation(rawCases, ctx);
    if (validated.length === 0) {
      logger.warn({ problemId: ctx.problemId }, "No structurally valid cases after generation");
      return;
    }

    const verified = await verifyCases(validated, ctx);
    if (verified.length === 0) {
      logger.warn({ problemId: ctx.problemId }, "No cases passed dual verification");
      return;
    }

    const startIndex = (await maxOrderIndex(ctx.problemId)) + 1;
    const rows = verified.map((c, i) => ({
      problemId: ctx.problemId,
      input: c.input,
      expectedOutput: c.expectedOutput,
      isVisible: false,
      orderIndex: startIndex + i,
    }));

    await createMany(rows);
    logger.info(
      { problemId: ctx.problemId, count: rows.length },
      "Saved LLM-generated hidden test cases",
    );
  }

  const GEN_TAGS = ["DESCRIPTION", "CONSTRAINTS", "VISIBLE_EXAMPLES"];

  async function generateCases(ctx: GenerationContext): Promise<GeneratedCase[]> {
    const systemPrompt = [
      "You are a test case generator for coding problems.",
      "Output ONLY a JSON array of test case objects. No explanation, no markdown fences.",
      'Each object has exactly two keys: "input" and "expectedOutput".',
      `"input" is an object whose keys are: ${ctx.parameterNames.join(", ")}.`,
      "Include edge cases, boundary values, typical cases, and 1-2 stress tests with inputs at constraint upper bounds.",
      "For stress tests, use arrays of 1000-5000 elements (not larger, to stay within token limits).",
    ].join("\n");

    const userPrompt = [
      `Problem: ${ctx.title}`,
      `Method: ${ctx.methodName}(${ctx.parameterNames.join(", ")})`,
      buildDelimitedBlock("DESCRIPTION", ctx.description, GEN_TAGS),
      buildDelimitedBlock("CONSTRAINTS", ctx.constraints.join("\n"), GEN_TAGS),
      buildDelimitedBlock(
        "VISIBLE_EXAMPLES",
        JSON.stringify(ctx.visibleTestCases, null, 2),
        GEN_TAGS,
      ),
      `Generate 10 hidden test cases as a JSON array.`,
    ].join("\n");

    const raw = await groqComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: genTemperature, maxTokens: genMaxTokens },
    );

    return parseGeneratedCases(raw);
  }

  function parseGeneratedCases(raw: string): GeneratedCase[] {
    let cleaned = raw.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("LLM output is not an array");
    }
    return parsed as GeneratedCase[];
  }

  function structuralValidation(cases: GeneratedCase[], ctx: GenerationContext): GeneratedCase[] {
    const sampleOutputType = inferOutputType(ctx.visibleTestCases);
    const paramSet = new Set(ctx.parameterNames);

    return cases
      .filter((c) => {
        if (!c.input || typeof c.input !== "object") return false;
        if (c.expectedOutput == null) return false;

        const inputKeys = new Set(Object.keys(c.input));
        if (inputKeys.size !== paramSet.size) return false;
        for (const key of paramSet) {
          if (!inputKeys.has(key)) return false;
        }

        if (sampleOutputType && inferValueType(c.expectedOutput) !== sampleOutputType) {
          return false;
        }

        return true;
      })
      .slice(0, maxCases);
  }

  function inferOutputType(visibleCases: Array<{ expectedOutput: unknown }>): string | null {
    if (visibleCases.length === 0) return null;
    const types = visibleCases.map((c) => inferValueType(c.expectedOutput));
    const unique = [...new Set(types)];
    return unique.length === 1 ? unique[0] : null;
  }

  function inferValueType(value: unknown): string {
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  async function verifyCases(
    cases: GeneratedCase[],
    ctx: GenerationContext,
  ): Promise<GeneratedCase[]> {
    const CONCURRENCY = 4;
    const verified: GeneratedCase[] = [];

    for (let i = 0; i < cases.length; i += CONCURRENCY) {
      const batch = cases.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((c) => verifyOneCase(c, ctx)));

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled" && result.value) {
          verified.push(batch[j]);
        }
      }
    }

    return verified;
  }

  async function verifyOneCase(testCase: GeneratedCase, ctx: GenerationContext): Promise<boolean> {
    const systemPrompt = [
      "You are a code solution verifier. Given a problem and test input, compute the correct output.",
      "Output ONLY the expected output as valid JSON. No explanation.",
    ].join("\n");

    const userPrompt = [
      `Problem: ${ctx.title} -- Method: ${ctx.methodName}(${ctx.parameterNames.join(", ")})`,
      buildDelimitedBlock("DESCRIPTION", ctx.description, GEN_TAGS),
      `Input: ${JSON.stringify(testCase.input)}`,
      `What is the correct output?`,
    ].join("\n");

    const raw = await groqComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: verifyTemperature, maxTokens: verifyMaxTokens },
    );

    let verifiedOutput: unknown;
    try {
      verifiedOutput = JSON.parse(raw.trim());
    } catch {
      logger.warn({ raw: raw.slice(0, 200) }, "Verification LLM returned invalid JSON");
      return false;
    }
    return JSON.stringify(verifiedOutput) === JSON.stringify(testCase.expectedOutput);
  }

  return {
    async generateForProblem(ctx: GenerationContext): Promise<void> {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await attemptGeneration(ctx);
          return;
        } catch (err) {
          lastError = err;
          logger.warn(
            { err, problemId: ctx.problemId, attempt },
            "Test case generation attempt failed",
          );
        }
      }
      logger.error(
        { err: lastError, problemId: ctx.problemId },
        "Test case generation failed after retries",
      );
    },
  };
}
