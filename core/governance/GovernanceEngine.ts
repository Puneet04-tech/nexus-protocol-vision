import { PolicyManager } from './PolicyManager';
import { ComplianceEngine } from './ComplianceEngine';
import { PolicySimulator, SimulationReport } from './PolicySimulator';
import { ComplianceReporter } from './ComplianceReporter';
import { AlertManager } from './AlertManager';
import { AuditLogger } from './AuditLogger';
import { GovernancePolicy } from './models/GovernancePolicy';
import { ComplianceResult } from './models/ComplianceResult';
import { PolicyViolation } from './models/PolicyViolation';
import { SovereignPersona } from '../sovereign-persona/SovereignPersona';
import { Monitoring } from '../monitoring/Monitoring';

export class GovernanceEngine {
  private policyManager = new PolicyManager();
  private complianceEngine = new ComplianceEngine();
  private simulator = new PolicySimulator();
  private reporter = new ComplianceReporter();

  public getManager(): PolicyManager {
    return this.policyManager;
  }

  public getSimulator(): PolicySimulator {
    return this.simulator;
  }

  public getReporter(): ComplianceReporter {
    return this.reporter;
  }

  public getComplianceEngine(): ComplianceEngine {
    return this.complianceEngine;
  }

  /**
   * Compiles the evaluation context from active modules and runs compliance scoring.
   */
  public evaluateSystemState(
    personaInstance: SovereignPersona | undefined,
    role: string = 'Read Only'
  ): ComplianceResult {
    // 1. Gather policies
    const policies = this.policyManager.getPolicies(role);

    // 2. Build security-first, pollution-free evaluation context
    const context = this.compileContext(personaInstance);

    // 3. Evaluate compliance
    const result = this.complianceEngine.evaluateCompliance(policies, context);

    // 4. Handle violations (Triggers alerts & records threat metrics)
    this.processViolations(result.violations);

    // 5. Publish metrics to monitoring
    try {
      const mon = Monitoring.getInstance();
      mon.publishMetric('governance.compliance_percent', result.complianceScore, { cat: 'governance' });
      mon.publishMetric('governance.risk_score', result.riskScore, { cat: 'governance' });
      mon.publishMetric('governance.violations_count', result.violations.length, { cat: 'governance' });
    } catch (e) {
      // Fail-safe if monitoring fails
    }

    return result;
  }

  /**
   * Compile context safely from existing core modules (Sovereign Persona, Privacy, Monitoring, etc.)
   */
  public compileContext(persona: SovereignPersona | undefined): Record<string, any> {
    const context: Record<string, any> = {
      scope: 'system.all',
      timestamp: Date.now(),
    };

    // Integrate with Sovereign Persona & Cognitive Graph
    if (persona) {
      const profile = persona.getProfile();
      context.persona = {
        id: profile.id,
        role: profile.professionalContext?.role || 'User',
        sharingLevel: profile.privacyPreferences?.sharingLevel || 'private',
        encryptionLevel: profile.privacyPreferences?.encryptionLevel || 'standard',
        carbonTarget: profile.carbonFootprintTarget || 100,
        skillsCount: profile.professionalContext?.skills?.length || 0,
        ethicalBoundariesCount: profile.ethicalBoundaries?.length || 0,
      };

      try {
        const graph = persona.getCognitiveGraph();
        const graphState = graph.exportGraph();
        const graphInfo = graph.getCurrentState();

        context.graph = {
          nodesCount: graphState.nodes.length,
          edgesCount: graphState.edges.length,
          averageConfidence: graphInfo.averageConfidence || 0,
          learningVelocity: graphInfo.learningVelocity || 0,
        };
      } catch (e) {
        context.graph = { nodesCount: 0, edgesCount: 0, averageConfidence: 0, learningVelocity: 0 };
      }
    } else {
      context.persona = { role: 'Guest', sharingLevel: 'private', carbonTarget: 100, skillsCount: 0, ethicalBoundariesCount: 0 };
      context.graph = { nodesCount: 0, edgesCount: 0, averageConfidence: 0, learningVelocity: 0 };
    }

    // Integrate with Privacy Negotiator & Monitoring Metrics
    try {
      const mon = Monitoring.getInstance();
      const carbonCollector = mon.carbonCollector.collect();
      const privacyCollector = mon.privacyCollector.collect();
      const threatCollector = mon.threatCollector.collect();
      const sysCollector = mon.systemCollector.collect();

      context.carbon = {
        emissions: carbonCollector.totalEmissionsKg || 0,
        energySavings: carbonCollector.energySavingsPercent || 0,
        budgetUsed: carbonCollector.carbonBudgetUsedPercent || 0,
      };

      context.privacy = {
        trustScore: privacyCollector.averageTrustScore || 0,
        negotiations: privacyCollector.negotiationCount || 0,
        budgetUsed: privacyCollector.privacyBudgetUsedPercent || 0,
      };

      context.threat = {
        activeCount: threatCollector.activeThreatCount || 0,
        detectedTotal: threatCollector.threatsDetectedTotal || 0,
      };

      context.system = {
        cpuLoad: sysCollector.cpuLoadPercent || 0,
        memoryUsage: sysCollector.memoryUsageMb || 0,
      };
    } catch (e) {
      // Mocks in case monitoring is not fully initialized
      context.carbon = { emissions: 0, energySavings: 0, budgetUsed: 0 };
      context.privacy = { trustScore: 1.0, negotiations: 0, budgetUsed: 0 };
      context.threat = { activeCount: 0, detectedTotal: 0 };
      context.system = { cpuLoad: 0, memoryUsage: 0 };
    }

    return context;
  }

  /**
   * Process all violations: triggers alerts via AlertManager and logs critical ones to Monitoring.
   */
  private processViolations(violations: PolicyViolation[]): void {
    const alertManager = AlertManager.getInstance();

    for (const v of violations) {
      // 1. Dispatch alert to subscribers
      alertManager.triggerAlert(v);

      // 2. Audit log violation detection
      AuditLogger.log('VIOLATION_DETECTED', 'System', v.policyId, {
        ruleId: v.ruleId,
        action: v.action,
        severity: v.severity,
        message: v.message,
      });

      // 3. Record threat if severity is high/critical and action is DENY
      if ((v.severity === 'critical' || v.severity === 'high') && v.action === 'DENY') {
        try {
          Monitoring.getInstance().recordThreat(
            `governance_violation:${v.ruleId}`,
            v.severity,
            `Policy violation '${v.policyName}' blocked. Message: ${v.message}`
          );
        } catch (e) {
          // Fail-safe
        }
      }
    }
  }

  /**
   * Run simulation on current state
   */
  public runSimulation(
    simulatedPolicies: GovernancePolicy[],
    personaInstance: SovereignPersona | undefined,
    actor: string = 'Developer'
  ): SimulationReport {
    const currentPolicies = this.policyManager.getPolicies(actor);
    const context = this.compileContext(personaInstance);
    return this.simulator.simulate(currentPolicies, simulatedPolicies, context, actor);
  }
}
