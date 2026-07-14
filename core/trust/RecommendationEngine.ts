import { AgentTrustProfile, TrustConfig } from './TrustTypes';

/**
 * Filter and sort agents based on specific needs.
 */
export class RecommendationEngine {
  /**
   * Recommends a list of agents based on a given criteria and trust threshold.
   * Excludes suspended agents and agents falling below the minimum recommendation threshold.
   */
  public static recommend(
    profiles: AgentTrustProfile[],
    config: TrustConfig,
    criteria: 'highest_trust' | 'highest_reliability' | 'lowest_security_risk' | 'highest_compliance' | 'best_recent_performance',
    limit: number = 5
  ): AgentTrustProfile[] {
    // Filter active/inactive eligible agents above trust threshold
    const eligible = profiles.filter(
      (p) => p.status !== 'suspended' && p.trustScore >= config.recommendationThreshold
    );

    // Sort according to target requirements
    switch (criteria) {
      case 'highest_trust':
        eligible.sort((a, b) => b.trustScore - a.trustScore);
        break;

      case 'highest_reliability':
        eligible.sort((a, b) => {
          const relA =
            a.reliabilityMetrics.uptime * 0.3 +
            a.reliabilityMetrics.taskCompletionRate * 0.4 +
            a.reliabilityMetrics.responseQuality * 0.3;
          const relB =
            b.reliabilityMetrics.uptime * 0.3 +
            b.reliabilityMetrics.taskCompletionRate * 0.4 +
            b.reliabilityMetrics.responseQuality * 0.3;
          return relB - relA;
        });
        break;

      case 'lowest_security_risk':
        // Higher penalties = higher security risk. Sort ascending.
        eligible.sort((a, b) => a.securityMetrics.incidentPenaltiesSum - b.securityMetrics.incidentPenaltiesSum);
        break;

      case 'highest_compliance':
        eligible.sort((a, b) => {
          const compA = a.complianceMetrics.complianceCount;
          const totalViolationsA =
            a.complianceMetrics.violationsCount +
            a.complianceMetrics.permissionMisuseCount +
            a.complianceMetrics.unauthorizedAccessAttempts +
            a.complianceMetrics.privacyViolationsCount;
          const rateA = (compA + totalViolationsA) > 0 ? compA / (compA + totalViolationsA) : 1.0;

          const compB = b.complianceMetrics.complianceCount;
          const totalViolationsB =
            b.complianceMetrics.violationsCount +
            b.complianceMetrics.permissionMisuseCount +
            b.complianceMetrics.unauthorizedAccessAttempts +
            b.complianceMetrics.privacyViolationsCount;
          const rateB = (compB + totalViolationsB) > 0 ? compB / (compB + totalViolationsB) : 1.0;

          return rateB - rateA;
        });
        break;

      case 'best_recent_performance':
        // Prioritize active agents, fall back to collaboration quality
        eligible.sort((a, b) => {
          if (b.lastInteractionTime !== a.lastInteractionTime) {
            return b.lastInteractionTime - a.lastInteractionTime;
          }
          return b.collaborationMetrics.averageQuality - a.collaborationMetrics.averageQuality;
        });
        break;
    }

    return eligible.slice(0, limit);
  }
}
