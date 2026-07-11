import { SovereignPersona } from '../../sovereign-persona/SovereignPersona';
import { GovernanceEngine } from '../GovernanceEngine';
import { GovernancePolicy } from '../models/GovernancePolicy';
import { PolicyViolation } from '../models/PolicyViolation';
import { AuditLogger } from '../AuditLogger';
import { SafeJson } from '../utils/SafeJson';
import { UnauthorizedError, ValidationError } from '../utils/Errors';

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

export class GovernanceTestSuite {
  public static async runTests(persona?: SovereignPersona): Promise<SuiteResults> {
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

    // Save previous storage values to restore after test run
    const prevPolicies = localStorage.getItem('nexus_governance_policies');
    const prevVersions = localStorage.getItem('nexus_governance_policy_versions');
    const prevLogs = localStorage.getItem('nexus_governance_audit_logs');

    // Reset storage for clean test run
    localStorage.removeItem('nexus_governance_policies');
    localStorage.removeItem('nexus_governance_policy_versions');
    localStorage.removeItem('nexus_governance_audit_logs');

    const engine = new GovernanceEngine();
    const manager = engine.getManager();
    const simulator = engine.getSimulator();
    const reporter = engine.getReporter();

    const mockPolicyData: Omit<GovernancePolicy, 'createdAt' | 'updatedAt' | 'version'> = {
      id: 'test-policy-1',
      name: 'Test Policy 1',
      description: 'A test policy for verifying evaluations.',
      status: 'inactive',
      approvalState: 'draft',
      priority: 'high',
      tags: ['test'],
      createdBy: 'Admin',
      updatedBy: 'Admin',
      rules: [
        {
          id: 'test-rule-1',
          name: 'Test Rule 1',
          action: 'DENY',
          scope: 'carbon.*',
          condition: {
            operator: 'GREATER_THAN',
            field: 'carbon.emissions',
            value: 10,
          },
          severity: 'high',
        },
      ],
    };

    // ==========================================
    // 1. POLICY CRUD TESTS
    // ==========================================
    await runTest('Policy CRUD', 'creates a policy with v1.0.0 and draft status', () => {
      const p = manager.createPolicy(mockPolicyData, 'Admin');
      if (p.version !== '1.0.0') throw new Error('Expected initial version to be 1.0.0');
      if (p.approvalState !== 'draft') throw new Error('Expected initial approvalState to be draft');
      if (p.status !== 'inactive') throw new Error('Expected status to be inactive');

      const retrieved = manager.getPolicyById('test-policy-1', 'Admin');
      if (!retrieved || retrieved.name !== 'Test Policy 1') {
        throw new Error('Failed to retrieve created policy.');
      }
    });

    await runTest('Policy CRUD', 'updates a policy fields and bumps version number', () => {
      const updated = manager.updatePolicy(
        'test-policy-1',
        { description: 'Updated test description.' },
        'Admin',
        'Changed description'
      );
      if (updated.version !== '1.0.1') throw new Error(`Expected bumped version 1.0.1, got ${updated.version}`);
      if (updated.description !== 'Updated test description.') throw new Error('Update payload failed to apply.');

      const versions = manager.getVersions('test-policy-1');
      if (versions.length !== 2) {
        throw new Error(`Expected 2 historical versions (initial + post-update), found ${versions.length}`);
      }
    });

    // ==========================================
    // 2. APPROVAL WORKFLOW & STATUS TOGGLE TESTS
    // ==========================================
    await runTest('Policy Workflow', 'prevents activating unapproved policies', () => {
      try {
        manager.setStatus('test-policy-1', 'active', 'Admin');
        throw new Error('Should have failed to activate draft policy.');
      } catch (err: any) {
        if (!err.message.includes('without explicit approval')) {
          throw new Error(`Unexpected error message: ${err.message}`);
        }
      }
    });

    await runTest('Policy Workflow', 'transitions approval state and allows activation', () => {
      const approved = manager.transitionApprovalState('test-policy-1', 'approved', 'Admin');
      if (approved.approvalState !== 'approved') throw new Error('Failed to approve policy.');

      const activated = manager.setStatus('test-policy-1', 'active', 'Admin');
      if (activated.status !== 'active') throw new Error('Failed to activate approved policy.');
    });

    // ==========================================
    // 3. RULE EVALUATION ENGINE TESTS
    // ==========================================
    await runTest('Rule Engine', 'evaluates GREATER_THAN conditions correctly', () => {
      const contextCompliant = { scope: 'carbon.emissions', carbon: { emissions: 5 } };
      const contextViolated = { scope: 'carbon.emissions', carbon: { emissions: 15 } };

      const pol = manager.getPolicyById('test-policy-1', 'Admin')!;
      const resultsComp = engine.evaluateSystemState(persona, 'Admin'); 

      // Temporary override evaluation with dummy context
      const evaluator = (engine as any).complianceEngine.evaluator;
      const violationsComp = evaluator.evaluate(pol, contextCompliant);
      if (violationsComp.length > 0) throw new Error('Expected no violations for compliant context.');

      const violationsViolated = evaluator.evaluate(pol, contextViolated);
      if (violationsViolated.length === 0) throw new Error('Expected a violation for exceeded emissions.');
      if (violationsViolated[0].action !== 'DENY') throw new Error('Expected action DENY.');
    });

    await runTest('Rule Engine', 'evaluates nested logical group AND / OR conditions', () => {
      const testPolicyAndOr: Omit<GovernancePolicy, 'createdAt' | 'updatedAt' | 'version'> = {
        id: 'policy-nested-test',
        name: 'Nested Condition Test',
        description: 'Verifies AND/OR logic.',
        status: 'active',
        approvalState: 'approved',
        priority: 'medium',
        tags: ['test'],
        createdBy: 'Admin',
        updatedBy: 'Admin',
        rules: [
          {
            id: 'rule-nested-1',
            name: 'Nested Rule',
            action: 'WARN',
            scope: 'system.all',
            severity: 'medium',
            condition: {
              operator: 'AND',
              conditions: [
                {
                  operator: 'GREATER_THAN',
                  field: 'system.cpu',
                  value: 80,
                },
                {
                  operator: 'OR',
                  conditions: [
                    {
                      operator: 'EQUALS',
                      field: 'system.mode',
                      value: 'danger',
                    },
                    {
                      operator: 'LESS_THAN',
                      field: 'system.battery',
                      value: 15,
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const pol = manager.createPolicy(testPolicyAndOr, 'Admin');
      const evaluator = (engine as any).complianceEngine.evaluator;

      // 1. CPU <= 80 (Should not warn)
      const res1 = evaluator.evaluate(pol, { scope: 'system.all', system: { cpu: 50, mode: 'danger', battery: 5 } });
      if (res1.length > 0) throw new Error('Nested AND failed to restrict triggers.');

      // 2. CPU > 80 AND mode is danger (Should warn)
      const res2 = evaluator.evaluate(pol, { scope: 'system.all', system: { cpu: 85, mode: 'danger', battery: 50 } });
      if (res2.length === 0) throw new Error('Nested AND/OR failed to trigger violation.');

      // 3. CPU > 80 AND battery < 15 (Should warn)
      const res3 = evaluator.evaluate(pol, { scope: 'system.all', system: { cpu: 85, mode: 'normal', battery: 10 } });
      if (res3.length === 0) throw new Error('Nested AND/OR battery sub-trigger failed.');

      // Clean up
      manager.deletePolicy('policy-nested-test', 'Admin');
    });

    // ==========================================
    // 4. COMPLIANCE ENGINE & SCORING TESTS
    // ==========================================
    await runTest('Compliance Engine', 'calculates exact compliance scores and risk grades', () => {
      const activePolicies = manager.getPolicies('Admin').filter((p) => p.status === 'active');
      const context = {
        scope: 'carbon.emissions',
        carbon: { emissions: 20 }, // Triggers the test-policy-1 violation (GREATER_THAN 10)
      };

      const complianceResult = engine.evaluateSystemState(persona, 'Admin');
      if (complianceResult.complianceScore !== 0) {
        throw new Error(`Expected compliance score 0% since only active policy is failing, got ${complianceResult.complianceScore}%`);
      }
      if (complianceResult.riskScore <= 0) {
        throw new Error('Risk score should be elevated above 0 on failure.');
      }
      if (complianceResult.violations.length === 0) {
        throw new Error('Violations count should be recorded in compliance report.');
      }
    });

    // ==========================================
    // 5. VERSION ROLLBACK TESTS
    // ==========================================
    await runTest('Policy Rollback', 'executes version rollback and restores state properties', () => {
      // Current active policy details
      const beforeRollback = manager.getPolicyById('test-policy-1', 'Admin')!;
      const currentVersion = beforeRollback.version;

      // Rollback to v1.0.0 snapshot
      const rolledBack = manager.rollbackPolicy('test-policy-1', '1.0.0', 'Admin');
      
      if (rolledBack.description !== 'A test policy for verifying evaluations.') {
        throw new Error('Rollback failed to restore v1.0.0 description content.');
      }
      if (rolledBack.version === '1.0.0' || rolledBack.version === currentVersion) {
        throw new Error(`Rollback should bump version to next serial increment. Version is: ${rolledBack.version}`);
      }
      if (!rolledBack.rollbackMetadata) {
        throw new Error('Rollback metadata checklist was not appended.');
      }
    });

    // ==========================================
    // 6. SIMULATION ENGINE TESTS
    // ==========================================
    await runTest('Simulator', 'previews compliance impact and checks safety parameters', () => {
      const currentPolicies = manager.getPolicies('Admin');
      
      // Simulate modifying rules to allow higher emissions
      const simulatedPolicies = currentPolicies.map((p) => {
        if (p.id === 'test-policy-1') {
          const clone = JSON.parse(JSON.stringify(p)) as GovernancePolicy;
          clone.rules[0].condition.value = 50; // bump check limit to 50
          return clone;
        }
        return p;
      });

      const simulationCtx = { scope: 'carbon.emissions', carbon: { emissions: 15 } };
      const report = simulator.simulate(currentPolicies, simulatedPolicies, simulationCtx, 'Developer');

      if (report.originalViolationsCount !== 1) {
        throw new Error(`Original state should show 1 violation, got ${report.originalViolationsCount}`);
      }
      if (report.simulatedViolationsCount !== 0) {
        throw new Error(`Simulated state should show 0 violations, got ${report.simulatedViolationsCount}`);
      }
      if (report.simulatedComplianceScore !== 100) {
        throw new Error(`Expected simulated compliance to be 100%, found ${report.simulatedComplianceScore}%`);
      }
      if (!report.rollbackSafetyPassed) {
        throw new Error('Simulation safety checks failed incorrectly.');
      }
    });

    // ==========================================
    // 7. SECURITY & ROLE VALIDATION TESTS
    // ==========================================
    await runTest('Security Check', 'enforces RBAC permissions and blocks mutations', () => {
      try {
        manager.createPolicy({ ...mockPolicyData, id: 'unauthorized-policy' }, 'Read Only');
        throw new Error('Should have failed to create policy under Read Only role.');
      } catch (err: any) {
        if (!(err instanceof UnauthorizedError)) {
          throw new Error('Expected UnauthorizedError to be thrown.');
        }
      }
    });

    await runTest('Security Check', 'prevents prototype pollution object merging', () => {
      const maliciousPayload = '{"id":"pollute","__proto__":{"polluted":true}}';
      try {
        const parsedObj = SafeJson.parse(maliciousPayload);
        if (parsedObj.polluted || ({} as any).polluted) {
          throw new Error('Prototype was polluted by unsafe parsing.');
        }

        const base = {};
        const source = SafeJson.parse('{"__proto__":{"polluted":true}}');
        SafeJson.secureMerge(base, source);
        if (({} as any).polluted) {
          throw new Error('Prototype was polluted by unsafe merging.');
        }
      } catch (e: any) {
        if (!e.message.includes('Unsafe or malformed JSON parsing blocked')) {
          throw new Error(`Unexpected error message during pollution parse: ${e.message}`);
        }
      }
    });

    // ==========================================
    // 8. AUDIT TRAILS & HASH INTEGRITY
    // ==========================================
    await runTest('Audit Trail', 'creates hash chain links and validates tampering', () => {
      const logs = AuditLogger.getLogs();
      if (logs.length === 0) {
        throw new Error('Audit log chain is empty.');
      }

      const verifyReport = AuditLogger.verifyIntegrity();
      if (!verifyReport.verified) {
        throw new Error(`Chain integrity verify failed: ${verifyReport.message}`);
      }

      // Tamper with logs in storage
      logs[0].actor = 'Malicious Actor';
      localStorage.setItem('nexus_governance_audit_logs', JSON.stringify(logs));

      const verifyTamper = AuditLogger.verifyIntegrity();
      if (verifyTamper.verified) {
        throw new Error('Chain integrity validation failed to detect tampering of audit cells.');
      }
    });

    // ==========================================
    // 9. EXPORTS VALIDATIONS
    // ==========================================
    await runTest('Reports Export', 'exports valid CSV headers and JSON reports', () => {
      // Re-enable clean logs for verify
      localStorage.removeItem('nexus_governance_audit_logs');
      AuditLogger.log('POLICY_CREATED', 'Admin', 'test', {});

      const result = engine.evaluateSystemState(persona, 'Admin');
      const policies = manager.getPolicies('Admin');

      const jsonStr = reporter.exportToJson(result, policies, 'Auditor');
      const parsed = JSON.parse(jsonStr);
      if (!parsed.summary || parsed.summary.complianceScore === undefined) {
        throw new Error('JSON export is missing summary or scores.');
      }

      const csvData = reporter.exportToCsv(result, policies, 'Auditor');
      if (!csvData.policiesCsv.includes('Policy ID,Name,Version')) {
        throw new Error('CSV policies export headers mismatch.');
      }
      if (!csvData.violationsCsv.includes('Timestamp,Policy ID')) {
        throw new Error('CSV violations export headers mismatch.');
      }
    });

    // Clean up test runs and restore previous storage state
    if (prevPolicies) localStorage.setItem('nexus_governance_policies', prevPolicies);
    else localStorage.removeItem('nexus_governance_policies');

    if (prevVersions) localStorage.setItem('nexus_governance_policy_versions', prevVersions);
    else localStorage.removeItem('nexus_governance_policy_versions');

    if (prevLogs) localStorage.setItem('nexus_governance_audit_logs', prevLogs);
    else localStorage.removeItem('nexus_governance_audit_logs');

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
