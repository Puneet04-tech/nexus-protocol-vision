export interface PolicyVersion {
  policyId: string;
  version: string;
  policyData: string; // Serialized GovernancePolicy (excluding some meta if needed, but complete snapshot)
  timestamp: number;
  updatedBy: string;
  changeSummary?: string;
}
