import { getLoadTestLogger } from "./logger.js";

interface MemorySample {
  heapUsedMB: number;
  rssMB: number;
  timestamp: number;
}

const logger = getLoadTestLogger();

export class PercentileTracker {
  private samples: number[] = [];

  record(value: number): void {
    this.samples.push(value);
  }

  p50(): number {
    return this.percentile(0.5);
  }

  p95(): number {
    return this.percentile(0.95);
  }

  max(): number {
    if (this.samples.length === 0) return 0;
    return Math.max(...this.samples);
  }

  count(): number {
    return this.samples.length;
  }

  reset(): void {
    this.samples = [];
  }

  private percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

export class MemoryRecorder {
  private readonly serverUrl: string;
  private readonly samples: MemorySample[] = [];

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async sample(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.serverUrl}/api/health?metrics=memory`);
    } catch (error) {
      logger.error("load_test_memory_sample_failed", {
        server_url: this.serverUrl,
        error_message: error instanceof Error ? error.message : "Memory sample failed.",
      });
      throw error;
    }
    if (!res.ok) {
      logger.error("load_test_memory_sample_failed", {
        server_url: this.serverUrl,
        status_code: res.status,
      });
      throw new Error(`Health endpoint returned ${res.status}`);
    }
    const data = (await res.json()) as { heapUsedMB: number; rssMB: number };
    this.samples.push({
      heapUsedMB: data.heapUsedMB,
      rssMB: data.rssMB,
      timestamp: Date.now(),
    });
  }

  baseline(): number {
    if (this.samples.length === 0) return 0;
    return this.samples[0].heapUsedMB;
  }

  peak(): number {
    if (this.samples.length === 0) return 0;
    return Math.max(...this.samples.map((s) => s.heapUsedMB));
  }

  latest(): number {
    if (this.samples.length === 0) return 0;
    return this.samples[this.samples.length - 1].heapUsedMB;
  }

  growth(): number {
    return this.latest() - this.baseline();
  }
}

export class ThroughputCounter {
  private readonly timestamps: number[] = [];

  increment(): void {
    this.timestamps.push(Date.now());
  }

  ratePerSecond(windowMs = 1000): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const eventsInWindow = this.timestamps.filter((t) => t >= cutoff).length;
    return eventsInWindow / (windowMs / 1000);
  }

  total(): number {
    return this.timestamps.length;
  }
}
