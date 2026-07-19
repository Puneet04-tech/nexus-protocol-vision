import {
  AgentTrustProfile,
  CollaborationEvent,
  PolicyComplianceEvent,
  SecurityIncidentEvent,
  ReputationHistoryEntry,
  TrustConfig,
  TrustAnalyticsReport,
} from './TrustTypes';
import { DEFAULT_TRUST_CONFIG, validateConfig } from './TrustConfig';
import { ReputationManager } from './ReputationManager';
import { TrustScoreCalculator } from './TrustScoreCalculator';
import { PolicyComplianceChecker } from './PolicyComplianceChecker';
import { SecurityIncidentTracker } from './SecurityIncidentTracker';
import { ReliabilityMetrics } from './ReliabilityMetrics';
import { ReputationDecayService } from './ReputationDecayService';
import { RecommendationEngine } from './RecommendationEngine';
import { TrustAnalytics } from './TrustAnalytics';

/**
 * Main facade orchestrating the Trust & Reputation Engine services.
 */
export class TrustEngine {
  private static instance: TrustEngine | null = null;
  
  private manager: ReputationManager;
  private config: TrustConfig = DEFAULT_TRUST_CONFIG;
  private readonly configStorageKey = 'nexus_trust_configuration';

  private constructor() {
    this.manager = new ReputationManager();
    this.loadConfig();
  }

  /**
   * Retrieves the global singleton instance of the TrustEngine.
   */
  public static getInstance(): TrustEngine {
    if (!this.instance) {
      this.instance = new TrustEngine();
    }
    return this.instance;
  }

