import { AgentTrustProfile, TrustConfig } from './TrustTypes';

/**
 * Handles decaying trust scores for inactive agents over time.
 */
export class ReputationDecayService {
  /**
   * Applies decay to an agent's trust score if it has been inactive for longer than the decayInterval.
   * Returns the points decayed, or 0 if no decay occurred.
   */
  public static checkAndApplyDecay(
    profile: AgentTrustProfile,
    config: TrustConfig,
    currentTime: number
  ): number {
    // Verified/pinned agents are exempt from decay
    if (profile.verified) {
      return 0;
    }

    const inactiveTime = currentTime - profile.lastInteractionTime;
    if (inactiveTime >= config.decayInterval) {
      const intervalsPassed = Math.floor(inactiveTime / config.decayInterval);
      if (intervalsPassed > 0) {
        const decayAmount = intervalsPassed * config.decayRate;
        const previousScore = profile.trustScore;
        
        profile.trustScore = Math.max(config.minTrust, profile.trustScore - decayAmount);
        
        // Adjust the last interaction time forward by the decayed intervals
        profile.lastInteractionTime += intervalsPassed * config.decayInterval;
        
        return Number((previousScore - profile.trustScore).toFixed(2));
      }
    }

    return 0;
  }

  /**
   * Manually forces a single decay step on an agent (useful for UI simulations).
   */
  public static forceDecay(
    profile: AgentTrustProfile,
    config: TrustConfig,
    decayAmount?: number
  ): number {
    if (profile.verified) {
      return 0;
    }

    const amount = decayAmount !== undefined ? decayAmount : config.decayRate;
    const previousScore = profile.trustScore;
    
    profile.trustScore = Math.max(config.minTrust, profile.trustScore - amount);
    
    return Number((previousScore - profile.trustScore).toFixed(2));
  }
}
