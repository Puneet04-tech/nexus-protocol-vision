// Types for AI Cost & Resource Optimization Center

export interface ModelPricing {
  modelName: string;
  provider: string;
  inputTokenCostPerK: number; // USD
  outputTokenCostPerK: number; // USD
  baseExecutionCost?: number; // USD flat rate per call
}

export interface ModelUsageRecord {
  timestamp: number;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  calculatedCost: number;
  agentId?: string;
  workflowId?: string;
  userId: string;
}

export interface ResourceMetrics {
  timestamp: number;
  cpuUtilization: number;     // Percentage (0-100)
  memoryUsageMb: number;      // MB
  gpuUtilization: number;     // Percentage (0-100)
  diskUsageGb: number;        // GB
  storageUsageBytes: number;  // LocalStorage/DB bytes
  networkBandwidthKbps: number;
  concurrentExecutions: number;
  executionDurationMs: number;
  energyConsumptionKwh: number;
}

export type BudgetType = 'daily' | 'weekly' | 'monthly' | 'project' | 'team' | 'department';

export interface Budget {
  id: string;
  name: string;
  type: BudgetType;
  limit: number;              // USD
  currentSpent: number;       // USD
  startDate: number;          // Timestamp
  endDate: number;            // Timestamp
  ownerId: string;
  targetId?: string;          // Project ID, Team ID, or Department Name
  alertThresholds: number[];  // E.g., [0.5, 0.8, 1.0] (50%, 80%, 100%)
  notificationsSent: Record<number, boolean>;
  createdAt: number;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'model_selection' | 'idle_resource' | 'caching' | 'batching' | 'workload_scaling' | 'inference';
  title: string;
  description: string;
  potentialSavingsUsd: number;
  impactLevel: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'moderate' | 'hard';
  targetComponent: string;     // Model, Agent, or Node ID
  applied: boolean;
  timestamp: number;
  actionDetails: Record<string, string | number | boolean>;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  metricType: 'cost' | 'cpu' | 'memory' | 'gpu' | 'budget_breach' | 'concurrency';
  thresholdValue: number;
  durationMinutes: number;
  severity: AlertSeverity;
  enabled: boolean;
  targetId?: string;          // Budget ID, Model Name, or Agent ID
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  value: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface CostForecast {
  targetDate: number;
  projectedCost: number;
  confidenceLowerBound: number;
  confidenceUpperBound: number;
  trend: 'stable' | 'upward' | 'downward';
}

export interface CostReportSummary {
  reportId: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  totalCostUsd: number;
  averageCpuPercent: number;
  averageGpuPercent: number;
  carbonEmissionsSavedKg: number;
  activeBudgetsCount: number;
  triggeredAlertsCount: number;
  appliedOptimizationsCount: number;
}

export interface ScheduledJob {
  id: string;
  name: string;
  targetModel: string;
  estimatedCostUsd: number;
  carbonPriority: 'low' | 'medium' | 'high';
  scheduledTime: number;      // Target timestamp
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  userId: string;
}

export interface CostAuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  details: string;
  success: boolean;
}
