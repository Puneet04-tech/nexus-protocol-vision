import { AgentTrustProfile } from './TrustTypes';

/**
 * Tracks and updates the operational reliability metrics of an agent.
 */
export class ReliabilityMetrics {
  /**
   * Safely updates reliability fields on the agent profile. Clamps all values between 0.0 and 1.0.
   */
  public static update(
    profile: AgentTrustProfile,
    uptime?: number,
    taskCompletionRate?: number,
    responseQuality?: number
  ): void {
    if (uptime !== undefined) {
      profile.reliabilityMetrics.uptime = Math.max(0.0, Math.min(1.0, uptime));
    }
    
    if (taskCompletionRate !== undefined) {
      profile.reliabilityMetrics.taskCompletionRate = Math.max(0.0, Math.min(1.0, taskCompletionRate));
    }
    
    if (responseQuality !== undefined) {
      profile.reliabilityMetrics.responseQuality = Math.max(0.0, Math.min(1.0, responseQuality));
    }
  }
}
