import { GovernanceEngine } from '../GovernanceEngine';
import { GovernancePolicy } from '../models/GovernancePolicy';

export class GovernanceService {
  private static instance: GovernanceService | null = null;
  private engine = new GovernanceEngine();

  private constructor() {
    this.seedDefaultPolicies();
  }

  public static getInstance(): GovernanceService {
    if (!this.instance) {
      this.instance = new GovernanceService();
    }
    return this.instance;
  }

  public getEngine(): GovernanceEngine {
    return this.engine;
  }

  /**
   * Seeds 4 default policies:
   * 1. Carbon footprint threshold
   * 2. Zero-leakage trust boundary
   * 3. Sovereign sharing validation
   * 4. Cognitive Graph density trigger
   */
  private seedDefaultPolicies(): void {
    const defaultPolicies: GovernancePolicy[] = [
      {
        id: 'policy-carbon-limit',
        name: 'Carbon Emission Threshold Control',
        description: 'Monitors and restricts computing carbon emissions. Warns at 4.0kg and Denies requests exceeding 4.8kg.',
        status: 'active',
        version: '1.0.0',
        createdBy: 'Admin',
        updatedBy: 'Admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvalState: 'approved',
        priority: 'high',
        tags: ['sustainability', 'carbon', 'performance'],
        rules: [
          {
            id: 'rule-carbon-warn',
            name: 'Carbon Limit Warning',
            action: 'WARN',
            scope: 'carbon.*',
            condition: {
              operator: 'GREATER_THAN',
              field: 'carbon.emissions',
              value: 4.0,
            },
            severity: 'medium',
          },
          {
            id: 'rule-carbon-deny',
            name: 'Carbon Limit Enforcement',
            action: 'DENY',
            scope: 'carbon.*',
            condition: {
              operator: 'GREATER_THAN',
              field: 'carbon.emissions',
              value: 4.8,
            },
            severity: 'high',
          },
        ],
      },
      {
        id: 'policy-zero-leakage',
        name: 'Zero-Leakage Privacy Guard',
        description: 'Enforces strict MPC and ZKP negotiations when collaborating with external agents showing low trust scores.',
        status: 'active',
        version: '1.0.0',
        createdBy: 'Admin',
        updatedBy: 'Admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvalState: 'approved',
        priority: 'critical',
        tags: ['security', 'privacy', 'cryptography'],
        rules: [
          {
            id: 'rule-trust-deny',
            name: 'Block Untrusted Negotiations',
            action: 'DENY',
            scope: 'privacy.*',
            condition: {
              operator: 'LESS_THAN',
              field: 'privacy.trustScore',
              value: 60.0, // Scale 0-100 (averageTrustScore is in percent for evaluation context)
            },
            severity: 'critical',
          },
          {
            id: 'rule-budget-warn',
            name: 'Privacy Budget Depletion Warning',
            action: 'WARN',
            scope: 'privacy.*',
            condition: {
              operator: 'GREATER_THAN',
              field: 'privacy.budgetUsed',
              value: 80.0,
            },
            severity: 'high',
          },
        ],
      },
      {
        id: 'policy-sovereign-consent',
        name: 'Sovereign Sharing Safety Rule',
        description: 'Requires manual approval if sovereign persona data is shared when sharing levels are set to public while ethical boundaries are active.',
        status: 'active',
        version: '1.0.0',
        createdBy: 'Admin',
        updatedBy: 'Admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvalState: 'approved',
        priority: 'high',
        tags: ['consent', 'persona'],
        rules: [
          {
            id: 'rule-require-approval-sharing',
            name: 'Sovereign Consent Validation Check',
            action: 'REQUIRE_APPROVAL',
            scope: 'persona.*',
            condition: {
              operator: 'AND',
              conditions: [
                {
                  operator: 'EQUALS',
                  field: 'persona.sharingLevel',
                  value: 'public',
                },
                {
                  operator: 'GREATER_THAN',
                  field: 'persona.ethicalBoundariesCount',
                  value: 0,
                },
              ],
            },
            severity: 'high',
          },
        ],
      },
      {
        id: 'policy-graph-scale',
        name: 'Cognitive Graph Density Optimization',
        description: 'Performs self-optimization of local databases. Triggers MorphNet model compression if local knowledge graph node count exceeds 25.',
        status: 'active',
        version: '1.0.0',
        createdBy: 'Admin',
        updatedBy: 'Admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvalState: 'approved',
        priority: 'medium',
        tags: ['database', 'optimization', 'morphnet'],
        rules: [
          {
            id: 'rule-trigger-compression',
            name: 'Active Density Optimization Trigger',
            action: 'CUSTOM_ACTION',
            customActionName: 'Trigger MorphNet Compression',
            scope: 'graph.*',
            condition: {
              operator: 'GREATER_THAN',
              field: 'graph.nodesCount',
              value: 25,
            },
            severity: 'medium',
          },
        ],
      },
    ];

    this.engine.getManager().seedDefaultPolicies(defaultPolicies);
  }
}
