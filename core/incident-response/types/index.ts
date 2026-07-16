export type IncidentStatus = 'active' | 'investigating' | 'recovering' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecoveryStatus = 'pending' | 'running' | 'completed' | 'failed';
export type CheckpointType = 'auto' | 'manual';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'alert' | 'recovery_started' | 'recovery_step' | 'recovery_completed' | 'recovery_failed' | 'resolved';
  operator?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  component: string;
  rootCause: string;
  detectedAt: number;
  resolvedAt?: number;
  timeline: TimelineEvent[];
  checkpointId?: string;
  recoveryStepsTaken: string[];
  logs: string[];
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  type: CheckpointType;
  componentId: string;
  workflowState: string; // Serialized workflow state
  contextSnapshot: Record<string, any>;
  signature: string; // Cryptographic-like integrity checksum
}

export interface RecoveryJob {
  id: string;
  incidentId: string;
  priority: number; // Higher is processed first
  status: RecoveryStatus;
  retryCount: number;
  maxRetries: number;
  steps: string[];
  currentStepIndex: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface AlertRule {
  id: string;
  metricName: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: IncidentSeverity;
  description: string;
  enabled: boolean;
}

export interface IncidentAlert {
  id: string;
  ruleId: string;
  metricName: string;
  value: number;
  severity: IncidentSeverity;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: number;
}

export interface SreAnalytics {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  recoverySuccessRate: number; // percentage (0-100)
  meanTimeToRecoveryMs: number; // MTTR
  meanTimeBetweenFailuresMs: number; // MTBF
  systemAvailabilityPercent: number; // Availability SLA (e.g. 99.98)
  failuresByType: Record<string, number>;
  failuresBySeverity: Record<string, number>;
  trendTimeline: Array<{ timestamp: number; count: number }>;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  operator: string;
  action: string;
  details: string;
  success: boolean;
  ipAddress?: string;
}
