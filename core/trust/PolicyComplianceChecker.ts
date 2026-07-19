import { AgentTrustProfile, PolicyComplianceEvent } from './TrustTypes';

/**
 * Tracks and logs policy compliance events.
 */
export class PolicyComplianceChecker {
  /**
   * Applies a policy event (success or infraction) to the agent profile's compliance counters.
   */
  public static recordEvent(profile: AgentTrustProfile, event: PolicyComplianceEvent): void {
    const { type } = event;

    switch (type) {
      case 'compliance':
        profile.complianceMetrics.complianceCount += 1;
        break;
      case 'violation':
        profile.complianceMetrics.violationsCount += 1;
        break;
      case 'misuse':
        profile.complianceMetrics.permissionMisuseCount += 1;
        break;
      case 'unauthorized':
        profile.complianceMetrics.unauthorizedAccessAttempts += 1;
        break;
      case 'privacy_violation':
        profile.complianceMetrics.privacyViolationsCount += 1;
        break;
    }

    // Mark active interaction time
    profile.lastInteractionTime = Math.max(profile.lastInteractionTime, event.timestamp);
  }
}
