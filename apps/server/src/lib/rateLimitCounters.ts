/**
 * In-memory global rate limit counters.
 * Reset on server restart (accepted for MVP).
 */
class GlobalCounters {
  private judge0Today = 0;
  private importsToday = 0;
  private llmCallsToday = 0;
  private dayStart = this.todayStart();

  private todayStart(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }

  private rolloverIfNeeded(): void {
    const today = this.todayStart();
    if (today > this.dayStart) {
      this.judge0Today = 0;
      this.importsToday = 0;
      this.llmCallsToday = 0;
      this.dayStart = today;
    }
  }

  canSubmit(dailyLimit: number): boolean {
    this.rolloverIfNeeded();
    return this.judge0Today < dailyLimit;
  }

  reserveSubmission(dailyLimit: number): boolean {
    this.rolloverIfNeeded();
    if (this.judge0Today >= dailyLimit) {
      return false;
    }
    this.judge0Today++;
    return true;
  }

  recordSubmission(): void {
    this.rolloverIfNeeded();
    this.judge0Today++;
  }

  canImport(dailyLimit: number): boolean {
    this.rolloverIfNeeded();
    return this.importsToday < dailyLimit;
  }

  recordImport(): void {
    this.rolloverIfNeeded();
    this.importsToday++;
  }

  canCallLLM(dailyLimit: number): boolean {
    this.rolloverIfNeeded();
    return this.llmCallsToday < dailyLimit;
  }

  recordLLMCall(): void {
    this.rolloverIfNeeded();
    this.llmCallsToday++;
  }

  reset(): void {
    this.judge0Today = 0;
    this.importsToday = 0;
    this.llmCallsToday = 0;
    this.dayStart = this.todayStart();
  }
}

export const globalCounters = new GlobalCounters();
