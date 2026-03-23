function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return (trimmed && trimmed.length > 0 ? trimmed : fallback).replace(/\/$/, "");
}

function inferRealtimeBaseFromOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.port !== "5173") {
    return origin.replace(/\/$/, "");
  }

  url.port = "3001";
  return url.toString().replace(/\/$/, "");
}

export function getRealtimeHttpBase(): string {
  return normalizeBaseUrl(
    import.meta.env.VITE_REALTIME_URL,
    inferRealtimeBaseFromOrigin(window.location.origin),
  );
}

export function getRealtimeWsBase(): string {
  const url = new URL(getRealtimeHttpBase());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}
