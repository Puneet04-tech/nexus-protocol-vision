import { PolicyViolation } from './PolicyViolation';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceResult {
  complianceScore: number; // 0 to 100
  riskScore: number;       // 0 to 100
  riskLevel: RiskLevel;
  violationSummary: string;
  passedPoliciesCount: number;
  failedPoliciesCount: number;
  passedPolicies: string[];  // Policy IDs
  failedPolicies: string[];  // Policy IDs
  pendingPolicies: string[]; // Policy IDs
  violations: PolicyViolation[];
  recommendations: string[];
  timestamp: number;
}