  /**
   * Loads configurations from localStorage if available.
   */
  private loadConfig(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const savedConfig = localStorage.getItem(this.configStorageKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (validateConfig(parsed)) {
          this.config = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load trust configurations:', e);
    }
  }

  /**
   * Saves and updates the active configuration.
   */
  public updateConfig(newConfig: Partial<TrustConfig>): void {
    const updated = { ...this.config, ...newConfig };
    if (validateConfig(updated)) {
      this.config = updated;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.configStorageKey, JSON.stringify(this.config));
      }
      
      // Log config change in history
      const logEntry: ReputationHistoryEntry = {
        timestamp: Date.now(),
        agentId: 'system',
        previousScore: 0.0,
        newScore: 0.0,
        eventType: 'config_update',
        reason: 'Configuration weights or parameters adjusted.',
        confidence: 1.0,
      };
      this.manager.getHistory().addEntry(logEntry);
      
      // Recalculate all scores since weights might have changed
      this.recalculateAllAgentScores();
    } else {
      throw new Error('Invalid configuration payload provided.');
    }
  }

  /**
   * Resets configurations back to system defaults.
   */
  public resetConfig(): void {
    this.config = { ...DEFAULT_TRUST_CONFIG };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.configStorageKey);
    }
    this.recalculateAllAgentScores();
  }

  /**
   * Returns current active configurations.
   */
  public getConfig(): TrustConfig {
    return this.config;
  }

  /**
   * Registers a new AI Agent profile in the system.
   */
  public registerAgent(
    agentId: string,
    name: string,
    verified: boolean = false,
    initialScore?: number
  ): AgentTrustProfile {
    const existing = this.manager.getProfile(agentId);
    if (existing) {
      return existing;
    }

    const timestamp = Date.now();
    const startScore = initialScore !== undefined ? initialScore : this.config.defaultTrust;

    const newProfile: AgentTrustProfile = {
      agentId,
      name,
      status: 'active',
      verified,
      trustScore: startScore,
      lastInteractionTime: timestamp,
      collaborationMetrics: {
        successfulCollaborations: 0,
        failedCollaborations: 0,
        totalCollaborations: 0,
        averageQuality: 1.0,
      },
      complianceMetrics: {
        violationsCount: 0,
        complianceCount: 0,
        permissionMisuseCount: 0,
        unauthorizedAccessAttempts: 0,
        privacyViolationsCount: 0,
      },
      securityMetrics: {
        authFailuresCount: 0,
        maliciousBehaviorCount: 0,
        suspiciousActivityCount: 0,
        incidentPenaltiesSum: 0.0,
      },
      reliabilityMetrics: {
        uptime: 1.0,
        taskCompletionRate: 1.0,
        responseQuality: 1.0,
      },
    };

    this.manager.setProfile(newProfile);

    // Audit initial registration
    this.manager.getHistory().addEntry({
      timestamp,
      agentId,
      previousScore: 0.0,
      newScore: startScore,
      eventType: 'initialization',
      reason: `Agent '${name}' initialized with baseline trust.`,
      confidence: 1.0,
    });

    return newProfile;
  }

  /**
   * Records details of a collaboration outcome.
   */
  public recordCollaboration(
    agentId: string,
    success: boolean,
    quality: number,
    details?: string
  ): void {
    const profile = this.manager.getProfile(agentId);
    if (!profile) return;

    const previousScore = profile.trustScore;
    const metrics = profile.collaborationMetrics;

    // Recalculate averages
    const currentTotalVal = metrics.averageQuality * metrics.totalCollaborations;
    metrics.totalCollaborations += 1;
    if (success) {
      metrics.successfulCollaborations += 1;
    } else {
      metrics.failedCollaborations += 1;
    }
    metrics.averageQuality = (currentTotalVal + quality) / metrics.totalCollaborations;
    profile.lastInteractionTime = Date.now();

    // Compute updated scores
    const newScore = TrustScoreCalculator.calculate(profile, this.config);
    profile.trustScore = newScore;
    this.manager.setProfile(profile);

    // Log history
    this.manager.getHistory().addEntry({
      timestamp: Date.now(),
      agentId,
      previousScore,
      newScore,
      eventType: 'collaboration',
      reason: details || `Collaboration completed (${success ? 'Success' : 'Failure'}, quality: ${quality.toFixed(2)})`,
      confidence: 0.9,
    });
  }

  /**
   * Records a policy verification check or infraction.
   */
  public recordPolicyCompliance(
    agentId: string,
    type: 'violation' | 'compliance' | 'misuse' | 'unauthorized' | 'privacy_violation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: string
  ): void {
    const profile = this.manager.getProfile(agentId);
    if (!profile) return;

    const previousScore = profile.trustScore;

    PolicyComplianceChecker.recordEvent(profile, {
      agentId,
      type,
      severity,
      timestamp: Date.now(),
      details,
    });

    const newScore = TrustScoreCalculator.calculate(profile, this.config);
    profile.trustScore = newScore;
    
    // Auto-suspend agents exhibiting repeated critical policy failures
    if (profile.complianceMetrics.violationsCount >= 5 || type === 'privacy_violation') {
      profile.status = 'suspended';
    }

    this.manager.setProfile(profile);

    this.manager.getHistory().addEntry({
      timestamp: Date.now(),
      agentId,
      previousScore,
      newScore,
      eventType: 'compliance',
      reason: details || `Policy event recorded: ${type} (${severity} severity)`,
      confidence: 0.95,
    });
  }

  /**
   * Logs a security infraction, applying penalties.
   */
  public recordSecurityIncident(
    agentId: string,
    type: 'auth_failure' | 'malicious_behavior' | 'suspicious_activity',
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: string
  ): void {
    const profile = this.manager.getProfile(agentId);
    if (!profile) return;

    const previousScore = profile.trustScore;

    const penalty = SecurityIncidentTracker.recordEvent(profile, {
      agentId,
      type,
      severity,
      timestamp: Date.now(),
      details,
    }, this.config);

    const newScore = TrustScoreCalculator.calculate(profile, this.config);
    profile.trustScore = newScore;

    // Suspend agent automatically on critical security threats
    if (severity === 'critical' || type === 'malicious_behavior') {
      profile.status = 'suspended';
    }

    this.manager.setProfile(profile);

    this.manager.getHistory().addEntry({
      timestamp: Date.now(),
      agentId,
      previousScore,
      newScore,
      eventType: 'security',
      reason: details || `Security incident logged: ${type} (${severity} severity, -${penalty} pts)`,
      confidence: 1.0,
    });
  }

  /**
   * Adjusts performance reliability inputs.
   */
  public updateReliability(
    agentId: string,
    uptime?: number,
    taskCompletionRate?: number,
    responseQuality?: number
  ): void {
    const profile = this.manager.getProfile(agentId);
    if (!profile) return;

    const previousScore = profile.trustScore;

    ReliabilityMetrics.update(profile, uptime, taskCompletionRate, responseQuality);

    const newScore = TrustScoreCalculator.calculate(profile, this.config);
    profile.trustScore = newScore;
    this.manager.setProfile(profile);

    if (Math.abs(newScore - previousScore) > 0.01) {
      this.manager.getHistory().addEntry({
        timestamp: Date.now(),
        agentId,
        previousScore,
        newScore,
        eventType: 'collaboration',
        reason: 'Reliability performance metrics updated.',
        confidence: 0.8,
      });
    }
  }

  /**
   * Scans and decays reputations for all eligible inactive agents.
   */
  public runDecay(): { agentId: string; name: string; decayedAmount: number }[] {
    const profiles = this.manager.getProfiles();
    const currentTime = Date.now();
    const decayedList: { agentId: string; name: string; decayedAmount: number }[] = [];

    profiles.forEach((profile) => {
      const previousScore = profile.trustScore;
      const decayAmount = ReputationDecayService.checkAndApplyDecay(profile, this.config, currentTime);
      
      if (decayAmount > 0) {
        this.manager.setProfile(profile);
        this.manager.getHistory().addEntry({
          timestamp: currentTime,
          agentId: profile.agentId,
          previousScore,
          newScore: profile.trustScore,
          eventType: 'decay',
          reason: `Decay applied due to inactivity (-${decayAmount} pts)`,
          confidence: 1.0,
        });

        decayedList.push({
          agentId: profile.agentId,
          name: profile.name,
          decayedAmount: decayAmount,
        });
      }
    });

    return decayedList;
  }

  /**
   * Forces manual decay step on a single agent.
   */
  public forceDecayAgent(agentId: string, decayAmount?: number): number {
    const profile = this.manager.getProfile(agentId);
    if (!profile) return 0;

    const previousScore = profile.trustScore;
    const decayApplied = ReputationDecayService.forceDecay(profile, this.config, decayAmount);
    
    if (decayApplied > 0) {
      this.manager.setProfile(profile);
      this.manager.getHistory().addEntry({
        timestamp: Date.now(),
        agentId: profile.agentId,
        previousScore,
        newScore: profile.trustScore,
        eventType: 'decay',
        reason: `Manual decay simulation cycle triggered (-${decayApplied} pts)`,
        confidence: 1.0,
      });
    }

    return decayApplied;
  }

  /**
   * Triggers re-calculations for all active agents.
   */
  private recalculateAllAgentScores(): void {
    const profiles = this.manager.getProfiles();
    profiles.forEach((profile) => {
      const newScore = TrustScoreCalculator.calculate(profile, this.config);
      profile.trustScore = newScore;
      this.manager.setProfile(profile);
    });
  }

  /**
   * Returns list of recommended agents matching query metrics.
   */
  public getRecommendations(
    criteria: 'highest_trust' | 'highest_reliability' | 'lowest_security_risk' | 'highest_compliance' | 'best_recent_performance',
    limit: number = 5
  ): AgentTrustProfile[] {
    return RecommendationEngine.recommend(this.manager.getProfiles(), this.config, criteria, limit);
  }

  /**
   * Generates dynamic telemetry metrics.
   */
  public getAnalytics(): TrustAnalyticsReport {
    return TrustAnalytics.generateReport(
      this.manager.getProfiles(),
      this.manager.getHistory().getEntries()
    );
  }

  /**
   * Retrieves historical logs.
   */
  public getHistory(agentId?: string): ReputationHistoryEntry[] {
    return this.manager.getHistory().getHistory(agentId);
  }

  /**
   * Fetches an individual profile.
   */
  public getAgentProfile(agentId: string): AgentTrustProfile | undefined {
    return this.manager.getProfile(agentId);
  }

  /**
   * Returns all stored profiles.
   */
  public getProfiles(): AgentTrustProfile[] {
    return this.manager.getProfiles();
  }

  /**
   * Clears storage.
   */
  public clearAllData(): void {
    this.manager.clearAllData();
  }

  /**
   * Seeds sample mock data to initialize the dashboard dashboard state.
   */
  public seedData(): void {
    if (this.getProfiles().length > 0) return;

    this.registerAgent('agent-sovereign-core', 'Sovereign Nexus Core', true, 96.5);
    this.registerAgent('agent-privacy-bridge', 'MPC Privacy Negotiator', true, 92.0);
    this.registerAgent('agent-federated-node-1', 'Federated Learning Client A', false, 84.5);
    this.registerAgent('agent-carbon-optimizer', 'Carbon-Aware Scheduler', false, 88.0);
    this.registerAgent('agent-malicious-attacker', 'Adversarial Test Sandbox', false, 32.5);

    // Initial seeding interactions
    this.recordCollaboration('agent-sovereign-core', true, 0.95, 'Completed main persona sync');
    this.recordCollaboration('agent-privacy-bridge', true, 0.92, 'Secure key negotiation complete');
    this.recordCollaboration('agent-federated-node-1', true, 0.85, 'Model gradient upload accepted');
    this.recordCollaboration('agent-federated-node-1', false, 0.40, 'Connection timeout failure');

    // Violations and incidents to make it look organic
    this.recordPolicyCompliance('agent-malicious-attacker', 'violation', 'high', 'Attempted direct data read violation');
    this.recordSecurityIncident('agent-malicious-attacker', 'auth_failure', 'medium', 'Multiple bad handshake errors detected');

    // Reliability configs
    this.updateReliability('agent-sovereign-core', 0.995, 0.99, 0.96);
    this.updateReliability('agent-privacy-bridge', 0.98, 0.96, 0.93);
    this.updateReliability('agent-federated-node-1', 0.89, 0.84, 0.78);
    this.updateReliability('agent-carbon-optimizer', 0.94, 0.91, 0.87);
    this.updateReliability('agent-malicious-attacker', 0.45, 0.35, 0.30);
  }
}
