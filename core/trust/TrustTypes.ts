/**
 * Trust & Reputation Types and Interfaces
 */

export interface AgentTrustProfile {
  agentId: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  verified: boolean;
  trustScore: number; // Normalized score: 0.0 to 100.0
  lastInteractionTime: number;
  collaborationMetrics: {
    successfulCollaborations: number;
    failedCollaborations: number;
    totalCollaborations: number;
    averageQuality: number; // 0.0 to 1.0
  };
  complianceMetrics: {
    violationsCount: number;
    complianceCount: number;
    permissionMisuseCount: number;
    unauthorizedAccessAttempts: number;
    privacyViolationsCount: number;
  };
  securityMetrics: {
    authFailuresCount: number;
    maliciousBehaviorCount: number;
    suspiciousActivityCount: number;
    incidentPenaltiesSum: number;
  };
  reliabilityMetrics: {
    uptime: number; // 0.0 to 1.0
    taskCompletionRate: number; // 0.0 to 1.0
    responseQuality: number; // 0.0 to 1.0
  };
}

export interface CollaborationEvent {
  agentId: string;
  success: boolean;
  quality: number; // 0.0 to 1.0
  timestamp: number;
  details?: string;
}

export interface PolicyComplianceEvent {
  agentId: string;
  type: 'violation' | 'compliance' | 'misuse' | 'unauthorized' | 'privacy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details?: string;
}

export interface SecurityIncidentEvent {
  agentId: string;
  type: 'auth_failure' | 'malicious_behavior' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details?: string;
}

export interface ReputationHistoryEntry {
  timestamp: number;
  agentId: string;
  previousScore: number;
  newScore: number;
  eventType: 'collaboration' | 'compliance' | 'security' | 'decay' | 'initialization' | 'config_update';
  reason: string;
  confidence: number; // 0.0 to 1.0
}

export interface TrustConfig {
  maxTrust: number; // 100.0
  minTrust: number; // 0.0
  defaultTrust: number; // Initial trust score for new agents (e.g. 70.0)
  weights: {
    collaboration: number; // 0.0 to 1.0 (percentage of final score)
    compliance: number;
    security: number;
    reliability: number;
  };
  decayRate: number; // Points decayed per period
  decayInterval: number; // Milliseconds of inactivity after which to decay (e.g. daily, or minutes for demo)
  recommendationThreshold: number; // Minimum trust score to recommend an agent
  historyRetentionDays: number; // Retention period for logs
  incidentPenalties: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface TrustAnalyticsReport {
  averageTrust: number;
  highestTrusted: AgentTrustProfile[];
  lowestTrusted: AgentTrustProfile[];
  trustDistribution: { range: string; count: number }[];
  complianceRate: number; // 0.0 to 100.0 (%)
  incidentFrequency: number; // Total incidents logged
  collaborationSuccessRate: number; // 0.0 to 100.0 (%)
  recentTrustChanges: {
    agentId: string;
    name: string;
    previousScore: number;
    newScore: number;
    delta: number;
    timestamp: number;
    reason: string;
  }[];
}
