declare global {
  interface Window {
    __codeshareTestControls?: {
      joinAckDelayMs?: number;
    };
  }
}

const MAX_JOIN_ACK_DELAY_MS = 5_000;

export function getJoinAckDelayMs(): number {
  if (!import.meta.env.DEV) {
    return 0;
  }

  const delayMs = window.__codeshareTestControls?.joinAckDelayMs;
  if (typeof delayMs !== "number" || !Number.isFinite(delayMs)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(delayMs), 0), MAX_JOIN_ACK_DELAY_MS);
}
