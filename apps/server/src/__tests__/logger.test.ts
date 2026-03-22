import { describe, it, expect, afterEach } from "vitest";
import { createLogger } from "../lib/logger.js";

describe("createLogger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("initializes in development without throwing", () => {
    process.env.NODE_ENV = "development";

    expect(() => createLogger("info")).not.toThrow();
  });
});
