import {
  type DailyQuotaResource,
  MemoryReliabilityStore,
  type ReliabilityStore,
} from "./reliabilityStore.js";

class GlobalCounters {
  private store: ReliabilityStore = new MemoryReliabilityStore();

  configure(store: ReliabilityStore): void {
    this.store = store;
  }

  getStore(): ReliabilityStore {
    return this.store;
  }

  async canSubmit(dailyLimit: number): Promise<boolean> {
    return this.hasQuota("judge0", dailyLimit);
  }

  async reserveSubmission(dailyLimit: number): Promise<boolean> {
    return this.reserve("judge0", dailyLimit);
  }

  async recordSubmission(): Promise<void> {
    await this.reserve("judge0", Number.MAX_SAFE_INTEGER);
  }

  async canImport(dailyLimit: number): Promise<boolean> {
    return this.hasQuota("imports", dailyLimit);
  }

  async reserveImport(dailyLimit: number): Promise<boolean> {
    return this.reserve("imports", dailyLimit);
  }

  async recordImport(): Promise<void> {
    await this.reserve("imports", Number.MAX_SAFE_INTEGER);
  }

  async canCallLLM(dailyLimit: number): Promise<boolean> {
    return this.hasQuota("llm", dailyLimit);
  }

  async reserveLLMCall(dailyLimit: number): Promise<boolean> {
    return this.reserve("llm", dailyLimit);
  }

  async recordLLMCall(): Promise<void> {
    await this.reserve("llm", Number.MAX_SAFE_INTEGER);
  }

  async reset(): Promise<void> {
    await this.store.clear();
  }

  private async hasQuota(resource: DailyQuotaResource, dailyLimit: number): Promise<boolean> {
    const snapshot = await this.store.getUsageSnapshot();
    return snapshot[resource] < dailyLimit;
  }

  private async reserve(resource: DailyQuotaResource, dailyLimit: number): Promise<boolean> {
    const reservation = await this.store.reserveDailyQuota({
      resource,
      limit: dailyLimit,
    });
    return reservation.allowed;
  }
}

export const globalCounters = new GlobalCounters();
