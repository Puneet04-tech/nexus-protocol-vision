import { TrustEngine } from '../TrustEngine';

export interface TestCaseResult {
  suite: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

/**
 * Diagnostics Test Suite for the Trust & Reputation Engine.
 */
export class TrustTestSuite {
  public static async runTests(): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const runTest = async (
      suite: string,
      name: string,
      fn: () => void | Promise<void>
    ) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart,
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err),
        });
      }
    };

    // Save previous database configurations to restore after tests finish
    const prevProfiles = localStorage.getItem('nexus_trust_agent_profiles');
    const prevHistory = localStorage.getItem('nexus_trust_reputation_history');
    const prevConfig = localStorage.getItem('nexus_trust_configuration');

    // Instantiate trust engine and prepare a clean state
    const engine = TrustEngine.getInstance();
    engine.clearAllData();
    engine.resetConfig();

    // 1. REGISTRATION TESTS
    await runTest('Agent Registration', 'should register a new agent with default trust', () => {
      const profile = engine.registerAgent('test-agent-1', 'Test Agent A');
      if (profile.agentId !== 'test-agent-1') throw new Error('Incorrect agentId');
      if (profile.name !== 'Test Agent A') throw new Error('Incorrect name');
      if (profile.trustScore !== 70.0) throw new Error(`Expected default trust score 70.0, got ${profile.trustScore}`);
      if (profile.status !== 'active') throw new Error('Expected active status');
    });

    // 2. COLLABORATION TESTS
    await runTest('Collaboration Scoring', 'should increase trust score on successful collaborations', () => {
      const initialProfile = engine.getAgentProfile('test-agent-1')!;
      const initialScore = initialProfile.trustScore;

      // Log successful collaboration with high quality
      engine.recordCollaboration('test-agent-1', true, 0.95);

      const updatedProfile = engine.getAgentProfile('test-agent-1')!;
      if (updatedProfile.trustScore <= initialScore) {
        throw new Error(`Trust score should increase, went from ${initialScore} to ${updatedProfile.trustScore}`);
      }
      if (updatedProfile.collaborationMetrics.totalCollaborations !== 1) {
        throw new Error('Total collaborations count incorrect');
      }
      if (updatedProfile.collaborationMetrics.successfulCollaborations !== 1) {
        throw new Error('Successful collaborations count incorrect');
      }
    });

    // 3. POLICY COMPLIANCE TESTS
    await runTest('Compliance Verification', 'should reduce trust score on policy infractions', () => {
      const initialProfile = engine.getAgentProfile('test-agent-1')!;
      const initialScore = initialProfile.trustScore;

      engine.recordPolicyCompliance('test-agent-1', 'violation', 'high', 'Policy breach detected');

      const updatedProfile = engine.getAgentProfile('test-agent-1')!;
      if (updatedProfile.trustScore >= initialScore) {
        throw new Error(`Trust score should decrease, went from ${initialScore} to ${updatedProfile.trustScore}`);
      }
      if (updatedProfile.complianceMetrics.violationsCount !== 1) {
        throw new Error('Violations count incorrect');
      }
    });

    // 4. SECURITY INCIDENT TESTS
    await runTest('Security Incidents', 'should apply direct penalties and automatically suspend on malicious behavior', () => {
      const agentId = 'test-security-agent';
      engine.registerAgent(agentId, 'Security Trial Agent');
      const initialScore = engine.getAgentProfile(agentId)!.trustScore;

      // Log a security incident
      engine.recordSecurityIncident(agentId, 'auth_failure', 'medium', 'Auth failed twice');
      let profile = engine.getAgentProfile(agentId)!;
      if (profile.trustScore >= initialScore) {
        throw new Error('Trust score should decrease after security incident');
      }

      // Log critical malicious activity
      engine.recordSecurityIncident(agentId, 'malicious_behavior', 'critical', 'Malicious payload injection attempt');
      profile = engine.getAgentProfile(agentId)!;
      if (profile.status !== 'suspended') {
        throw new Error('Expected agent to be suspended after critical incident');
      }
    });

    // 5. DECAY TESTS
    await runTest('Reputation Inactivity Decay', 'should apply decay to inactive agents, but exempt verified agents', () => {
      const activeAgent = 'decay-test-active';
      const verifiedAgent = 'decay-test-verified';

      engine.registerAgent(activeAgent, 'Active Subnode', false);
      engine.registerAgent(verifiedAgent, 'Verified Core Node', true);

      // Apply single manual decay steps
      const activeDecayed = engine.forceDecayAgent(activeAgent, 8.0);
      const verifiedDecayed = engine.forceDecayAgent(verifiedAgent, 8.0);

      if (activeDecayed !== 8.0) {
        throw new Error(`Active agent should decay 8.0 points, got ${activeDecayed}`);
      }
      if (verifiedDecayed !== 0.0) {
        throw new Error(`Verified/pinned agent should not decay, got ${verifiedDecayed}`);
      }
    });

    // 6. RECOMMENDATION ENGINE TESTS
    await runTest('Recommendation Ranking', 'should rank eligible agents above threshold correctly', () => {
      engine.clearAllData();

      engine.registerAgent('rec-1', 'Core Agent', true, 95.0);
      engine.registerAgent('rec-2', 'Good Agent', false, 82.0);
      engine.registerAgent('rec-3', 'Weak Agent', false, 55.0); // Below standard recommendationThreshold of 75

      engine.updateConfig({ recommendationThreshold: 75.0 });

      const recommendations = engine.getRecommendations('highest_trust');
      if (recommendations.length !== 2) {
        throw new Error(`Expected 2 recommendations, got ${recommendations.length}`);
      }
      if (recommendations[0].agentId !== 'rec-1') {
        throw new Error('rec-1 (score 95) should be ranked above rec-2 (score 82)');
      }
    });

    // 7. ANALYTICS TESTS
    await runTest('Telemetry Analytics', 'should aggregate report statistics correctly', () => {
      const report = engine.getAnalytics();
      if (typeof report.averageTrust !== 'number') {
        throw new Error('Expected averageTrust to be a number');
      }
      if (report.highestTrusted.length === 0) {
        throw new Error('Expected highestTrusted list to contain agents');
      }
    });

    // 8. EDGE CASES TESTS
    await runTest('Clamping & Configurations', 'should clamp scores to min/max configuration limits', () => {
      const edgeAgent = 'test-edge-agent';
      engine.registerAgent(edgeAgent, 'Edge Agent', false, 99.0);

      // Subtract enormous penalties
      engine.recordSecurityIncident(edgeAgent, 'malicious_behavior', 'critical');
      engine.recordSecurityIncident(edgeAgent, 'malicious_behavior', 'critical');
      engine.recordSecurityIncident(edgeAgent, 'malicious_behavior', 'critical');

      const profile = engine.getAgentProfile(edgeAgent)!;
      if (profile.trustScore < 0.0) {
        throw new Error(`Score should clamp at config.minTrust (0.0), got ${profile.trustScore}`);
      }
    });

    // Restore previous database configurations
    if (prevProfiles) localStorage.setItem('nexus_trust_agent_profiles', prevProfiles);
    else localStorage.removeItem('nexus_trust_agent_profiles');

    if (prevHistory) localStorage.setItem('nexus_trust_reputation_history', prevHistory);
    else localStorage.removeItem('nexus_trust_reputation_history');

    if (prevConfig) localStorage.setItem('nexus_trust_configuration', prevConfig);
    else localStorage.removeItem('nexus_trust_configuration');

    // Force engine reload
    engine.clearAllData();
    (engine as any).loadConfig();
    (engine as any).manager.loadFromStorage();

    const end = Date.now();
    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests,
    };
  }
}
