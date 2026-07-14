export type GovernanceEventType =
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'POLICY_DELETED'
  | 'POLICY_ACTIVATED'
  | 'POLICY_DISABLED'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_COMPLETED'
  | 'VIOLATION_DETECTED'
  | 'ROLLBACK_EXECUTED'
  | 'REPORT_EXPORTED';

export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: GovernanceEventType;
  actor: string; // The role or user identifier (e.g., 'Admin', 'Security Officer')
  policyId?: string;
  details: Record<string, any>;
  hash: string; // Simulated SHA-256 hash of entry details + previous hash for integrity verification
}
