import { CarbonMetrics } from './MonitoringTypes';

/**
 * Collects environmental efficiency stats, emissions, and carbon-aware budget details
 */
export class CarbonMetricsCollector {
  private totalEmissionsKg: number = 0;
  private computationEmissionsKg: number = 0;
  private networkEmissionsKg: number = 0;
  private energySavingsPercent: number = 72; // default base savings
  private renewableEnergyPercent: number = 85; // default base renewable mix
  private dailyBudgetLimitKg: number = 5.0; // limit matching UI demo

  public recordCarbonUsage(emissionsKg: number, computationKg: number, networkKg: number): void {
    if (emissionsKg < 0) return;
    this.totalEmissionsKg += emissionsKg;
    this.computationEmissionsKg += computationKg;
    this.networkEmissionsKg += networkKg;
  }

  public setOptimizerStats(savingsPercent: number, renewablePercent: number): void {
    this.energySavingsPercent = Math.max(0, Math.min(100, savingsPercent));
    this.renewableEnergyPercent = Math.max(0, Math.min(100, renewablePercent));
  }

  public collect(): CarbonMetrics {
    const budgetUsedPercent = (this.totalEmissionsKg / this.dailyBudgetLimitKg) * 100;
    return {
      totalEmissionsKg: Number(this.totalEmissionsKg.toFixed(4)),
      computationEmissionsKg: Number(this.computationEmissionsKg.toFixed(4)),
      networkEmissionsKg: Number(this.networkEmissionsKg.toFixed(4)),
      energySavingsPercent: this.energySavingsPercent,
      renewableEnergyPercent: this.renewableEnergyPercent,
      carbonBudgetUsedPercent: Number(Math.min(100, budgetUsedPercent).toFixed(1)),
      timestamp: Date.now()
    };
  }
}
