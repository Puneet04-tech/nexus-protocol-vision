import { GovernancePolicy } from './models/GovernancePolicy';
import { PolicyViolation } from './models/PolicyViolation';
import { ComplianceEngine } from './ComplianceEngine';
import { AuditLogger } from './AuditLogger';

export interface SimulationReport {
  originalComplianceScore: number;
  originalRiskScore: number;
  simulatedComplianceScore: number;
  simulatedRiskScore: number;
  originalViolationsCount: number;
  simulatedViolationsCount: number;
  newViolations: PolicyViolation[];
  resolvedViolations: PolicyViolation[];
  rollbackSafetyPassed: boolean;
  impactSummary: string;
  timestamp: number;
}

export class PolicySimulator {
  private complianceEngine = new ComplianceEngine();

  /**
   * Run a simulation by comparing current active policies vs a modified set of policies.
   */
  public simulate(
    currentPolicies: GovernancePolicy[],
    simulatedPolicies: GovernancePolicy[],
    context: any,
    actor: string = 'Developer'
  ): SimulationReport {
    AuditLogger.log('SIMULATION_STARTED', actor, undefined, {
      simulatedPoliciesCount: simulatedPolicies.length,
      scope: context.scope,
    });

    const originalResult = this.complianceEngine.evaluateCompliance(currentPolicies, context);
    const simulatedResult = this.complianceEngine.evaluateCompliance(simulatedPolicies, context);

    // Identify new and resolved violations
    const originalIds = new Set(originalResult.violations.map((v) => `${v.policyId}:${v.ruleId}`));
    const simulatedIds = new Set(simulatedResult.violations.map((v) => `${v.policyId}:${v.ruleId}`));

    const newViolations = simulatedResult.violations.filter(
      (v) => !originalIds.has(`${v.policyId}:${v.ruleId}`)
    );
    const resolvedViolations = originalResult.violations.filter(
      (v) => !simulatedIds.has(`${v.policyId}:${v.ruleId}`)
    );

    // Rollback Safety Check: safe if no new critical or high violations are introduced
    const hasCriticalOrHighNew = newViolations.some(
      (v) => v.severity === 'critical' || v.severity === 'high'
    );
    const rollbackSafetyPassed = !hasCriticalOrHighNew;

    // Generate summary
    let impactSummary = 'Simulation completed. No change in compliance state.';
    const scoreDiff = simulatedResult.complianceScore - originalResult.complianceScore;
    const riskDiff = simulatedResult.riskScore - originalResult.riskScore;

    if (scoreDiff !== 0 || riskDiff !== 0 || newViolations.length > 0 || resolvedViolations.length > 0) {
      const scoreDir = scoreDiff >= 0 ? 'improved' : 'decreased';
      const riskDir = riskDiff <= 0 ? 'reduced' : 'increased';

      impactSummary = `Compliance ${scoreDir} by ${Math.abs(scoreDiff)}% (${simulatedResult.complianceScore}%). ` +
        `Risk score ${riskDir} by ${Math.abs(riskDiff)} points (${simulatedResult.riskScore}). ` +
        `Introduced ${newViolations.length} new violations, resolved ${resolvedViolations.length} violations.`;
    }

    AuditLogger.log('SIMULATION_COMPLETED', actor, undefined, {
      scoreDiff,
      riskDiff,
      rollbackSafetyPassed,
    });

    return {
      originalComplianceScore: originalResult.complianceScore,
      originalRiskScore: originalResult.riskScore,
      simulatedComplianceScore: simulatedResult.complianceScore,
      simulatedRiskScore: simulatedResult.riskScore,
      originalViolationsCount: originalResult.violations.length,
      simulatedViolationsCount: simulatedResult.violations.length,
      newViolations,
      resolvedViolations,
      rollbackSafetyPassed,
      impactSummary,
      timestamp: Date.now(),
    };
  }
}
