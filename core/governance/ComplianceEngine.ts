import { GovernancePolicy } from './models/GovernancePolicy';
import { ComplianceResult, RiskLevel } from './models/ComplianceResult';
import { PolicyViolation } from './models/PolicyViolation';
import { PolicyEvaluator } from './PolicyEvaluator';

export class ComplianceEngine {
  private evaluator = new PolicyEvaluator();

  /**
   * Evaluate context against all active policies and compute compliance statistics
   */
  public evaluateCompliance(policies: GovernancePolicy[], context: any): ComplianceResult {
    const activePolicies = policies.filter((p) => p.status === 'active' && p.approvalState === 'approved');
    const pendingPolicies = policies.filter((p) => p.approvalState === 'pending_approval');
    
    const violations: PolicyViolation[] = [];
    const passedPolicies: string[] = [];
    const failedPolicies: string[] = [];

    for (const policy of activePolicies) {
      const policyViolations = this.evaluator.evaluate(policy, context);
      if (policyViolations.length > 0) {
        violations.push(...policyViolations);
        failedPolicies.push(policy.id);
      } else {
        passedPolicies.push(policy.id);
      }
    }

    // Scores calculation
    const totalActive = activePolicies.length;
    const failedCount = failedPolicies.length;
    const passedCount = passedPolicies.length;

    // Compliance Score: % of active policies that passed (100% if no active policies)
    const complianceScore = totalActive === 0 ? 100 : Math.round((passedCount / totalActive) * 100);

    // Risk Score: starts at 0, increases with each violation severity, capped at 100
    let calculatedRisk = 0;
    for (const v of violations) {
      switch (v.severity) {
        case 'critical':
          calculatedRisk += 45;
          break;
        case 'high':
          calculatedRisk += 25;
          break;
        case 'medium':
          calculatedRisk += 12;
          break;
        case 'low':
          calculatedRisk += 5;
          break;
      }
    }
    const riskScore = Math.min(100, Math.max(0, calculatedRisk));

    // Risk level classification
    let riskLevel: RiskLevel = 'low';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    // Summary description
    let violationSummary = 'System is fully compliant. No policy violations detected.';
    if (violations.length > 0) {
      const crit = violations.filter((v) => v.severity === 'critical').length;
      const high = violations.filter((v) => v.severity === 'high').length;
      const med = violations.filter((v) => v.severity === 'medium').length;
      const low = violations.filter((v) => v.severity === 'low').length;

      const items: string[] = [];
      if (crit > 0) items.push(`${crit} critical`);
      if (high > 0) items.push(`${high} high`);
      if (med > 0) items.push(`${med} medium`);
      if (low > 0) items.push(`${low} low`);

      violationSummary = `${violations.length} policy violations detected (${items.join(', ')}).`;
    }

    // Recommendation logic based on triggered violation properties
    const recommendations = this.generateRecommendations(violations, context);

    return {
      complianceScore,
      riskScore,
      riskLevel,
      violationSummary,
      passedPoliciesCount: passedCount,
      failedPoliciesCount: failedCount,
      passedPolicies,
      failedPolicies,
      pendingPolicies: pendingPolicies.map((p) => p.id),
      violations,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Generates localized compliance recommendations based on violation scope and fields
   */
  private generateRecommendations(violations: PolicyViolation[], context: any): string[] {
    const list: string[] = [];

    if (violations.length === 0) {
      list.push('Maintain current state. Continue background audit logs and validation cycles.');
      return list;
    }

    const scopes = new Set(violations.map((v) => v.scope));

    for (const v of violations) {
      const field = v.condition.field;
      if (v.scope.startsWith('carbon') || (field && field.includes('carbon'))) {
        list.push('Recommendation: Scale down inference model size, batch transactions, or configure carbon-aware optimizer schedule.');
      }
      if (v.scope.startsWith('privacy') || (field && field.includes('privacy')) || (field && field.includes('trust'))) {
        list.push('Recommendation: Adjust Privacy Negotiator level to selective/private, or enforce strict ZKP protocol handshake rules.');
      }
      if (v.scope.startsWith('persona') || (field && field.includes('boundary')) || (field && field.includes('interaction'))) {
        list.push('Recommendation: Refine Sovereign Persona ethical limits or review data logs in local storage.');
      }
      if (v.scope.startsWith('graph') || (field && field.includes('complexity'))) {
        list.push('Recommendation: Run MorphNet optimization routines to compress active Cognitive Graph nodes and edges.');
      }
    }

    // General fallback recommendation
    if (list.length === 0) {
      list.push('Recommendation: Review active policy parameters and adjust triggers to match operating environments.');
    }

    // Remove duplicates
    return Array.from(new Set(list));
  }
}
