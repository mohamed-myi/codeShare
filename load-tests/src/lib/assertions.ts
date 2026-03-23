import type { Assertion } from "../types.js";

export function assertBelow(
  id: string,
  nfrId: string,
  description: string,
  actual: number,
  threshold: number,
): Assertion {
  return {
    id,
    nfrId,
    description,
    target: `< ${threshold}`,
    actual: String(actual),
    passed: actual < threshold,
  };
}

export function assertAbove(
  id: string,
  nfrId: string,
  description: string,
  actual: number,
  threshold: number,
): Assertion {
  return {
    id,
    nfrId,
    description,
    target: `> ${threshold}`,
    actual: String(actual),
    passed: actual > threshold,
  };
}

export function assertWithin(
  id: string,
  nfrId: string,
  description: string,
  actual: number,
  target: number,
  tolerance: number,
): Assertion {
  return {
    id,
    nfrId,
    description,
    target: `${target} +/- ${tolerance}`,
    actual: String(actual),
    passed: Math.abs(actual - target) <= tolerance,
  };
}

export function assertNoFailures(
  id: string,
  nfrId: string,
  description: string,
  failures: number,
  total: number,
): Assertion {
  return {
    id,
    nfrId,
    description,
    target: `0 failures of ${total}`,
    actual: `${failures} failures`,
    passed: failures === 0,
  };
}

export function assertEqual(
  id: string,
  nfrId: string,
  description: string,
  actual: unknown,
  expected: unknown,
): Assertion {
  return {
    id,
    nfrId,
    description,
    target: String(expected),
    actual: String(actual),
    passed: actual === expected,
  };
}
