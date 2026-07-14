export type MetricSeverity = 'info' | 'warning' | 'critical';

export interface MetricRecord {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  dataPoints: Array<{ timestamp: number; value: number }>;
}

export type HealthStatus = 'Healthy' | 'Warning' | 'Critical' | 'Offline';

export interface SubsystemHealth {
  status: HealthStatus;
  lastUpdate: number;
  responseTime: number;
  errorRate: number;
  availability: number;
}

export interface SystemMetrics {
  cpuLoadPercent: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
  eventLoopDelayMs: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  throughputRps: number;
  successRate: number;
  failedCount: number;
  successCount: number;
  concurrentRequests: number;
  timestamp: number;
}

export interface ResourceMetrics {
  activeUsers: number;
  activeAgents: number;
  storageSizeBytes: number;
  networkBytesSent: number;
  networkBytesReceived: number;
  timestamp: number;
}

export interface CarbonMetrics {
  totalEmissionsKg: number;
  computationEmissionsKg: number;
  networkEmissionsKg: number;
  energySavingsPercent: number;
  renewableEnergyPercent: number;
  carbonBudgetUsedPercent: number;
  timestamp: number;
}

export interface ThreatMetrics {
  activeThreatCount: number;
  threatsDetectedTotal: number;
  threatsNeutralizedTotal: number;
  falsePositivesTotal: number;
  averageResponseTimeMs: number;
  securityState: 'healthy' | 'degraded' | 'compromised' | 'recovering';
  timestamp: number;
}

export interface FederatedMetrics {
  participationRounds: number;
  modelConvergenceRate: number;
  secureAggregationSuccesses: number;
  localUpdatesSubmitted: number;
  averageRoundDurationMs: number;
  timestamp: number;
}

export interface PrivacyMetrics {
  negotiationCount: number;
  mpcProtocolsUsed: number;
  zkpProtocolsUsed: number;
  privacyBudgetUsedPercent: number;
  averageTrustScore: number;
  timestamp: number;
}

export interface AlertRule {
  id: string;
  metricName: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: MetricSeverity;
  description: string;
  durationMs?: number; // How long metric must breach threshold before triggering
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  metricName: string;
  value: number;
  severity: MetricSeverity;
  message: string;
  timestamp: number;
  resolvedAt?: number;
}

export type TimeResolution = 'hour' | 'day' | 'week' | 'month';

export interface StorageAdapter {
  saveMetric(record: MetricRecord): Promise<void>;
  saveMetrics(records: MetricRecord[]): Promise<void>;
  getMetrics(name: string, startTime: number, endTime: number): Promise<MetricRecord[]>;
  saveHistory(resolution: TimeResolution, timestamp: number, snapshot: Record<string, any>): Promise<void>;
  getHistory(resolution: TimeResolution, startTime: number, endTime: number): Promise<Record<string, any>[]>;
  clearOldMetrics(beforeTimestamp: number): Promise<void>;
}
