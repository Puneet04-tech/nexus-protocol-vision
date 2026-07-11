import { GovernancePolicy } from './models/GovernancePolicy';
import { ComplianceResult } from './models/ComplianceResult';
import { PolicyViolation } from './models/PolicyViolation';
import { AuditLogger } from './AuditLogger';

export class ComplianceReporter {
  /**
   * Generates a complete report object containing compliance statistics, violation details, and policy rosters.
   */
  public generateReport(
    result: ComplianceResult,
    policies: GovernancePolicy[],
    actor: string = 'Auditor'
  ): Record<string, any> {
    AuditLogger.log('REPORT_EXPORTED', actor, undefined, {
      format: 'JSON_OBJECT',
      complianceScore: result.complianceScore,
      violationsCount: result.violations.length,
    });

    return {
      metadata: {
        generatedAt: Date.now(),
        generatedBy: actor,
        nexusVersion: '1.0.0',
        systemStatus: result.complianceScore >= 80 ? 'COMPLIANT' : 'NON_COMPLIANT',
      },
      summary: {
        complianceScore: result.complianceScore,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        totalPoliciesCount: policies.length,
        activePoliciesCount: result.passedPoliciesCount + result.failedPoliciesCount,
        passedPoliciesCount: result.passedPoliciesCount,
        failedPoliciesCount: result.failedPoliciesCount,
        pendingPoliciesCount: result.pendingPolicies.length,
        violationsCount: result.violations.length,
      },
      activeViolations: result.violations.map((v) => ({
        policyId: v.policyId,
        policyName: v.policyName,
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        action: v.action,
        severity: v.severity,
        scope: v.scope,
        message: v.message,
        timestamp: new Date(v.timestamp).toISOString(),
        details: {
          field: v.condition.field,
          operator: v.condition.operator,
          expected: v.condition.expected,
          actual: v.condition.actual,
        },
      })),
      policyRoster: policies.map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        status: p.status,
        approvalState: p.approvalState,
        rulesCount: p.rules.length,
        priority: p.priority,
      })),
    };
  }

  /**
   * Serializes a report into a JSON file content string
   */
  public exportToJson(result: ComplianceResult, policies: GovernancePolicy[], actor: string = 'Auditor'): string {
    const report = this.generateReport(result, policies, actor);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Exports policies and violations into flat CSV text formats
   */
  public exportToCsv(result: ComplianceResult, policies: GovernancePolicy[], actor: string = 'Auditor'): { policiesCsv: string; violationsCsv: string } {
    AuditLogger.log('REPORT_EXPORTED', actor, undefined, {
      format: 'CSV',
      complianceScore: result.complianceScore,
    });

    // 1. Generate Policies CSV
    const policyHeaders = ['Policy ID', 'Name', 'Version', 'Status', 'Approval State', 'Priority', 'Rules Count'];
    const policyRows = policies.map((p) => [
      p.id,
      this.escapeCsvCell(p.name),
      p.version,
      p.status,
      p.approvalState,
      p.priority,
      p.rules.length,
    ]);

    const policiesCsv = [
      policyHeaders.join(','),
      ...policyRows.map((row) => row.join(',')),
    ].join('\n');

    // 2. Generate Violations CSV
    const violationHeaders = ['Timestamp', 'Policy ID', 'Policy Name', 'Rule ID', 'Rule Name', 'Severity', 'Scope', 'Action', 'Field', 'Operator', 'Expected', 'Actual', 'Message'];
    const violationRows = result.violations.map((v) => [
      new Date(v.timestamp).toISOString(),
      v.policyId,
      this.escapeCsvCell(v.policyName),
      v.ruleId,
      this.escapeCsvCell(v.ruleName),
      v.severity,
      v.scope,
      v.action,
      v.condition.field || '',
      v.condition.operator,
      this.escapeCsvCell(JSON.stringify(v.condition.expected)),
      this.escapeCsvCell(JSON.stringify(v.condition.actual)),
      this.escapeCsvCell(v.message),
    ]);

    const violationsCsv = [
      violationHeaders.join(','),
      ...violationRows.map((row) => row.join(',')),
    ].join('\n');

    return { policiesCsv, violationsCsv };
  }

  /**
   * Helper to escape special characters for CSV cells
   */
  private escapeCsvCell(val: any): string {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
