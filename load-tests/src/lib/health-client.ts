import type { HealthResponse } from "@codeshare/shared";
import { getLoadTestLogger } from "./logger.js";

const logger = getLoadTestLogger();

export async function fetchHealth(serverUrl: string): Promise<HealthResponse> {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/health?metrics=memory`);
  } catch (error) {
    logger.error("load_test_health_check_failed", {
      server_url: serverUrl,
      error_message: error instanceof Error ? error.message : "Health check failed.",
    });
    throw error;
  }
  if (!res.ok) {
    logger.error("load_test_health_check_failed", {
      server_url: serverUrl,
      status_code: res.status,
    });
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<HealthResponse>;
}

export async function triggerGC(serverUrl: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/test/gc`, { method: "POST" });
  } catch (error) {
    logger.error("load_test_gc_trigger_failed", {
      server_url: serverUrl,
      error_message: error instanceof Error ? error.message : "GC trigger failed.",
    });
    throw error;
  }
  if (!res.ok) {
    logger.error("load_test_gc_trigger_failed", {
      server_url: serverUrl,
      status_code: res.status,
    });
    return false;
  }
  const body = (await res.json()) as { ok: boolean; gcTriggered: boolean };
  return body.gcTriggered;
}

export async function waitForHealthy(
  serverUrl: string,
  timeoutMs = 30_000,
  intervalMs = 500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${serverUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // Expected during server startup; the final timeout log is sufficient
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  logger.warn("load_test_health_wait_failed", {
    server_url: serverUrl,
    timeout_ms: timeoutMs,
  });
  throw new Error(`Server not healthy after ${timeoutMs}ms`);
}

export async function resetTestState(serverUrl: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/test/reset`, { method: "POST" });
  } catch (error) {
    logger.error("load_test_test_reset_failed", {
      server_url: serverUrl,
      error_message: error instanceof Error ? error.message : "Test reset failed.",
    });
    throw error;
  }
  if (!res.ok) {
    logger.error("load_test_test_reset_failed", {
      server_url: serverUrl,
      status_code: res.status,
    });
    throw new Error(`Test reset failed: ${res.status}`);
  }
}

export async function resetTestStateIfAvailable(serverUrl: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/test/reset`, { method: "POST" });
  } catch (error) {
    logger.error("load_test_test_reset_failed", {
      server_url: serverUrl,
      error_message: error instanceof Error ? error.message : "Test reset failed.",
    });
    throw error;
  }

  if (res.ok) {
    return true;
  }

  if (res.status === 403 || res.status === 404) {
    logger.warn("load_test_test_reset_unavailable", {
      server_url: serverUrl,
      status_code: res.status,
    });
    return false;
  }

  logger.error("load_test_test_reset_failed", {
    server_url: serverUrl,
    status_code: res.status,
  });
  throw new Error(`Test reset failed: ${res.status}`);
}

export async function validateProblemData(serverUrl: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api/problems`);
  } catch (error) {
    logger.error("load_test_problem_catalog_failed", {
      server_url: serverUrl,
      error_message: error instanceof Error ? error.message : "Problem catalog request failed.",
    });
    throw new Error(
      `Cannot reach problem catalog at ${serverUrl}/api/problems. ` +
        `Ensure the server is running and DB is seeded.`,
    );
  }

  if (!res.ok) {
    logger.error("load_test_problem_catalog_failed", {
      server_url: serverUrl,
      status_code: res.status,
    });
    throw new Error(
      `Problem catalog returned ${res.status}. ` +
        `Database may need seeding. Run 'pnpm db:seed' or use --auto-start.`,
    );
  }

  const body = (await res.json()) as { problems: Array<{ id: string }> };
  if (body.problems.length === 0) {
    logger.error("load_test_problem_catalog_empty", {
      server_url: serverUrl,
    });
    throw new Error(`No problems in database. Run 'pnpm db:seed' or use --auto-start.`);
  }
}
