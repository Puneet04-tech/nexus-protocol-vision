import { FederatedMetrics } from './MonitoringTypes';

/**
 * Tracks federated training rounds, execution times, and convergence metrics
 */
export class FederatedMetricsCollector {
  private participationRounds: number = 0;
  private convergenceRate: number = 0.45; // base convergence starting point
  private aggregationSuccesses: number = 0;
  private updatesSubmitted: number = 0;
  private roundDurations: number[] = [];

  public recordRound(success: boolean, durationMs: number, convergenceIncrease: number): void {
    this.participationRounds += 1;
    if (success) {
      this.aggregationSuccesses += 1;
      this.updatesSubmitted += 1;
      this.convergenceRate = Math.min(1.0, this.convergenceRate + convergenceIncrease);
    }
    this.roundDurations.push(durationMs);
    if (this.roundDurations.length > 50) {
      this.roundDurations.shift();
    }
  }

  public setConvergenceRate(rate: number): void {
    this.convergenceRate = Math.max(0, Math.min(1, rate));
  }

  public collect(): FederatedMetrics {
    const averageRoundDurationMs = this.roundDurations.length > 0
      ? this.roundDurations.reduce((a, b) => a + b, 0) / this.roundDurations.length
      : 1250; // base round duration in ms

    return {
      participationRounds: this.participationRounds,
      modelConvergenceRate: Number(this.convergenceRate.toFixed(4)),
      secureAggregationSuccesses: this.aggregationSuccesses,
      localUpdatesSubmitted: this.updatesSubmitted,
      averageRoundDurationMs: Number(averageRoundDurationMs.toFixed(1)),
      timestamp: Date.now()
    };
  }
}
