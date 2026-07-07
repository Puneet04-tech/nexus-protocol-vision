import { MonitoringUtils } from './MonitoringUtils';

/**
 * Tracks execution latencies, calculating percentiles and peak metrics
 */
export class LatencyTracker {
  private latencyBuffer: number[] = [];
  private maxBufferSize: number = 200;
  private peakLatencyMs: number = 0;
  private latenciesByOperation: Map<string, number[]> = new Map();

  /**
   * Record a new latency measurement
   */
  public record(operation: string, latencyMs: number): void {
    if (latencyMs < 0) return;

    this.latencyBuffer.push(latencyMs);
    if (this.latencyBuffer.length > this.maxBufferSize) {
      this.latencyBuffer.shift();
    }

    if (latencyMs > this.peakLatencyMs) {
      this.peakLatencyMs = latencyMs;
    }

    // Capture by operation
    let opBuffer = this.latenciesByOperation.get(operation);
    if (!opBuffer) {
      opBuffer = [];
      this.latenciesByOperation.set(operation, opBuffer);
    }
    opBuffer.push(latencyMs);
    if (opBuffer.length > 50) {
      opBuffer.shift();
    }
  }

  public getAverage(): number {
    return MonitoringUtils.calculateAverage(this.latencyBuffer);
  }

  public getPeak(): number {
    return this.peakLatencyMs;
  }

  public getPercentiles(): { p50: number; p95: number; p99: number } {
    return MonitoringUtils.calculatePercentiles(this.latencyBuffer);
  }

  public getOperationAverages(): Record<string, number> {
    const averages: Record<string, number> = {};
    for (const [op, list] of this.latenciesByOperation.entries()) {
      averages[op] = Number(MonitoringUtils.calculateAverage(list).toFixed(2));
    }
    return averages;
  }

  public clear(): void {
    this.latencyBuffer = [];
    this.peakLatencyMs = 0;
    this.latenciesByOperation.clear();
  }
}
