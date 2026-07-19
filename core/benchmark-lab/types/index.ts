export type BenchmarkSubjectType = 'model' | 'agent' | 'workflow' | 'prompt';

export interface BenchmarkConfig {
  id: string;
  name: string;
  description: string;
  subjectType: BenchmarkSubjectType;
  subjectId: string; // e.g. "gemini-2.5-flash", "agent-007", "workflow-123"
  subjectVersion: string;
  datasetId: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  metrics: string[]; // e.g. ["accuracy", "f1", "precision", "recall", "latency", "throughput", "cost"]
  safetyEvaluations: string[]; // e.g. ["hallucination", "safety", "bias", "robustness", "consistency"]
  scheduledCron?: string; // cron expression if scheduled
  batchSize: number;
  createdAt: number;
  updatedAt: number;
}

export interface DatasetItem {
  id: string;
  input: string;
  expectedOutput?: string;
  category?: string;
  tags?: string[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  version: string;
  items: DatasetItem[];
  metadata: Record<string, any>;
  isPredefined: boolean;
  isCustom: boolean;
  isValid: boolean;
  createdAt: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface BenchmarkRunResult {
  id: string;
  datasetItemId: string;
  input: string;
  expectedOutput?: string;
  actualOutput: string;
  latencyMs: number;
  tokensUsed: TokenUsage;
  memoryUsageMb: number;
  costEstimate: number;
  scores: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    throughput?: number; // tokens/sec
    [key: string]: number | undefined;
  };
  safety: {
    hallucinationDetected: boolean;
    consistencyScore: number; // 0-100
    safetyViolation: boolean;
    biasDetected: boolean;
    explainabilityScore: number; // 0-100
    promptStabilityScore: number; // 0-100
    determinismScore: number; // 0-100
    failureAnalysis?: string; // details on what failed if applicable
  };
}

export interface BenchmarkMetricsSummary {
  avgLatencyMs: number;
  avgThroughput: number;
  totalTokens: number;
  totalCost: number;
  avgAccuracy?: number;
  avgPrecision?: number;
  avgRecall?: number;
  avgF1?: number;
  hallucinationRate: number; // percentage (0-100)
  safetyViolationRate: number; // percentage (0-100)
  avgConsistency: number; // 0-100
  avgBiasDetectedRate: number; // percentage (0-100)
  avgRobustness: number; // 0-100
}

export type BenchmarkRunStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface BenchmarkRun {
  id: string;
  configId: string;
  configName: string;
  status: BenchmarkRunStatus;
  progress: number; // 0 to 100
  currentItemIndex: number;
  totalItems: number;
  results: BenchmarkRunResult[];
  metricsSummary: BenchmarkMetricsSummary;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  subjectId: string;
  subjectName: string;
  subjectType: BenchmarkSubjectType;
  version: string;
  score: number; // overall combined weighted score (0-100)
  accuracy: number;
  f1Score: number;
  avgLatencyMs: number;
  safetyScore: number;
  costPer1kTokens: number;
  totalRunsEvaluated: number;
}

export interface ComparisonMatrix {
  subjectIds: string[];
  metrics: string[];
  runs: BenchmarkRun[];
  leaderboard: LeaderboardEntry[];
  regressionWarnings: {
    subjectId: string;
    metric: string;
    previousValue: number;
    currentValue: number;
    percentDrop: number;
    severity: 'warning' | 'critical';
  }[];
}

export interface TrendDataPoint {
  timestamp: number;
  runId: string;
  accuracy: number;
  f1: number;
  latencyMs: number;
  safetyScore: number;
  cost: number;
}
