import { RuleAction, SeverityLevel } from './GovernancePolicy';

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  ruleId: string;
  ruleName: string;
  action: RuleAction;
  severity: SeverityLevel;
  scope: string;
  condition: {
    field?: string;
    operator: string;
    expected?: any;
    actual?: any;
  };
  timestamp: number;
  message: string;
}
