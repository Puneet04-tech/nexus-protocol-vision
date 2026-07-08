import { StorageAdapter } from './MonitoringTypes';

/**
 * Aggregates high-frequency live telemetry into time-bucketed averages/sums
 */
export class MetricsAggregator {
  private storage: StorageAdapter;
  private currentAggregates: Record<string, number[]> = {};

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * Track value samples for an aggregation cycle
   */
  public addSample(name: string, value: number): void {
    if (!this.currentAggregates[name]) {
      this.currentAggregates[name] = [];
    }
    this.currentAggregates[name].push(value);

    // Safety: Cap local in-memory samples buffer to prevent leakage
    if (this.currentAggregates[name].length > 1000) {
      this.currentAggregates[name].shift();
    }
  }

  /**
   * Run the aggregation rollup, computing the average or max for each bucket,
   * then store it in the appropriate historical collection.
   */
  public async performRollup(resolution: 'hour' | 'day' | 'week' | 'month'): Promise<void> {
    const timestamp = Date.now();
    const snapshot: Record<string, number> = {};

    for (const [key, samples] of Object.entries(this.currentAggregates)) {
      if (samples.length === 0) continue;

      let value = 0;
      if (key.includes('peak') || key.includes('max') || key.includes('Limit')) {
        // Use peak/maximum value
        value = Math.max(...samples);
      } else {
        // Use average value
        const sum = samples.reduce((a, b) => a + b, 0);
        value = sum / samples.length;
      }

      snapshot[key] = Number(value.toFixed(4));
    }

    // Save snapshot to history storage
    await this.storage.saveHistory(resolution, timestamp, snapshot);

    // Reset aggregation memory for next cycle
    this.currentAggregates = {};
  }
}
