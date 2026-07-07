import { PerformanceMetrics } from './MonitoringTypes';

/**
 * Tracks throughput (RPS), total invocations, concurrent calls, and execution success rates
 */
export class PerformanceMonitor {
  private successCount: number = 0;
  private failedCount: number = 0;
  private concurrentRequests: number = 0;
  
  // Rolling array of request timestamps to compute requests per second (RPS)
  private requestTimestamps: number[] = [];

  public startRequest(): void {
    this.concurrentRequests += 1;
    this.requestTimestamps.push(Date.now());
    
    // Prune requests older than 10 seconds to keep RPS calculations accurate
    this.pruneRequestTimestamps();
  }

  public endRequest(success: boolean): void {
    if (this.concurrentRequests > 0) {
      this.concurrentRequests -= 1;
    }
    if (success) {
      this.successCount += 1;
    } else {
      this.failedCount += 1;
    }
  }

  private pruneRequestTimestamps(): void {
    const cutoff = Date.now() - 10000; // 10 seconds window
    this.requestTimestamps = this.requestTimestamps.filter(t => t > cutoff);
  }

  private calculateRps(): number {
    this.pruneRequestTimestamps();
    if (this.requestTimestamps.length === 0) return 0;
    
    // Calculate requests in the last 10 seconds, divided by 10
    return Number((this.requestTimestamps.length / 10).toFixed(1));
  }

  public collect(): PerformanceMetrics {
    const total = this.successCount + this.failedCount;
    const successRate = total > 0 ? (this.successCount / total) * 100 : 100.0;

    return {
      throughputRps: this.calculateRps(),
      successRate: Number(successRate.toFixed(2)),
      failedCount: this.failedCount,
      successCount: this.successCount,
      concurrentRequests: this.concurrentRequests,
      timestamp: Date.now()
    };
  }
}
