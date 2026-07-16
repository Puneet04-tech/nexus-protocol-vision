import { Incident, SreAnalytics } from '../types';
import { IncidentRepository } from '../repository/IncidentRepository';

export class IncidentAnalytics {
  private static instance: IncidentAnalytics | null = null;
  private repo = IncidentRepository.getInstance();

  private constructor() {}

  public static getInstance(): IncidentAnalytics {
    if (!this.instance) {
      this.instance = new IncidentAnalytics();
    }
    return this.instance;
  }

  public calculateAnalytics(): SreAnalytics {
    const list = this.repo.getIncidents();
    const totalIncidents = list.length;
    const activeIncidents = list.filter(i => i.status !== 'resolved').length;
    const resolvedIncidents = list.filter(i => i.status === 'resolved').length;

    // 1. Calculate MTTR (Mean Time to Recovery)
    let totalRecoveryTimeMs = 0;
    let resolvedWithTimes = 0;
    for (const inc of list) {
      if (inc.status === 'resolved' && inc.resolvedAt) {
        totalRecoveryTimeMs += (inc.resolvedAt - inc.detectedAt);
        resolvedWithTimes++;
      }
    }
    // Default mock average of 3450ms if no incidents recorded to fit Vite rendering
    const meanTimeToRecoveryMs = resolvedWithTimes > 0 
      ? Math.round(totalRecoveryTimeMs / resolvedWithTimes) 
      : 3450;

    // 2. Calculate MTBF (Mean Time Between Failures)
    let meanTimeBetweenFailuresMs = 18000000; // default 5 hours
    if (totalIncidents > 1) {
      const sorted = [...list].sort((a, b) => a.detectedAt - b.detectedAt);
      let diffsSum = 0;
      for (let i = 1; i < sorted.length; i++) {
        diffsSum += (sorted[i].detectedAt - sorted[i - 1].detectedAt);
      }
      meanTimeBetweenFailuresMs = Math.round(diffsSum / (totalIncidents - 1));
    }

    // 3. System Availability Rate (starts at 99.98%, drops for unresolved criticals)
    let systemAvailabilityPercent = 99.98;
    const unresolvedCriticals = list.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
    const unresolvedHighs = list.filter(i => i.severity === 'high' && i.status !== 'resolved').length;
    
    // SLA degradation: critical active incident takes 0.05% off; high takes 0.02%
    systemAvailabilityPercent -= (unresolvedCriticals * 0.05) + (unresolvedHighs * 0.02);
    if (systemAvailabilityPercent < 90) systemAvailabilityPercent = 90.00;
    systemAvailabilityPercent = parseFloat(systemAvailabilityPercent.toFixed(3));

    // 4. Recovery Success Rate
    // If no recovery jobs executed, assume 100% success rate
    let recoverySuccessRate = 100;
    const recoveringIncidents = list.filter(i => i.recoveryStepsTaken.length > 0);
    if (recoveringIncidents.length > 0) {
      const successfulRecoveries = recoveringIncidents.filter(i => i.status === 'resolved').length;
      recoverySuccessRate = Math.round((successfulRecoveries / recoveringIncidents.length) * 100);
    }

    // 5. Categorize failures
    const failuresByType: Record<string, number> = {};
    const failuresBySeverity: Record<string, number> = {};

    for (const inc of list) {
      failuresByType[inc.component] = (failuresByType[inc.component] || 0) + 1;
      failuresBySeverity[inc.severity] = (failuresBySeverity[inc.severity] || 0) + 1;
    }

    // 6. Trend Timeline
    const trendTimeline: Array<{ timestamp: number; count: number }> = [];
    // Aggregate count per hour for the last 6 hours
    const now = Date.now();
    for (let i = 5; i >= 0; i--) {
      const hourStart = now - i * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;
      const count = list.filter(inc => inc.detectedAt >= hourStart && inc.detectedAt < hourEnd).length;
      trendTimeline.push({
        timestamp: hourStart,
        count
      });
    }

    return {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      recoverySuccessRate,
      meanTimeToRecoveryMs,
      meanTimeBetweenFailuresMs,
      systemAvailabilityPercent,
      failuresByType,
      failuresBySeverity,
      trendTimeline
    };
  }
}
