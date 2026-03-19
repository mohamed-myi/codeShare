import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared",
  "packages/db",
  "apps/server",
  "apps/client",
]);
