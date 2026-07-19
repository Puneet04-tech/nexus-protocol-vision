import { AgentTrustProfile, ReputationHistoryEntry, TrustAnalyticsReport } from './TrustTypes';

/**
 * Aggregates logs and agent profile states to produce diagnostic analytics reports.
 */
export class TrustAnalytics {
  /**
   * Generates a comprehensive trust telemetry report.
   */
  public static generateReport(
    profiles: AgentTrustProfile[],
    history: ReputationHistoryEntry[]
  ): TrustAnalyticsReport {
    if (profiles.length === 0) {
      return {
        averageTrust: 0.0,
        highestTrusted: [],
        lowestTrusted: [],
        trustDistribution: [
          { range: '0-20', count: 0 },
          { range: '21-40', count: 0 },
          { range: '41-60', count: 0 },
          { range: '61-80', count: 0 },
          { range: '81-100', count: 0 },
        ],
        complianceRate: 100.0,
        incidentFrequency: 0,
        collaborationSuccessRate: 100.0,
        recentTrustChanges: [],
      };
    }

    // 1. Calculate average trust score
    const totalTrust = profiles.reduce((sum, p) => sum + p.trustScore, 0);
    const averageTrust = Number((totalTrust / profiles.length).toFixed(1));

    // 2. Highest and lowest trusted agents
    const sortedByTrust = [...profiles].sort((a, b) => b.trustScore - a.trustScore);
    const highestTrusted = sortedByTrust.slice(0, 3);
    const lowestTrusted = [...sortedByTrust].reverse().slice(0, 3);

    // 3. Trust distribution buckets
    const distributionMap = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };
    
    profiles.forEach((p) => {
      const score = p.trustScore;
      if (score <= 20.0) distributionMap['0-20']++;
      else if (score <= 40.0) distributionMap['21-40']++;
      else if (score <= 60.0) distributionMap['41-60']++;
      else if (score <= 80.0) distributionMap['61-80']++;
      else distributionMap['81-100']++;
    });

    const trustDistribution = Object.entries(distributionMap).map(([range, count]) => ({
      range,
      count,
    }));

    // 4. Compliance Rate
    let totalChecks = 0;
    let totalViolations = 0;
    
    profiles.forEach((p) => {
      totalChecks += p.complianceMetrics.complianceCount;
      totalViolations +=
        p.complianceMetrics.violationsCount +
        p.complianceMetrics.permissionMisuseCount +
        p.complianceMetrics.unauthorizedAccessAttempts +
        p.complianceMetrics.privacyViolationsCount;
    });
    
    const complianceRate =
      totalChecks + totalViolations > 0
        ? Number(((totalChecks / (totalChecks + totalViolations)) * 100).toFixed(1))
        : 100.0;

    // 5. Incident frequency (total security infractions)
    const incidentFrequency = profiles.reduce((sum, p) => {
      return (
        sum +
        p.securityMetrics.authFailuresCount +
        p.securityMetrics.maliciousBehaviorCount +
        p.securityMetrics.suspiciousActivityCount
      );
    }, 0);

    // 6. Collaboration success rate
    let totalCollab = 0;
    let successCollab = 0;
    
    profiles.forEach((p) => {
      totalCollab += p.collaborationMetrics.totalCollaborations;
      successCollab += p.collaborationMetrics.successfulCollaborations;
    });
    
    const collaborationSuccessRate =
      totalCollab > 0 ? Number(((successCollab / totalCollab) * 100).toFixed(1)) : 100.0;

    // 7. Recent trust changes from audit log
    const recentHistory = history
      .filter((h) => h.eventType !== 'initialization' && h.eventType !== 'config_update')
      .slice(0, 10)
      .map((h) => {
        const matchedAgent = profiles.find((p) => p.agentId === h.agentId);
        return {
          agentId: h.agentId,
          name: matchedAgent ? matchedAgent.name : 'Unknown Agent',
          previousScore: h.previousScore,
          newScore: h.newScore,
          delta: Number((h.newScore - h.previousScore).toFixed(2)),
          timestamp: h.timestamp,
          reason: h.reason,
        };
      });

    return {
      averageTrust,
      highestTrusted,
      lowestTrusted,
      trustDistribution,
      complianceRate,
      incidentFrequency,
      collaborationSuccessRate,
      recentTrustChanges: recentHistory,
    };
  }
}
