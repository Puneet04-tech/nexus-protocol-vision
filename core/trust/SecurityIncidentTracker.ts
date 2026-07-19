import { AgentTrustProfile, SecurityIncidentEvent, TrustConfig } from './TrustTypes';

/**
 * Handles recording security incidents and applying the appropriate trust score penalties.
 */
export class SecurityIncidentTracker {
  /**
   * Applies a security incident event to the agent profile, updating metrics counters and penalties.
   * Returns the penalty deduction applied.
   */
  public static recordEvent(
    profile: AgentTrustProfile,
    event: SecurityIncidentEvent,
    config: TrustConfig
  ): number {
    const { type, severity } = event;

    switch (type) {
      case 'auth_failure':
        profile.securityMetrics.authFailuresCount += 1;
        break;
      case 'malicious_behavior':
        profile.securityMetrics.maliciousBehaviorCount += 1;
        break;
      case 'suspicious_activity':
        profile.securityMetrics.suspiciousActivityCount += 1;
        break;
    }

    // Determine penalty from config based on severity
    let penalty = 0.0;
    switch (severity) {
      case 'low':
        penalty = config.incidentPenalties.low;
        break;
      case 'medium':
        penalty = config.incidentPenalties.medium;
        break;
      case 'high':
        penalty = config.incidentPenalties.high;
        break;
      case 'critical':
        penalty = config.incidentPenalties.critical;
        break;
    }

    profile.securityMetrics.incidentPenaltiesSum += penalty;
    profile.lastInteractionTime = Math.max(profile.lastInteractionTime, event.timestamp);

    return penalty;
  }
}
