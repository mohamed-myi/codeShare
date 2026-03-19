/**
 * In-memory global rate limit counters.
 * Reset on server restart (accepted for MVP).
 */
class GlobalCounters {
  private judge0Today = 0;
  private importsToday = 0;
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
      this.dayStart = today;
    }
  }

  canSubmit(dailyLimit: number): boolean {
    this.rolloverIfNeeded();
    return this.judge0Today < dailyLimit;
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
}

export const globalCounters = new GlobalCounters();
