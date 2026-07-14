import { AgentTrustProfile, TrustConfig } from './TrustTypes';

/**
 * TrustScoreCalculator handles mathematical logic for evaluating trust scores.
 */
export class TrustScoreCalculator {
  /**
   * Calculates the composite trust score for an agent based on its metrics and weights.
   * Returns a normalized score between config.minTrust and config.maxTrust.
   */
  public static calculate(profile: AgentTrustProfile, config: TrustConfig): number {
    const collaborationScore = this.calculateCollaborationScore(profile, config);
    const complianceScore = this.calculateComplianceScore(profile, config);
    const securityScore = this.calculateSecurityScore(profile, config);
    const reliabilityScore = this.calculateReliabilityScore(profile, config);

    // Apply config-driven weights
    const compositeScore =
      collaborationScore * config.weights.collaboration +
      complianceScore * config.weights.compliance +
      securityScore * config.weights.security +
      reliabilityScore * config.weights.reliability;

    // Normalize and clamp between min and max
    return Math.max(config.minTrust, Math.min(config.maxTrust, Number(compositeScore.toFixed(2))));
  }

  /**
   * Collaboration score is based on success rate and average interaction quality.
   */
  public static calculateCollaborationScore(profile: AgentTrustProfile, config: TrustConfig): number {
    const { totalCollaborations, successfulCollaborations, averageQuality } = profile.collaborationMetrics;

    if (totalCollaborations === 0) {
      // Default baseline for new agents. Verified agents start higher.
      return profile.verified ? 85.0 : config.defaultTrust;
    }

    const successRate = successfulCollaborations / totalCollaborations; // 0.0 to 1.0
    
    // 70% weight on success rate, 30% weight on quality of feedback
    const score = (successRate * 70.0) + (averageQuality * 30.0);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Compliance score starts at 100 and decays based on the severity and count of policy violations.
   * Successful compliance reports can slowly recover the compliance score.
   */
  public static calculateComplianceScore(profile: AgentTrustProfile, config: TrustConfig): number {
    const {
      violationsCount,
      complianceCount,
      permissionMisuseCount,
      unauthorizedAccessAttempts,
      privacyViolationsCount,
    } = profile.complianceMetrics;

    let score = 100.0;

    // Apply deductions
    score -= violationsCount * 10.0;
    score -= permissionMisuseCount * 15.0;
    score -= unauthorizedAccessAttempts * 25.0;
    score -= privacyViolationsCount * 30.0;

    // Small recovery factor for successful policy checks
    score += complianceCount * 2.0;

    return Math.max(0.0, Math.min(100.0, score));
  }

  /**
   * Security score starts at 100 and is reduced directly by accumulated security incident penalties.
   */
  public static calculateSecurityScore(profile: AgentTrustProfile, config: TrustConfig): number {
    const score = 100.0 - profile.securityMetrics.incidentPenaltiesSum;
    return Math.max(0.0, Math.min(100.0, score));
  }

  /**
   * Reliability score is computed directly from raw performance ratios (uptime, completion, quality).
   */
  public static calculateReliabilityScore(profile: AgentTrustProfile, config: TrustConfig): number {
    const { uptime, taskCompletionRate, responseQuality } = profile.reliabilityMetrics;

    // Weighted average of metrics (uptime: 30%, taskCompletionRate: 40%, responseQuality: 30%)
    const score = (uptime * 30.0) + (taskCompletionRate * 40.0) + (responseQuality * 30.0);
    
    // Scale up from [0.0 - 1.0] to [0.0 - 100.0]
    return Math.max(0.0, Math.min(100.0, score * 100.0));
  }
}
