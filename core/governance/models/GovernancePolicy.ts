/**
 * Governance Policy Model Definitions
 */

export type RuleAction =
  | 'ALLOW'
  | 'DENY'
  | 'WARN'
  | 'AUDIT'
  | 'REQUIRE_APPROVAL'
  | 'CUSTOM_ACTION';

export type PolicyStatus = 'active' | 'inactive';

export type ApprovalState = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ConditionOperator =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'CONTAINS'
  | 'IN';

export interface PolicyCondition {
  operator: ConditionOperator;
  field?: string; // Dot-separated path in evaluation context, e.g. "carbon.emissions"
  value?: any;    // Expected value or comparison value
  conditions?: PolicyCondition[]; // Recursive conditions for group operators (AND, OR, NOT)
}

export interface PolicyRule {
  id: string;
  name: string;
  action: RuleAction;
  customActionName?: string;
  scope: string; // The subsystem or event path, e.g. "persona.*", "privacy.*", "carbon.*"
  condition: PolicyCondition;
  severity: SeverityLevel;
}

export interface RollbackMetadata {
  rolledBackFromVersion: string;
  rolledBackAt: number;
  rolledBackBy: string;
  comment?: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  version: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  expiration?: number;
  approvalState: ApprovalState;
  priority: PriorityLevel;
  tags: string[];
  rules: PolicyRule[];
  rollbackMetadata?: RollbackMetadata;
}
