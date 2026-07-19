import { TrustConfig } from './TrustTypes';

/**
 * Sensible default configuration settings for the Trust & Reputation Engine.
 */
export const DEFAULT_TRUST_CONFIG: TrustConfig = {
  maxTrust: 100.0,
  minTrust: 0.0,
  defaultTrust: 70.0,
  weights: {
    collaboration: 0.30, // 30% weight
    compliance: 0.30,    // 30% weight
    security: 0.25,      // 25% weight
    reliability: 0.15,   // 15% weight
  },
  decayRate: 2.0, // Loss of 2 trust points per decay cycle of inactivity
  decayInterval: 24 * 60 * 60 * 1000, // 24-hour decay interval
  recommendationThreshold: 75.0, // Agents below 75 trust are not recommended
  historyRetentionDays: 30,
  incidentPenalties: {
    low: 5.0,
    medium: 15.0,
    high: 35.0,
    critical: 75.0,
  },
};

/**
 * Validates the weights and parameters of a TrustConfig object.
 * Weights must sum up to 1.0 (100%).
 */
export function validateConfig(config: TrustConfig): boolean {
  if (config.maxTrust <= config.minTrust) return false;
  if (config.defaultTrust < config.minTrust || config.defaultTrust > config.maxTrust) return false;
  
  const totalWeight =
    config.weights.collaboration +
    config.weights.compliance +
    config.weights.security +
    config.weights.reliability;
  
  // Account for floating-point imprecision
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    return false;
  }
  
  if (
    config.decayRate < 0 ||
    config.decayInterval <= 0 ||
    config.recommendationThreshold < config.minTrust ||
    config.recommendationThreshold > config.maxTrust
  ) {
    return false;
  }
  
  return true;
}
