import { CollaborationMetrics } from '../types';
import { CollaborationRepository } from '../repository/CollaborationRepository';

export class CollaborationMonitor {
  private static repository = CollaborationRepository.getInstance();

  /**
   * Records execution metrics entries to repository.
   */
  public static recordMetrics(
    workflowId: string,
    executionId: string,
    durationMs: number,
    carbonSavingsKg: number,
    energyUsedKwh: number,
    privacyScore: number,
    threatsBlocked: number,
    successRate = 1.0
  ): CollaborationMetrics {
    const metric: CollaborationMetrics = {
      workflowId,
      executionId,
      timestamp: Date.now(),
      durationMs,
      carbonSavingsKg,
      energyUsedKwh,
      privacyScore,
      threatsBlocked,
      successRate
    };

    this.repository.saveMetrics(metric);
    return metric;
  }

  /**
   * Computes aggregated metrics over all runs.
   */
  public static getAggregatedMetrics(workflowId?: string) {
    const metrics = this.repository.listMetrics();
    const filtered = workflowId ? metrics.filter(m => m.workflowId === workflowId) : metrics;

    if (filtered.length === 0) {
      return {
        runsCount: 0,
        avgLatencyMs: 0,
        totalCarbonSavingsKg: 0,
        avgEnergyUsedKwh: 0,
        avgPrivacyScore: 100,
        avgSuccessRate: 100
      };
    }

    const runsCount = filtered.length;
    const totalLatency = filtered.reduce((sum, m) => sum + m.durationMs, 0);
    const totalCarbon = filtered.reduce((sum, m) => sum + m.carbonSavingsKg, 0);
    const totalEnergy = filtered.reduce((sum, m) => sum + m.energyUsedKwh, 0);
    const totalPrivacy = filtered.reduce((sum, m) => sum + m.privacyScore, 0);
    const totalSuccess = filtered.reduce((sum, m) => sum + m.successRate, 0);

    return {
      runsCount,
      avgLatencyMs: Math.round(totalLatency / runsCount),
      totalCarbonSavingsKg: Math.round(totalCarbon * 100) / 100,
      avgEnergyUsedKwh: Math.round((totalEnergy / runsCount) * 100) / 100,
      avgPrivacyScore: Math.round((totalPrivacy / runsCount) * 10) / 10,
      avgSuccessRate: Math.round((totalSuccess / runsCount) * 100)
    };
  }
}
