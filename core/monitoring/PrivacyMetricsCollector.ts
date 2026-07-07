import { PrivacyMetrics } from './MonitoringTypes';

/**
 * Tracks cryptographic negotiations, MPC/ZKP choice ratio, and privacy leakage budgets
 */
export class PrivacyMetricsCollector {
  private negotiationCount: number = 0;
  private mpcCount: number = 0;
  private zkpCount: number = 0;
  private privacyBudgetUsedPercent: number = 18; // base initial utilization
  private trustScores: number[] = [0.85]; // base starting trust average

  public recordNegotiation(protocol: 'MPC' | 'ZKP' | 'hybrid', trustScore: number, budgetConsumedPercent: number): void {
    this.negotiationCount += 1;
    if (protocol === 'MPC') {
      this.mpcCount += 1;
    } else if (protocol === 'ZKP') {
      this.zkpCount += 1;
    } else {
      this.mpcCount += 1;
      this.zkpCount += 1;
    }

    this.privacyBudgetUsedPercent = Math.min(100, this.privacyBudgetUsedPercent + budgetConsumedPercent);
    
    if (trustScore >= 0 && trustScore <= 1.0) {
      this.trustScores.push(trustScore);
      if (this.trustScores.length > 50) {
        this.trustScores.shift();
      }
    }
  }

  public setBudgetUsage(percent: number): void {
    this.privacyBudgetUsedPercent = Math.max(0, Math.min(100, percent));
  }

  public collect(): PrivacyMetrics {
    const averageTrustScore = this.trustScores.length > 0
      ? this.trustScores.reduce((a, b) => a + b, 0) / this.trustScores.length
      : 0.85;

    return {
      negotiationCount: this.negotiationCount,
      mpcProtocolsUsed: this.mpcCount,
      zkpProtocolsUsed: this.zkpCount,
      privacyBudgetUsedPercent: Number(this.privacyBudgetUsedPercent.toFixed(1)),
      averageTrustScore: Number(averageTrustScore.toFixed(3)),
      timestamp: Date.now()
    };
  }
}
