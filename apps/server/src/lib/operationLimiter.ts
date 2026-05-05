export interface OperationLimiterOptions {
  name: string;
  maxInFlight: number;
  maxQueue: number;
}

export interface OperationLimiterSnapshot {
  name: string;
  active: number;
  queued: number;
  maxInFlight: number;
  maxQueue: number;
}

interface QueuedOperation<T> {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class OperationLimitExceededError extends Error {
  readonly operation: string;
  readonly retryAfterSeconds = 1;

  constructor(operation: string) {
    super(`${operation} capacity reached.`);
    this.name = "OperationLimitExceededError";
    this.operation = operation;
  }
}

export class OperationLimiter {
  private readonly queue: Array<QueuedOperation<unknown>> = [];
  private active = 0;

  constructor(private readonly options: OperationLimiterOptions) {
    if (options.maxInFlight < 1) {
      throw new Error("maxInFlight must be at least 1.");
    }
    if (options.maxQueue < 0) {
      throw new Error("maxQueue must be zero or greater.");
    }
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active < this.options.maxInFlight) {
      return this.execute(work);
    }

    if (this.queue.length >= this.options.maxQueue) {
      throw new OperationLimitExceededError(this.options.name);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        work: work as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
    });
  }

  snapshot(): OperationLimiterSnapshot {
    return {
      name: this.options.name,
      active: this.active,
      queued: this.queue.length,
      maxInFlight: this.options.maxInFlight,
      maxQueue: this.options.maxQueue,
    };
  }

  private async execute<T>(work: () => Promise<T>): Promise<T> {
    this.active += 1;
    try {
      return await work();
    } finally {
      this.active -= 1;
      this.drain();
    }
  }

  private drain(): void {
    while (this.active < this.options.maxInFlight && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        return;
      }
      this.execute(next.work).then(next.resolve, next.reject);
    }
  }
}

export function isOperationLimitExceededError(
  error: unknown,
): error is OperationLimitExceededError {
  return error instanceof OperationLimitExceededError;
}
