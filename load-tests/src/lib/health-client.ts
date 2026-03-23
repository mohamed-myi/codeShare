import type { HealthResponse } from "@codeshare/shared";

export async function fetchHealth(serverUrl: string): Promise<HealthResponse> {
  const res = await fetch(`${serverUrl}/api/health?metrics=memory`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

export async function triggerGC(serverUrl: string): Promise<boolean> {
  const res = await fetch(`${serverUrl}/api/test/gc`, { method: "POST" });
  if (!res.ok) return false;
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
      // Server not up yet, keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Server not healthy after ${timeoutMs}ms`);
}

export async function resetTestState(serverUrl: string): Promise<void> {
  const res = await fetch(`${serverUrl}/api/test/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`Test reset failed: ${res.status}`);
}
