import { DependencyError } from "./dependencyError.js";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  reset(): void;
}

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const { name, failureThreshold = 5, resetTimeoutMs = 30_000, onStateChange } = options;

  let state: CircuitState = "closed";
  let consecutiveFailures = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  function transition(to: CircuitState): void {
    const from = state;
    if (from === to) return;
    state = to;
    onStateChange?.(from, to);
  }

  function scheduleHalfOpen(): void {
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      resetTimer = null;
      transition("half_open");
    }, resetTimeoutMs);
  }

  function recordSuccess(): void {
    consecutiveFailures = 0;
    if (state === "half_open") {
      transition("closed");
    }
  }

  function recordFailure(): void {
    consecutiveFailures += 1;

    if (state === "half_open") {
      transition("open");
      scheduleHalfOpen();
      return;
    }

    if (state === "closed" && consecutiveFailures >= failureThreshold) {
      transition("open");
      scheduleHalfOpen();
    }
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (state === "open") {
        throw new DependencyError({
          dependency: name,
          operation: "execute",
          errorType: "circuit_open",
          message: `Circuit breaker for ${name} is open. Requests are being rejected.`,
        });
      }

      try {
        const result = await fn();
        recordSuccess();
        return result;
      } catch (error) {
        recordFailure();
        throw error;
      }
    },

    getState(): CircuitState {
      return state;
    },

    reset(): void {
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
      consecutiveFailures = 0;
      transition("closed");
    },
  };
}
